"""
Organizer routes: dataset management, model training, and model versioning.
All routes require organizer role.
"""
import os
import json
import zipfile
import shutil
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required

from models.database import db, Dataset, TrainedModel
from utils.auth_helpers import role_required, get_current_user
from services.training import start_training, get_training_status, reset_training_state
from services.prediction import invalidate_cache
from config import Config

organizer_bp = Blueprint('organizer', __name__, url_prefix='/api/organizer')


# ─── Dashboard Stats ───────────────────────────────────────────────
@organizer_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
@role_required('organizer')
def dashboard_stats():
    """Get summary statistics for the organizer dashboard."""
    total_datasets = Dataset.query.count()
    total_models = TrainedModel.query.filter_by(status='completed').count()
    active_model = TrainedModel.query.filter_by(is_active=True).first()
    best_model = TrainedModel.query.filter_by(status='completed').order_by(
        TrainedModel.val_accuracy.desc()
    ).first()

    return jsonify({
        'total_datasets': total_datasets,
        'total_models': total_models,
        'active_model': active_model.to_dict() if active_model else None,
        'best_accuracy': round(best_model.val_accuracy * 100, 2) if best_model else 0,
        'training_status': get_training_status(),
    }), 200


# ─── Dataset Management ────────────────────────────────────────────
@organizer_bp.route('/datasets', methods=['GET'])
@jwt_required()
@role_required('organizer')
def list_datasets():
    """List all uploaded datasets."""
    datasets = Dataset.query.order_by(Dataset.created_at.desc()).all()
    return jsonify({'datasets': [d.to_dict() for d in datasets]}), 200


