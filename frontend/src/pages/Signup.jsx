/**
 * Signup page with role selection toggle.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'doctor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup(form);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-card glass-card">
        <div className="auth-header">
          <div className="auth-logo">👁️</div>
          <h1 className="auth-title">
            Join <span className="gradient-text">DR Detect</span>
          </h1>
          <p className="auth-subtitle">Create your account to get started</p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Role Toggle */}
          <div className="form-group">
            <label className="form-label">I am a...</label>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${form.role === 'doctor' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'doctor' })}
              >
                🩺 Doctor
              </button>
              <button
                type="button"
                className={`role-btn ${form.role === 'organizer' ? 'active' : ''}`}
                onClick={() => setForm({ ...form, role: 'organizer' })}
              >
                ⚙️ Organizer
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full Name</label>
            <input
              id="signup-name"
              name="full_name"
              type="text"
              className="form-input"
              placeholder="Dr. Jane Smith"
              value={form.full_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-username">Username</label>
            <input
              id="signup-username"
              name="username"
              type="text"
              className="form-input"
              placeholder="janesmith"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email Address</label>
            <input
              id="signup-email"
              name="email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              name="password"
              type="password"
              className="form-input"
              placeholder="Min 6 characters"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
