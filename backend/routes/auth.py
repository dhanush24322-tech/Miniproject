from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models.database import db, User

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user (Doctor or Organizer)."""
    data = request.get_json()
    
    if not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400
        
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
        
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400
        
    user = User(
        username=data['username'],
        email=data['email'],
        role=data.get('role', 'doctor'),
        full_name=data.get('full_name', '')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    
    token = create_access_token(identity=str(user.id))
    return jsonify({
        'message': 'User registered successfully',
        'token': token,
        'user': user.to_dict()
    }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token."""
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    
    if user and user.check_password(data.get('password')):
        token = create_access_token(identity=str(user.id))
        return jsonify({
            'token': token,
            'user': user.to_dict()
        }), 200
        
    return jsonify({'error': 'Invalid email or password'}), 401

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get the current authenticated user's profile."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    return jsonify({'user': user.to_dict()}), 200
