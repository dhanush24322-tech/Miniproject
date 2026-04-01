"""
Authentication helper decorators for role-based access control.
"""
from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from models.database import User


def role_required(required_role):
    """
    Decorator that checks if the current JWT user has the required role.
    Usage: @role_required('organizer') or @role_required('doctor')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            if user.role != required_role:
                return jsonify({'error': f'Access denied. {required_role.capitalize()} role required.'}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


def get_current_user():
    """Get the current authenticated user from JWT identity."""
    user_id = get_jwt_identity()
    return User.query.get(user_id)
