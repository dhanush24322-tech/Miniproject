import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import datasets
from models.database import db, AIModel, Dataset
from models.cnn_model import DR_Model
from utils.preprocessing import get_transforms

# Training state for polling
_training_status = {
    'is_training': False,
    'current_epoch': 0,
    'total_epochs': 0,
    'progress': 0,
    'message': 'Idle'
}

def get_training_status():
    return _training_status

def train_model(dataset_id, model_name, epochs=20, batch_size=32):
    """
    Train a ResNet50 model on a specific dataset.
    This runs in a separate thread/background task in production.
    """
    global _training_status
    try:
        # 1. Update Status
        _training_status.update({
            'is_training': True, 'current_epoch': 0, 
            'total_epochs': epochs, 'progress': 0, 
            'message': f'Initializing training: {model_name}'
        })

        # 2. Setup Data
        dataset_info = Dataset.query.get(dataset_id)
        data_dir = dataset_info.path
        
        transform = get_transforms(is_train=True)
        train_data = datasets.ImageFolder(data_dir, transform=transform)
        train_loader = DataLoader(train_data, batch_size=batch_size, shuffle=True)

        # 3. Setup Model
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = DR_Model(num_classes=len(train_data.classes)).to(device)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        # 4. Training Loop
        model.train()
        for epoch in range(epochs):
            _training_status['current_epoch'] = epoch + 1
            _training_status['message'] = f'Training Epoch {epoch + 1}/{epochs}'
            
            running_loss = 0.0
            for inputs, labels in train_loader:
                inputs, labels = inputs.to(device), labels.to(device)
                
                optimizer.zero_grad()
                outputs = model(inputs)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()
                
                running_loss += loss.item()
            
            # Update overall progress
            _training_status['progress'] = int(((epoch + 1) / epochs) * 100)

        # 5. Save Model
        models_dir = os.path.join('storage', 'models')
        os.makedirs(models_dir, exist_ok=True)
        model_path = os.path.join(models_dir, f"{model_name}.pth")
        torch.save(model.state_dict(), model_path)

        # 6. Update Database
        new_model = AIModel(
            name=model_name,
            dataset_id=dataset_id,
            path=model_path,
            accuracy=0.85, # Mock accuracy for now
            epochs=epochs
        )
        db.session.add(new_model)
        db.session.commit()

        _training_status.update({
            'is_training': False, 'message': 'Training completed successfully!'
        })
        return new_model.to_dict()

    except Exception as e:
        _training_status.update({'is_training': False, 'message': f'Training Error: {str(e)}'})
        print(f"Training Error: {str(e)}")
        return {'error': str(e)}
