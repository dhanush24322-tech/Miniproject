"""
SQLAlchemy database models for the DR Detection application.
Defines: User, Dataset, TrainedModel, Prediction
"""
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """User model with role-based access (organizer or doctor)."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='doctor')  # 'organizer' or 'doctor'
    full_name = db.Column(db.String(150), default='')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    datasets = db.relationship('Dataset', backref='uploader', lazy='dynamic')
    predictions = db.relationship('Prediction', backref='doctor', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Dataset(db.Model):
    """Uploaded retinal image dataset."""
    __tablename__ = 'datasets'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, default='')
    path = db.Column(db.String(500), nullable=False)
    num_images = db.Column(db.Integer, default=0)
    class_distribution = db.Column(db.Text, default='{}')  # JSON string
    uploaded_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(30), default='uploaded')  # uploaded, processing, ready, error
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    trained_models = db.relationship('TrainedModel', backref='dataset', lazy='dynamic')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'num_images': self.num_images,
            'class_distribution': json.loads(self.class_distribution) if self.class_distribution else {},
            'uploaded_by': self.uploaded_by,
            'uploader_name': self.uploader.username if self.uploader else None,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class TrainedModel(db.Model):
    """Trained CNN model checkpoint with metadata."""
    __tablename__ = 'trained_models'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    version = db.Column(db.String(50), default='1.0')
    architecture = db.Column(db.String(100), default='ResNet50')
    dataset_id = db.Column(db.Integer, db.ForeignKey('datasets.id'), nullable=False)
    accuracy = db.Column(db.Float, default=0.0)
    loss = db.Column(db.Float, default=0.0)
    val_accuracy = db.Column(db.Float, default=0.0)
    val_loss = db.Column(db.Float, default=0.0)
    epochs = db.Column(db.Integer, default=0)
    path = db.Column(db.String(500), nullable=False)
    training_metrics = db.Column(db.Text, default='{}')  # JSON: per-epoch metrics
    is_active = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(30), default='training')  # training, completed, failed
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'version': self.version,
            'architecture': self.architecture,
            'dataset_id': self.dataset_id,
            'dataset_name': self.dataset.name if self.dataset else None,
            'accuracy': self.accuracy,
            'loss': self.loss,
            'val_accuracy': self.val_accuracy,
            'val_loss': self.val_loss,
            'epochs': self.epochs,
            'training_metrics': json.loads(self.training_metrics) if self.training_metrics else {},
            'is_active': self.is_active,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class Prediction(db.Model):
    """Individual prediction result from a doctor's uploaded image."""
    __tablename__ = 'predictions'

    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    model_id = db.Column(db.Integer, db.ForeignKey('trained_models.id'), nullable=True)
    image_path = db.Column(db.String(500), nullable=False)
    heatmap_path = db.Column(db.String(500), default='')
    predicted_class = db.Column(db.Integer, default=0)
    class_name = db.Column(db.String(50), default='No DR')
    confidence = db.Column(db.Float, default=0.0)
    is_positive = db.Column(db.Boolean, default=False)
    all_probabilities = db.Column(db.Text, default='{}')  # JSON: class → prob
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to model
    model = db.relationship('TrainedModel', backref='predictions')

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'doctor_id': self.doctor_id,
            'model_id': self.model_id,
            'model_name': self.model.name if self.model else 'N/A',
            'image_path': self.image_path,
            'heatmap_path': self.heatmap_path,
            'predicted_class': self.predicted_class,
            'class_name': self.class_name,
            'confidence': round(self.confidence, 4),
            'is_positive': self.is_positive,
            'all_probabilities': json.loads(self.all_probabilities) if self.all_probabilities else {},
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
