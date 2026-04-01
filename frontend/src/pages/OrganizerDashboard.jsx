/**
 * Organizer Dashboard — overview stats and quick actions.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import StatsCard from '../components/StatsCard';

export default function OrganizerDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await client.get('/organizer/dashboard-stats');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-center"><div className="spinner spinner-lg"></div></div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">📊 Organizer Dashboard</h1>
        <p className="page-subtitle">Manage datasets, train models, and monitor performance</p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid stagger">
        <StatsCard
          icon="📁"
          value={stats?.total_datasets || 0}
          label="Datasets Uploaded"
          color="blue"
        />
        <StatsCard
          icon="🧠"
          value={stats?.total_models || 0}
          label="Trained Models"
          color="purple"
        />
        <StatsCard
          icon="🎯"
          value={stats?.best_accuracy ? `${stats.best_accuracy}%` : '—'}
          label="Best Accuracy"
          color="green"
        />
        <StatsCard
          icon="✅"
          value={stats?.active_model?.name || 'None'}
          label="Active Model"
          color="teal"
        />
      </div>

      {/* Quick Actions */}
      <h2 className="section-title">🚀 Quick Actions</h2>
      <div className="stats-grid" style={{ marginBottom: 'var(--space-xl)' }}>
        <Link to="/organizer/datasets" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>📤</div>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Upload Dataset</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Upload a ZIP of labeled retinal images
            </div>
          </div>
        </Link>

        <Link to="/organizer/training" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>🏋️</div>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>Train Model</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Fine-tune ResNet50 on your dataset
            </div>
          </div>
        </Link>

        <Link to="/organizer/training" style={{ textDecoration: 'none' }}>
          <div className="glass-card" style={{ padding: 'var(--space-xl)', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-sm)' }}>📈</div>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-xs)' }}>View Metrics</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
              Review training performance curves
            </div>
          </div>
        </Link>
      </div>

      {/* Training Status */}
      {stats?.training_status?.is_training && (
        <div className="glass-card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
          <h3 className="section-title">🔄 Training in Progress</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-md)' }}>
            {stats.training_status.message}
          </p>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${stats.training_status.progress}%` }}
            ></div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 'var(--space-xs)' }}>
            Epoch {stats.training_status.current_epoch}/{stats.training_status.total_epochs} — {stats.training_status.progress}%
          </p>
        </div>
      )}

      {/* Active Model Info */}
      {stats?.active_model && (
        <div className="glass-card" style={{ padding: 'var(--space-lg)' }}>
          <h3 className="section-title">✅ Active Model Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Name</div>
              <div style={{ fontWeight: 600 }}>{stats.active_model.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Version</div>
              <div style={{ fontWeight: 600 }}>{stats.active_model.version}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Val Accuracy</div>
              <div style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                {(stats.active_model.val_accuracy * 100).toFixed(2)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Architecture</div>
              <div style={{ fontWeight: 600 }}>{stats.active_model.architecture}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
