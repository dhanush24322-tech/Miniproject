from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from models.database import User

def role_required(role):
    """
    Decorator to restrict routes based on user role ('organizer' or 'doctor').
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user or user.role != role:
                return jsonify({'error': 'Unauthorized access'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator
