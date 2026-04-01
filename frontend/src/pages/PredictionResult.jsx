/**
 * PredictionResult — detailed view of a single prediction.
 * Shows classification, confidence circle, probability bars, and Grad-CAM heatmap.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client, { API_BASE_URL } from '../api/client';
import HeatmapViewer from '../components/HeatmapViewer';

const SEVERITY_COLORS = [
  'var(--accent-green)',    // 0 - No DR
  'var(--accent-teal)',     // 1 - Mild
  'var(--accent-orange)',   // 2 - Moderate
  '#f97316',               // 3 - Severe
  'var(--accent-red)',      // 4 - Proliferative
];

const SEVERITY_DESCRIPTIONS = [
  'No signs of diabetic retinopathy detected.',
  'Mild non-proliferative diabetic retinopathy. Minor microaneurysms detected.',
  'Moderate non-proliferative diabetic retinopathy. Some blood vessels are blocked.',
  'Severe non-proliferative diabetic retinopathy. Significant vessel blockage.',
  'Proliferative diabetic retinopathy. Advanced stage with abnormal blood vessel growth.',
];

export default function PredictionResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrediction();
  }, [id]);

  const loadPrediction = async () => {
    try {
      const res = await client.get(`/doctor/predictions/${id}`);
      setPrediction(res.data.prediction);
    } catch (err) {
      console.error('Failed to load prediction:', err);
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

  if (!prediction) {
    return (
      <div className="page-container">
        <div className="empty-state glass-card">
          <div className="empty-icon">❓</div>
          <div className="empty-title">Prediction not found</div>
          <button className="btn btn-primary mt-md" onClick={() => navigate('/doctor')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem('dr_token');
  const circleRadius = 58;
  const circumference = 2 * Math.PI * circleRadius;
  const dashOffset = circumference - (prediction.confidence * circumference);
  const severityColor = SEVERITY_COLORS[prediction.predicted_class] || SEVERITY_COLORS[0];

  return (
    <div className="page-container">
      <div className="page-header">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => navigate('/doctor')}
          style={{ marginBottom: 'var(--space-md)' }}
        >
          ← Back to Dashboard
        </button>
        <h1 className="page-title">🔬 Diagnosis Result</h1>
        <p className="page-subtitle">
          Analysis completed on {new Date(prediction.created_at).toLocaleString()}
        </p>
      </div>

      <div className="result-container">
        {/* Left: Classification & Confidence */}
        <div className="result-summary glass-card">
          <div className="result-classification">
            {/* Binary Result */}
            <div
              className={`result-binary ${prediction.is_positive ? 'positive' : 'negative'}`}
            >
              {prediction.is_positive ? '🔴 DR Positive' : '✅ DR Negative'}
            </div>

            {/* Classification Level */}
            <div className="result-level" style={{ color: severityColor }}>
              {prediction.class_name}
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto' }}>
              {SEVERITY_DESCRIPTIONS[prediction.predicted_class]}
            </p>
          </div>

          {/* Confidence Circle */}
          <div className="confidence-circle">
            <svg viewBox="0 0 128 128">
              <circle className="bg-circle" cx="64" cy="64" r={circleRadius} />
              <circle
                className="progress-circle"
                cx="64"
                cy="64"
                r={circleRadius}
                stroke={severityColor}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
            <div className="confidence-value">
              <span className="confidence-percent" style={{ color: severityColor }}>
                {(prediction.confidence * 100).toFixed(1)}%
              </span>
              <span className="confidence-label">Confidence</span>
            </div>
          </div>

          {/* Probability Bars */}
          <h3 className="section-title" style={{ marginTop: 'var(--space-lg)' }}>Class Probabilities</h3>
          <div className="prob-bars">
            {Object.entries(prediction.all_probabilities || {}).map(([name, prob], idx) => (
              <div key={name} className="prob-row">
                <span className="prob-name">{name}</span>
                <div className="prob-bar-wrap">
                  <div
                    className={`prob-bar-fill severity-${idx}`}
                    style={{ width: `${(prob * 100).toFixed(1)}%` }}
                  ></div>
                </div>
                <span className="prob-value">{(prob * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Model Info */}
          <div style={{
            marginTop: 'var(--space-lg)',
            padding: 'var(--space-md)',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.8125rem',
            color: 'var(--text-muted)',
          }}>
            Model: <strong style={{ color: 'var(--text-secondary)' }}>{prediction.model_name}</strong>
          </div>
        </div>

        {/* Right: Heatmap */}
        <div>
          <HeatmapViewer
            imagePath={prediction.image_path}
            heatmapPath={prediction.heatmap_path}
            token={token}
          />

          {/* Original Image */}
          {prediction.image_path && (
            <div className="glass-card" style={{ padding: 'var(--space-lg)', marginTop: 'var(--space-md)' }}>
              <h3 className="section-title">🖼️ Uploaded Image</h3>
              <img
                src={`${API_BASE_URL}/doctor/image/${prediction.image_path.split(/[/\\]/).pop()}?token=${token}`}
                alt="Uploaded retinal image"
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-primary)',
                }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-md mt-lg">
        <button className="btn btn-primary" onClick={() => navigate('/doctor')}>
          🔬 New Diagnosis
        </button>
        <button className="btn btn-outline" onClick={() => navigate('/doctor/history')}>
          📋 View History
        </button>
      </div>
    </div>
  );
}
