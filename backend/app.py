"""
Flask application entry point.
Initializes the app, database, JWT, CORS, and registers all blueprints.
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from config import Config
from models.database import db


def create_app():
    """Application factory."""
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize storage directories
    Config.init_storage()

    # Initialize extensions
    db.init_app(app)
    JWTManager(app)
    
    # Allow CORS for Vercel deployment
    allowed_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

    # Register blueprints
    from routes.auth import auth_bp
    from routes.organizer import organizer_bp
    from routes.doctor import doctor_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(organizer_bp)
    app.register_blueprint(doctor_bp)

    # Create database tables
    with app.app_context():
        db.create_all()

    # Health check endpoint
    @app.route('/api/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'message': 'DR Detection API is running'}), 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    return app

# Expose app for Gunicorn
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
