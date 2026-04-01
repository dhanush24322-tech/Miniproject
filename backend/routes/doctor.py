"""
Doctor routes: image upload, prediction, and result history.
All routes require doctor role.
"""
import os
import uuid
import json
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required

from models.database import db, Prediction, TrainedModel
from utils.auth_helpers import role_required, get_current_user
from services.prediction import predict_image, get_active_model, load_model
from services.gradcam import generate_heatmap
from config import Config

doctor_bp = Blueprint('doctor', __name__, url_prefix='/api/doctor')


# ─── Dashboard Stats ───────────────────────────────────────────────
@doctor_bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
@role_required('doctor')
def dashboard_stats():
    """Get summary statistics for the doctor dashboard."""
    user = get_current_user()
    total_predictions = Prediction.query.filter_by(doctor_id=user.id).count()
    positive_count = Prediction.query.filter_by(doctor_id=user.id, is_positive=True).count()
    negative_count = total_predictions - positive_count

    active_model = get_active_model()

    # Recent predictions
    recent = Prediction.query.filter_by(doctor_id=user.id).order_by(
        Prediction.created_at.desc()
    ).limit(5).all()

    return jsonify({
        'total_predictions': total_predictions,
        'positive_count': positive_count,
        'negative_count': negative_count,
        'active_model': active_model.to_dict() if active_model else None,
        'recent_predictions': [p.to_dict() for p in recent],
    }), 200


# ─── Image Prediction ──────────────────────────────────────────────
@doctor_bp.route('/predict', methods=['POST'])
@jwt_required()
@role_required('doctor')
def predict():
    """Upload a retinal image and get DR prediction with Grad-CAM heatmap."""
    if 'file' not in request.files:
        return jsonify({'error': 'No image file uploaded'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Validate extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
    if ext not in Config.ALLOWED_IMAGE_EXTENSIONS:
        return jsonify({'error': f'Allowed formats: {", ".join(Config.ALLOWED_IMAGE_EXTENSIONS)}'}), 400

    user = get_current_user()

    # Save uploaded image
    filename = f"{uuid.uuid4().hex[:12]}_{file.filename}"
    image_path = os.path.join(Config.UPLOAD_FOLDER, filename)
    file.save(image_path)

    try:
        # Get active model
        active_model = get_active_model()
        if not active_model:
            return jsonify({
                'error': 'No active model available. Please ask the organizer to train and activate a model.'
            }), 404

        # Run prediction
        result, error = predict_image(image_path, active_model)
        if error:
            return jsonify({'error': error}), 500

        # Generate Grad-CAM heatmap
        heatmap_path = ''
        try:
            model = load_model(active_model)
            heatmap_path = generate_heatmap(image_path, model, result['predicted_class'])
        except Exception as e:
            print(f"Grad-CAM generation failed: {e}")
            # Continue without heatmap — it's optional

        # Save prediction to database
        prediction = Prediction(
            doctor_id=user.id,
            model_id=active_model.id,
            image_path=image_path,
            heatmap_path=heatmap_path,
            predicted_class=result['predicted_class'],
            class_name=result['class_name'],
            confidence=result['confidence'],
            is_positive=result['is_positive'],
            all_probabilities=json.dumps(result['all_probabilities']),
        )
        db.session.add(prediction)
        db.session.commit()

        return jsonify({
            'message': 'Prediction completed',
            'prediction': prediction.to_dict(),
        }), 200

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500


# ─── Prediction History ────────────────────────────────────────────
@doctor_bp.route('/predictions', methods=['GET'])
@jwt_required()
@role_required('doctor')
def list_predictions():
    """List all predictions for the current doctor."""
    user = get_current_user()
    predictions = Prediction.query.filter_by(doctor_id=user.id).order_by(
        Prediction.created_at.desc()
    ).all()
    return jsonify({'predictions': [p.to_dict() for p in predictions]}), 200


@doctor_bp.route('/predictions/<int:pred_id>', methods=['GET'])
@jwt_required()
@role_required('doctor')
def get_prediction(pred_id):
    """Get detailed prediction result."""
    user = get_current_user()
    prediction = Prediction.query.filter_by(id=pred_id, doctor_id=user.id).first()

    if not prediction:
        return jsonify({'error': 'Prediction not found'}), 404

    return jsonify({'prediction': prediction.to_dict()}), 200


# ─── Serve Images ──────────────────────────────────────────────────
@doctor_bp.route('/image/<path:filename>', methods=['GET'])
@jwt_required()
def serve_image(filename):
    """Serve an uploaded retinal image."""
    # Check uploads directory
    file_path = os.path.join(Config.UPLOAD_FOLDER, filename)
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='image/png')
    return jsonify({'error': 'Image not found'}), 404


@doctor_bp.route('/heatmap/<path:filename>', methods=['GET'])
@jwt_required()
def serve_heatmap(filename):
    """Serve a generated heatmap image."""
    file_path = os.path.join(Config.HEATMAP_FOLDER, filename)
    if os.path.exists(file_path):
        return send_file(file_path, mimetype='image/png')
    return jsonify({'error': 'Heatmap not found'}), 404
