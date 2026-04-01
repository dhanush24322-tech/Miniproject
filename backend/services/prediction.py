"""
Prediction service.
Loads the active trained model and runs inference on uploaded retinal images.
"""
import os
import json
import torch
import torch.nn.functional as F
from PIL import Image

from models.cnn_model import DRClassifier
from utils.preprocessing import get_inference_transform
from config import Config

# Cache the loaded model to avoid reloading on every request
_model_cache = {
    'model': None,
    'model_id': None,
}

CLASS_NAMES = Config.CLASS_NAMES


def get_active_model():
    """Fetch the active trained model from the database."""
    from models.database import TrainedModel
    return TrainedModel.query.filter_by(is_active=True, status='completed').first()


def load_model(trained_model):
    """Load (or reuse cached) model for inference."""
    if _model_cache['model_id'] == trained_model.id and _model_cache['model'] is not None:
        return _model_cache['model']

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = DRClassifier.load_model(
        trained_model.path,
        num_classes=Config.NUM_CLASSES,
        device=device,
    )
    _model_cache['model'] = model
    _model_cache['model_id'] = trained_model.id
    return model


def predict_image(image_path, trained_model=None):
    """
    Run prediction on a single retinal image.
    Returns dict with class, confidence, probabilities, and is_positive flag.
    """
    if trained_model is None:
        trained_model = get_active_model()
    if trained_model is None:
        return None, 'No active model available. Please train and activate a model first.'

    if not os.path.exists(trained_model.path):
        return None, f'Model file not found at {trained_model.path}'

    try:
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = load_model(trained_model)

        # Load and preprocess image
        transform = get_inference_transform(Config.IMAGE_SIZE)
        image = Image.open(image_path).convert('RGB')
        input_tensor = transform(image).unsqueeze(0).to(device)

        # Run inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = F.softmax(outputs, dim=1)[0]
            confidence, predicted_class = torch.max(probabilities, 0)

        predicted_class = predicted_class.item()
        confidence = confidence.item()
        class_name = CLASS_NAMES[predicted_class]
        is_positive = predicted_class > 0  # Any class > 0 means DR detected

        # All class probabilities
        all_probs = {
            CLASS_NAMES[i]: round(probabilities[i].item(), 4)
            for i in range(len(CLASS_NAMES))
        }

        result = {
            'predicted_class': predicted_class,
            'class_name': class_name,
            'confidence': round(confidence, 4),
            'is_positive': is_positive,
            'all_probabilities': all_probs,
        }

        return result, None

    except Exception as e:
        return None, f'Prediction failed: {str(e)}'


def invalidate_cache():
    """Clear cached model (call when active model changes)."""
    _model_cache['model'] = None
    _model_cache['model_id'] = None
