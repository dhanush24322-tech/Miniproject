import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'doctor',
    full_name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="auth-layout flex-center min-h-screen">
      <div className="auth-card glass-card p-8 w-full max-w-md">
        <div className="auth-header text-center mb-8">
          <div className="auth-logo mb-4 text-4xl">👁️</div>
          <h1 className="auth-title text-3xl font-bold mb-2">
            Join <span className="gradient-text">DR Detect</span>
          </h1>
          <p className="auth-subtitle text-slate-400">Create your professional account</p>
        </div>

        {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form space-y-4">
          <div className="role-selector flex gap-2 mb-4">
            <button
              type="button"
              className={`btn flex-1 p-2 rounded ${form.role === 'doctor' ? 'bg-indigo-600' : 'bg-slate-800'}`}
              onClick={() => setForm({...form, role: 'doctor'})}
            >
              🩺 Doctor
            </button>
            <button
              type="button"
              className={`btn flex-1 p-2 rounded ${form.role === 'organizer' ? 'bg-indigo-600' : 'bg-slate-800'}`}
              onClick={() => setForm({...form, role: 'organizer'})}
            >
              ⚙️ Organizer
            </button>
          </div>

          <div className="form-group">
            <label className="form-label block mb-2">Full Name</label>
            <input
              name="full_name"
              type="text"
              className="form-input w-full p-2 rounded bg-slate-800"
              placeholder="Dr. Jane Doe"
              value={form.full_name}
              onChange={(e) => setForm({...form, full_name: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label block mb-2">Username</label>
            <input
              name="username"
              type="text"
              className="form-input w-full p-2 rounded bg-slate-800"
              placeholder="janedoe123"
              value={form.username}
              onChange={(e) => setForm({...form, username: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label block mb-2">Email Address</label>
            <input
              name="email"
              type="email"
              className="form-input w-full p-2 rounded bg-slate-800"
              placeholder="jane@hospital.com"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label block mb-2">Password</label>
            <input
              name="password"
              type="password"
              className="form-input w-full p-2 rounded bg-slate-800"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({...form, password: e.target.value})}
              required
              minLength={6}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full p-2 rounded bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer text-center mt-6 text-sm">
          Already have an account? <Link to="/login" className="text-indigo-400">Sign in →</Link>
        </div>
      </div>
    </div>
  );
}
