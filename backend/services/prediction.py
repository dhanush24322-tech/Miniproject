import os
import torch
import torch.nn.functional as F
from PIL import Image
from models.database import db, Prediction
from models.cnn_model import DR_Model
from utils.preprocessing import get_transforms
from services.gradcam import generate_gradcam

# Class names for DR levels
CLASSES = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']

def predict_image(doctor_id, patient_name, image_path):
    """Perform AI inference on a patient image and save the result."""
    try:
        # Load the active model
        from models.database import AIModel
        active_model = AIModel.query.filter_by(is_active=True).first()
        if not active_model:
            return {'error': 'No active AI model found'}

        # Initialize model and load weights
        model = DR_Model(num_classes=len(CLASSES))
        model.load_state_dict(torch.load(active_model.path, map_location=torch.device('cpu')))
        model.eval()

        # Preprocess image
        image = Image.open(image_path).convert('RGB')
        transform = get_transforms(is_train=False)
        input_tensor = transform(image).unsqueeze(0)

        # Inference
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = F.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            
            res_idx = predicted.item()
            result_text = CLASSES[res_idx]
            conf_val = confidence.item() * 100

        # Create Grad-CAM heatmap
        heatmap_filename = f"heatmap_{os.path.basename(image_path)}"
        heatmap_dir = os.path.join('storage', 'heatmaps')
        os.makedirs(heatmap_dir, exist_ok=True)
        heatmap_path = os.path.join(heatmap_dir, heatmap_filename)
        
        generate_gradcam(model, input_tensor, image_path, heatmap_path)

        # Save to database
        prediction = Prediction(
            doctor_id=doctor_id,
            patient_name=patient_name,
            image_path=image_path,
            result=result_text,
            confidence=conf_val,
            heatmap_path=heatmap_path
        )
        db.session.add(prediction)
        db.session.commit()

        return prediction.to_dict()

    except Exception as e:
        print(f"Prediction Error: {str(e)}")
        return {'error': f"Prediction failed: {str(e)}"}
