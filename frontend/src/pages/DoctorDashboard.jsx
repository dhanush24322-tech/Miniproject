/**
 * Doctor Dashboard — upload retinal images for DR diagnosis.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import StatsCard from '../components/StatsCard';
import FileUpload from '../components/FileUpload';

export default function DoctorDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await client.get('/doctor/dashboard-stats');
      setStats(res.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a retinal image' });
      return;
    }

    setPredicting(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await client.post('/doctor/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Navigate to result page
      navigate(`/doctor/result/${res.data.prediction.id}`);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Prediction failed. Please try again.',
      });
    } finally {
      setPredicting(false);
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
        <h1 className="page-title">🩺 Doctor Dashboard</h1>
        <p className="page-subtitle">Upload retinal images for AI-powered diabetic retinopathy screening</p>
      </div>

      {/* Stats */}
      <div className="stats-grid stagger">
        <StatsCard
          icon="🔬"
          value={stats?.total_predictions || 0}
          label="Total Scans"
          color="blue"
        />
        <StatsCard
          icon="🔴"
          value={stats?.positive_count || 0}
          label="DR Positive"
          color="red"
        />
        <StatsCard
          icon="✅"
          value={stats?.negative_count || 0}
          label="DR Negative"
          color="green"
        />
        <StatsCard
          icon="🧠"
          value={stats?.active_model?.name || 'None'}
          label="Active Model"
          color="purple"
        />
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Upload & Predict */}
      <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        <h2 className="section-title">🔬 New Diagnosis</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 'var(--space-md)' }}>
          Upload a retinal fundus image to detect diabetic retinopathy
        </p>

        {!stats?.active_model ? (
          <div className="alert alert-info">
            ℹ️ No active model available. Please ask the organizer to train and activate a model first.
          </div>
        ) : (
          <>
            <FileUpload
              onFileSelect={setFile}
              accept=".png,.jpg,.jpeg,.tiff,.bmp"
              hint="Drop a retinal fundus image here"
              icon="👁️"
              maxSize={50 * 1024 * 1024}
            />

            {file && (
              <div style={{ textAlign: 'center', marginTop: 'var(--space-md)' }}>
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  style={{
                    maxWidth: '300px',
                    maxHeight: '300px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-primary)',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}

            <button
              className="btn btn-success btn-lg mt-lg"
              onClick={handlePredict}
              disabled={predicting || !file}
            >
              {predicting ? (
                <><span className="spinner"></span> Analyzing...</>
              ) : (
                '🔬 Analyze Image'
              )}
            </button>
          </>
        )}
      </div>

      {/* Recent Predictions */}
      {stats?.recent_predictions?.length > 0 && (
        <>
          <h2 className="section-title">📋 Recent Results</h2>
          <div className="history-list">
            {stats.recent_predictions.map((p) => (
              <div
                key={p.id}
                className="history-item glass-card"
                onClick={() => navigate(`/doctor/result/${p.id}`)}
              >
                <div style={{ fontSize: '1.5rem' }}>
                  {p.is_positive ? '🔴' : '🟢'}
                </div>
                <div className="history-info">
                  <div className="history-class">{p.class_name}</div>
                  <div className="history-date">
                    {new Date(p.created_at).toLocaleString()} — Confidence: {(p.confidence * 100).toFixed(1)}%
                  </div>
                </div>
                <span
                  className="history-badge"
                  style={{
                    background: p.is_positive ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                    color: p.is_positive ? 'var(--accent-red)' : 'var(--accent-green)',
                  }}
                >
                  {p.is_positive ? 'Positive' : 'Negative'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
