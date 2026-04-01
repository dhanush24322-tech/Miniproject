"""
Authentication routes: signup, login, and user profile.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.database import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user with role selection."""
    data = request.get_json()

    # Validate required fields
    required = ['username', 'email', 'password', 'role']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    # Validate role
    if data['role'] not in ('organizer', 'doctor'):
        return jsonify({'error': 'Role must be "organizer" or "doctor"'}), 400

    # Check if username or email already exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already taken'}), 409
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409

    # Validate password length
    if len(data['password']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    # Create user
    user = User(
        username=data['username'],
        email=data['email'],
        role=data['role'],
        full_name=data.get('full_name', ''),
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    # Generate token
    token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Account created successfully',
        'token': token,
        'user': user.to_dict(),
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    data = request.get_json()

    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not user.check_password(data['password']):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = create_access_token(identity=str(user.id))

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user': user.to_dict(),
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Get the current authenticated user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': user.to_dict()}), 200
