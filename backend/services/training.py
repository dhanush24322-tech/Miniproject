"""
Model training service.
Handles the full training pipeline: data loading, training loop, validation, and saving.
Runs in a background thread so the API remains responsive.
"""
import os
import json
import time
import threading
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split

from models.cnn_model import DRClassifier
from utils.preprocessing import RetinalDataset, get_train_transforms, get_val_transforms
from config import Config

# Global training state (for polling progress)
training_state = {
    'is_training': False,
    'progress': 0,
    'current_epoch': 0,
    'total_epochs': 0,
    'metrics': [],
    'status': 'idle',
    'message': '',
    'model_id': None,
}


def reset_training_state():
    """Reset the global training state."""
    training_state.update({
        'is_training': False,
        'progress': 0,
        'current_epoch': 0,
        'total_epochs': 0,
        'metrics': [],
        'status': 'idle',
        'message': '',
        'model_id': None,
    })


def get_training_status():
    """Return current training progress for the API."""
    return dict(training_state)


def start_training(app, dataset_id, model_name, epochs=None, batch_size=None, learning_rate=None):
    """
    Start model training in a background thread.
    Uses Flask app context to access the database.
    """
    if training_state['is_training']:
        return False, 'A training job is already running'

    epochs = epochs or Config.DEFAULT_EPOCHS
    batch_size = batch_size or Config.DEFAULT_BATCH_SIZE
    learning_rate = learning_rate or Config.DEFAULT_LEARNING_RATE

    # Start training in background thread
    thread = threading.Thread(
        target=_train_model,
        args=(app, dataset_id, model_name, epochs, batch_size, learning_rate),
        daemon=True,
    )
    thread.start()
    return True, 'Training started'


