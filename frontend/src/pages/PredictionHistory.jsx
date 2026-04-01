/**
 * Prediction History — complete list of past diagnoses.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function PredictionHistory() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      const res = await client.get('/doctor/predictions');
      setPredictions(res.data.predictions);
    } catch {
      // ignore
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
        <h1 className="page-title">📋 Prediction History</h1>
        <p className="page-subtitle">Review all past diagnosis results</p>
      </div>

      {predictions.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No predictions yet</div>
          <div className="empty-text">Upload a retinal image to get your first diagnosis</div>
          <button className="btn btn-primary" onClick={() => navigate('/doctor')}>
            🔬 Start Diagnosis
          </button>
        </div>
      ) : (
        <div className="model-table-wrap">
          <table className="model-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Classification</th>
                <th>Result</th>
                <th>Confidence</th>
                <th>Model</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p, idx) => (
                <tr key={p.id}>
                  <td>{predictions.length - idx}</td>
                  <td>{new Date(p.created_at).toLocaleString()}</td>
                  <td style={{ fontWeight: 600 }}>{p.class_name}</td>
                  <td>
                    <span
                      className="badge"
                      style={{
                        background: p.is_positive ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)',
                        color: p.is_positive ? 'var(--accent-red)' : 'var(--accent-green)',
                      }}
                    >
                      {p.is_positive ? '🔴 Positive' : '✅ Negative'}
                    </span>
                  </td>
                  <td>{(p.confidence * 100).toFixed(1)}%</td>
                  <td>{p.model_name}</td>
                  <td>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => navigate(`/doctor/result/${p.id}`)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
