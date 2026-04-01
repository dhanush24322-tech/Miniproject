/**
 * Login page with glassmorphism card and animated background.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
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
            Welcome to <span className="gradient-text">DR Detect</span>
          </h1>
          <p className="auth-subtitle">Sign in to access your dashboard</p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? <span className="spinner"></span> : 'Sign In'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup">Create one →</Link>
        </div>
      </div>
    </div>
  );
}
