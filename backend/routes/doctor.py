import os
import uuid
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.database import db, Prediction
from utils.auth_helpers import role_required
from services.prediction import predict_image

doctor_bp = Blueprint('doctor', __name__, url_prefix='/api/doctor')

@doctor_bp.route('/predict', methods=['POST'])
@jwt_required()
@role_required('doctor')
def upload_prediction():
    """Submit a patient retina scan for diagnosis."""
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
        
    patient_name = request.form.get('patient_name', 'Unnamed Patient')
    image_file = request.files['image']
    
    # Save the original image
    storage_path = os.path.join('storage', 'predictions')
    os.makedirs(storage_path, exist_ok=True)
    filename = f"{uuid.uuid4()}_{image_file.filename}"
    file_path = os.path.join(storage_path, filename)
    image_file.save(file_path)
    
    # Run AI analysis
    doctor_id = get_jwt_identity()
    result = predict_image(doctor_id, patient_name, file_path)
    
    if 'error' in result:
        return jsonify(result), 500
        
    return jsonify(result), 200

@doctor_bp.route('/history', methods=['GET'])
@jwt_required()
@role_required('doctor')
def get_history():
    """Retrieve history of previous diagnoses for this doctor."""
    doctor_id = get_jwt_identity()
    predictions = Prediction.query.filter_by(doctor_id=doctor_id).order_by(Prediction.created_at.desc()).all()
    
    return jsonify({
        'predictions': [p.to_dict() for p in predictions]
    }), 200
