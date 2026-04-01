"""
Flask application configuration.
Defines settings for JWT, database, file uploads, and model training.
"""
import os
from datetime import timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, 'storage')


class Config:
    # --- Flask Core ---
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dr-detection-secret-key-change-in-production')
    DEBUG = True

    # --- Database (Supabase PostgreSQL) ---
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres.aovglxlifotjvymimayj:Dhanush%402404@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- JWT ---
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)

    # --- File Upload ---
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB max upload
    UPLOAD_FOLDER = os.path.join(STORAGE_DIR, 'uploads')
    DATASET_FOLDER = os.path.join(STORAGE_DIR, 'datasets')
    MODEL_FOLDER = os.path.join(STORAGE_DIR, 'trained_models')
    HEATMAP_FOLDER = os.path.join(STORAGE_DIR, 'heatmaps')
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'tiff', 'bmp'}
    ALLOWED_ARCHIVE_EXTENSIONS = {'zip'}

    # --- Model Training Defaults ---
    DEFAULT_EPOCHS = 20
    DEFAULT_BATCH_SIZE = 32
    DEFAULT_LEARNING_RATE = 0.001
    IMAGE_SIZE = 224
    NUM_CLASSES = 5
    CLASS_NAMES = ['No DR', 'Mild', 'Moderate', 'Severe', 'Proliferative DR']

    @staticmethod
    def init_storage():
        """Create storage directories if they don't exist."""
        dirs = [
            Config.UPLOAD_FOLDER,
            Config.DATASET_FOLDER,
            Config.MODEL_FOLDER,
            Config.HEATMAP_FOLDER,
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)