@organizer_bp.route('/datasets', methods=['POST'])
@jwt_required()
@role_required('organizer')
def upload_dataset():
    """
    Upload a dataset as a ZIP file.
    Expected ZIP structure:
        dataset.zip/
        ├── 0_No_DR/
        ├── 1_Mild/
        ├── 2_Moderate/
        ├── 3_Severe/
        └── 4_Proliferative_DR/
    """
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in Config.ALLOWED_ARCHIVE_EXTENSIONS:
        return jsonify({'error': 'Only ZIP files are allowed'}), 400

    name = request.form.get('name', file.filename.rsplit('.', 1)[0])
    description = request.form.get('description', '')

    user = get_current_user()

    # Create unique directory for this dataset
    dataset_id = uuid.uuid4().hex[:12]
    dataset_dir = os.path.join(Config.DATASET_FOLDER, dataset_id)
    os.makedirs(dataset_dir, exist_ok=True)

    try:
        # Save and extract ZIP
        zip_path = os.path.join(dataset_dir, 'dataset.zip')
        file.save(zip_path)

        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(dataset_dir)

        # Remove the ZIP after extraction
        os.remove(zip_path)

        # ── Robustly find the actual dataset root ──
        # Walk down through single-child directories and skip junk folders
        # until we find a directory that contains multiple subdirectories with images.
        JUNK_DIRS = {'__MACOSX', '.DS_Store', '__pycache__', '.git'}
        valid_extensions = {'.png', '.jpg', '.jpeg', '.tiff', '.bmp'}

        def find_dataset_root(start_dir):
            """Recursively descend into single-subfolder directories to find the real root."""
            while True:
                subdirs = [
                    d for d in os.listdir(start_dir)
                    if os.path.isdir(os.path.join(start_dir, d)) and d not in JUNK_DIRS
                ]
                if len(subdirs) == 1:
                    # Only one real subdirectory — go deeper
                    start_dir = os.path.join(start_dir, subdirs[0])
                else:
                    break
            return start_dir

        actual_root = find_dataset_root(dataset_dir)

        # Count images per class folder
        class_distribution = {}
        total_images = 0

        for subdir in os.listdir(actual_root):
            subdir_path = os.path.join(actual_root, subdir)
            if not os.path.isdir(subdir_path) or subdir in JUNK_DIRS:
                continue
            # Count images recursively (in case subfolders have subfolders)
            count = 0
            for root_walk, _, files in os.walk(subdir_path):
                count += sum(
                    1 for f in files
                    if os.path.splitext(f)[1].lower() in valid_extensions
                )
            if count > 0:
                class_distribution[subdir] = count
                total_images += count

        # Create database record
        dataset = Dataset(
            name=name,
            description=description,
            path=actual_root,
            num_images=total_images,
            class_distribution=json.dumps(class_distribution),
            uploaded_by=user.id,
            status='ready' if total_images > 0 else 'error',
        )
        db.session.add(dataset)
        db.session.commit()

        # --- Automatic Training Trigger ---
        auto_started = False
        auto_message = ""
        if dataset.status == 'ready':
            # Use system defaults for automated training
            model_name = f"Auto_Model_{name.replace(' ', '_')}"
            success, msg = start_training(
                current_app._get_current_object(),
                dataset.id,
                model_name,
                Config.DEFAULT_EPOCHS,
                Config.DEFAULT_BATCH_SIZE,
                Config.DEFAULT_LEARNING_RATE
            )
            auto_started = success
            auto_message = msg

        return jsonify({
            'message': f'Dataset uploaded: {total_images} images found',
            'dataset': dataset.to_dict(),
            'auto_training_started': auto_started,
            'auto_training_message': auto_message
        }), 201

    except zipfile.BadZipFile:
        shutil.rmtree(dataset_dir, ignore_errors=True)
        return jsonify({'error': 'Invalid ZIP file'}), 400
    except Exception as e:
        shutil.rmtree(dataset_dir, ignore_errors=True)
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@organizer_bp.route('/datasets/<int:dataset_id>', methods=['DELETE'])
@jwt_required()
@role_required('organizer')
def remove_dataset_permanently(dataset_id):
    """Delete a dataset and its files."""
    dataset = Dataset.query.get(dataset_id)
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404

    # 1. Check if this dataset is currently being used for training
    status = get_training_status()
    # We check if training is active and if the model being trained belongs to this dataset
    if status['is_training']:
        from models.database import TrainedModel
        active_model = TrainedModel.query.get(status.get('model_id'))
        if active_model and active_model.dataset_id == dataset_id:
            return jsonify({
                'error': 'Cannot delete dataset while it is being used for active training. Please wait for training to complete or fail.'
            }), 409

    try:
        # 2. Delete all associated trained models (files + DB)
        # This resolves foreign key constraints
        for model in dataset.trained_models:
            if os.path.exists(model.path):
                try:
                    os.remove(model.path)
                except Exception:
                    pass
            db.session.delete(model)

        # 3. Remove files from disk
        if os.path.isdir(dataset.path):
            shutil.rmtree(dataset.path, ignore_errors=True)

        # Also remove parent if it was created by us (unique hex folder)
        parent = os.path.dirname(dataset.path)
        if parent != Config.DATASET_FOLDER and os.path.isdir(parent):
            contents = os.listdir(parent)
            # If after rmtree only files or nothing remains, clean up
            if not any(os.path.isdir(os.path.join(parent, c)) for c in contents):
                shutil.rmtree(parent, ignore_errors=True)

        # 4. Final DB deletion
        db.session.delete(dataset)
        db.session.commit()
        invalidate_cache()

        return jsonify({'message': 'Dataset and all associated models deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500


# ─── Model Training ────────────────────────────────────────────────
@organizer_bp.route('/train', methods=['POST'])
@jwt_required()
@role_required('organizer')
def train_model():
    """Start training a model on a dataset."""
    data = request.get_json()

    dataset_id = data.get('dataset_id')
    if not dataset_id:
        return jsonify({'error': 'dataset_id is required'}), 400

    dataset = Dataset.query.get(dataset_id)
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    if dataset.status != 'ready':
        return jsonify({'error': 'Dataset is not ready for training'}), 400

    model_name = data.get('model_name', f'DR_Model_{dataset.name}')
    epochs = data.get('epochs', Config.DEFAULT_EPOCHS)
    batch_size = data.get('batch_size', Config.DEFAULT_BATCH_SIZE)
    learning_rate = data.get('learning_rate', Config.DEFAULT_LEARNING_RATE)

    success, message = start_training(
        current_app._get_current_object(),
        dataset_id, model_name, epochs, batch_size, learning_rate,
    )

    if success:
        return jsonify({'message': message}), 200
    else:
        return jsonify({'error': message}), 409


@organizer_bp.route('/training-status', methods=['GET'])
@jwt_required()
@role_required('organizer')
def training_status():
    """Poll the current training progress."""
    return jsonify(get_training_status()), 200


@organizer_bp.route('/training-reset', methods=['POST'])
@jwt_required()
@role_required('organizer')
def reset_training():
    """Reset training state (after failure or completion)."""
    reset_training_state()
    return jsonify({'message': 'Training state reset'}), 200


# ─── Model Management ──────────────────────────────────────────────
@organizer_bp.route('/models', methods=['GET'])
@jwt_required()
@role_required('organizer')
def list_models():
    """List all trained models."""
    models = TrainedModel.query.order_by(TrainedModel.created_at.desc()).all()
    return jsonify({'models': [m.to_dict() for m in models]}), 200


@organizer_bp.route('/models/<int:model_id>/activate', methods=['POST'])
@jwt_required()
@role_required('organizer')
def activate_model(model_id):
    """Set a model as the active model for predictions."""
    model = TrainedModel.query.get(model_id)
    if not model:
        return jsonify({'error': 'Model not found'}), 404
    if model.status != 'completed':
        return jsonify({'error': 'Only completed models can be activated'}), 400

    # Deactivate all other models
    TrainedModel.query.update({'is_active': False})
    model.is_active = True
    db.session.commit()

    # Clear prediction cache
    invalidate_cache()

    return jsonify({
        'message': f'Model "{model.name}" activated',
        'model': model.to_dict(),
    }), 200


@organizer_bp.route('/models/<int:model_id>', methods=['DELETE'])
@jwt_required()
@role_required('organizer')
def delete_model(model_id):
    """Delete a trained model."""
    model = TrainedModel.query.get(model_id)
    if not model:
        return jsonify({'error': 'Model not found'}), 404

    # Remove model file
    if os.path.exists(model.path):
        os.remove(model.path)

    db.session.delete(model)
    db.session.commit()
    invalidate_cache()

    return jsonify({'message': 'Model deleted'}), 200
