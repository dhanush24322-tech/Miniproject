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
      setError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout flex-center min-h-screen">
      <div className="auth-card glass-card p-8 w-full max-w-md">
        <div className="auth-header text-center mb-8">
          <div className="auth-logo mb-4 text-4xl">👁️</div>
          <h1 className="auth-title text-3xl font-bold mb-2">
            Welcome to <span className="gradient-text">DR Detect</span>
          </h1>
          <p className="auth-subtitle text-slate-400">Sign in to your professional account</p>
        </div>

        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form space-y-4">
          <div className="form-group">
            <label className="form-label block mb-2">Email Address</label>
            <input
              type="email"
              className="form-input w-full p-2 rounded bg-slate-800"
              placeholder="you@hospital.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label block mb-2">Password</label>
            <input
              type="password"
              className="form-input w-full p-2 rounded bg-slate-800"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full p-2 rounded bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Joining Session...' : 'Sign In →'}
          </button>
        </form>

        <div className="auth-footer text-center mt-6 text-sm">
          Don't have an account? <Link to="/signup" className="text-indigo-400">Create one for free</Link>
        </div>
      </div>
    </div>
  );
}