def _train_model(app, dataset_id, model_name, epochs, batch_size, learning_rate):
    """Internal training loop (runs in background thread)."""
    with app.app_context():
        from models.database import db, Dataset, TrainedModel

        try:
            training_state['is_training'] = True
            training_state['status'] = 'initializing'
            training_state['total_epochs'] = epochs
            training_state['message'] = 'Loading dataset...'

            # Fetch dataset from DB
            dataset = Dataset.query.get(dataset_id)
            if not dataset:
                training_state['status'] = 'failed'
                training_state['message'] = 'Dataset not found'
                training_state['is_training'] = False
                return

            # Load images
            train_transforms = get_train_transforms(Config.IMAGE_SIZE)
            val_transforms = get_val_transforms(Config.IMAGE_SIZE)

            full_dataset = RetinalDataset(dataset.path, transform=train_transforms)
            if len(full_dataset) == 0:
                training_state['status'] = 'failed'
                training_state['message'] = 'No valid images found in dataset'
                training_state['is_training'] = False
                return

            # Split into train/validation (80/20)
            total = len(full_dataset)
            val_size = max(1, int(total * 0.2))
            train_size = total - val_size
            train_dataset, val_dataset = random_split(full_dataset, [train_size, val_size])

            # Override validation transforms (no augmentation)
            val_dataset.dataset = RetinalDataset(dataset.path, transform=val_transforms)

            train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
            val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

            training_state['message'] = f'Dataset loaded: {total} images'

            # Setup device
            device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

            # Create model
            model = DRClassifier(num_classes=Config.NUM_CLASSES, pretrained=True)
            model.freeze_backbone()  # Freeze backbone initially
            model.to(device)

            # Loss and optimizer
            criterion = nn.CrossEntropyLoss()
            optimizer = optim.Adam(filter(lambda p: p.requires_grad, model.parameters()), lr=learning_rate)
            scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=max(1, epochs // 3), gamma=0.5)

            # Create model record in DB
            version = f"v{TrainedModel.query.filter_by(dataset_id=dataset_id).count() + 1}"
            model_path = os.path.join(Config.MODEL_FOLDER, f"{model_name}_{version}.pth")

            trained_model = TrainedModel(
                name=model_name,
                version=version,
                architecture='ResNet50',
                dataset_id=dataset_id,
                epochs=epochs,
                path=model_path,
                status='training',
            )
            db.session.add(trained_model)
            db.session.commit()
            training_state['model_id'] = trained_model.id

            # Unfreeze backbone after 30% of epochs for fine-tuning
            unfreeze_epoch = max(1, epochs // 3)

            # Training loop
            all_metrics = []
            best_val_acc = 0.0
            training_state['status'] = 'training'

            for epoch in range(epochs):
                training_state['current_epoch'] = epoch + 1
                training_state['progress'] = int(((epoch) / epochs) * 100)
                training_state['message'] = f'Epoch {epoch + 1}/{epochs}'

                # Unfreeze backbone for fine-tuning
                if epoch == unfreeze_epoch:
                    model.unfreeze_backbone()
                    optimizer = optim.Adam(model.parameters(), lr=learning_rate * 0.1)
                    training_state['message'] += ' (fine-tuning backbone)'

                # --- Train phase ---
                model.train()
                train_loss = 0.0
                train_correct = 0
                train_total = 0

                for batch_idx, (images, labels) in enumerate(train_loader):
                    images, labels = images.to(device), labels.to(device)

                    optimizer.zero_grad()
                    outputs = model(images)
                    loss = criterion(outputs, labels)
                    loss.backward()
                    optimizer.step()

                    train_loss += loss.item() * images.size(0)
                    _, predicted = outputs.max(1)
                    train_total += labels.size(0)
                    train_correct += predicted.eq(labels).sum().item()

                train_loss /= train_total
                train_acc = train_correct / train_total

                # --- Validation phase ---
                model.eval()
                val_loss = 0.0
                val_correct = 0
                val_total = 0

                with torch.no_grad():
                    for images, labels in val_loader:
                        images, labels = images.to(device), labels.to(device)
                        outputs = model(images)
                        loss = criterion(outputs, labels)

                        val_loss += loss.item() * images.size(0)
                        _, predicted = outputs.max(1)
                        val_total += labels.size(0)
                        val_correct += predicted.eq(labels).sum().item()

                val_loss /= max(val_total, 1)
                val_acc = val_correct / max(val_total, 1)

                scheduler.step()

                # Record metrics
                epoch_metrics = {
                    'epoch': epoch + 1,
                    'train_loss': round(train_loss, 4),
                    'train_accuracy': round(train_acc, 4),
                    'val_loss': round(val_loss, 4),
                    'val_accuracy': round(val_acc, 4),
                }
                all_metrics.append(epoch_metrics)
                training_state['metrics'] = all_metrics

                # Save best model
                if val_acc > best_val_acc:
                    best_val_acc = val_acc
                    torch.save(model.state_dict(), model_path)

            # Update model record in DB
            final_metrics = all_metrics[-1] if all_metrics else {}
            trained_model.accuracy = final_metrics.get('train_accuracy', 0)
            trained_model.loss = final_metrics.get('train_loss', 0)
            trained_model.val_accuracy = final_metrics.get('val_accuracy', 0)
            trained_model.val_loss = final_metrics.get('val_loss', 0)
            trained_model.training_metrics = json.dumps(all_metrics)
            trained_model.status = 'completed'
            db.session.commit()

            training_state['status'] = 'completed'
            training_state['progress'] = 100
            training_state['message'] = f'Training complete! Val Accuracy: {best_val_acc:.2%}'

        except Exception as e:
            training_state['status'] = 'failed'
            training_state['message'] = f'Training failed: {str(e)}'

            # Update model status in DB
            try:
                if training_state.get('model_id'):
                    trained_model = TrainedModel.query.get(training_state['model_id'])
                    if trained_model:
                        trained_model.status = 'failed'
                        db.session.commit()
            except Exception:
                pass

        finally:
            training_state['is_training'] = False
