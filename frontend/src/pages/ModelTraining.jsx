/**
 * Model Training page — configure, start training, view metrics, and manage models.
 */
import { useState, useEffect, useRef } from 'react';
import client from '../api/client';
import TrainingChart from '../components/TrainingChart';

export default function ModelTraining() {
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const pollRef = useRef(null);

  // Training config
  const [config, setConfig] = useState({
    dataset_id: '',
    model_name: '',
    epochs: 20,
    batch_size: 32,
    learning_rate: 0.001,
  });

  useEffect(() => {
    loadData();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadData = async () => {
    try {
      const [dsRes, modRes, statusRes] = await Promise.all([
        client.get('/organizer/datasets'),
        client.get('/organizer/models'),
        client.get('/organizer/training-status'),
      ]);
      setDatasets(dsRes.data.datasets.filter((d) => d.status === 'ready'));
      setModels(modRes.data.models);
      setTrainingStatus(statusRes.data);

      if (statusRes.data.is_training) {
        startPolling();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get('/organizer/training-status');
        setTrainingStatus(res.data);
        if (!res.data.is_training) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          loadData(); // Refresh models list
        }
      } catch {
        // ignore
      }
    }, 3000);
  };

  const startTraining = async (e) => {
    e.preventDefault();
    if (!config.dataset_id) {
      setMessage({ type: 'error', text: 'Please select a dataset' });
      return;
    }

    setMessage({ type: '', text: '' });

    try {
      const res = await client.post('/organizer/train', {
        dataset_id: parseInt(config.dataset_id),
        model_name: config.model_name || `DR_Model_${Date.now()}`,
        epochs: parseInt(config.epochs),
        batch_size: parseInt(config.batch_size),
        learning_rate: parseFloat(config.learning_rate),
      });
      setMessage({ type: 'success', text: res.data.message });
      startPolling();
      // Delay and refresh
      setTimeout(() => {
        client.get('/organizer/training-status').then((r) => setTrainingStatus(r.data));
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to start training' });
    }
  };

  const activateModel = async (modelId) => {
    try {
      await client.post(`/organizer/models/${modelId}/activate`);
      setMessage({ type: 'success', text: 'Model activated for predictions' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Activation failed' });
    }
  };

  const deleteModel = async (modelId) => {
    if (!window.confirm('Delete this model permanently?')) return;
    try {
      await client.delete(`/organizer/models/${modelId}`);
      setMessage({ type: 'success', text: 'Model deleted' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Delete failed' });
    }
  };

  const resetTraining = async () => {
    try {
      await client.post('/organizer/training-reset');
      setTrainingStatus(null);
      loadData();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-center"><div className="spinner spinner-lg"></div></div>
      </div>
    );
  }

  const isTraining = trainingStatus?.is_training;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">🧠 Model Training</h1>
        <p className="page-subtitle">Train deep learning models on retinal image datasets</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Training Configuration */}
      {!isTraining && (
        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <h2 className="section-title">⚙️ Training Configuration</h2>
          <form onSubmit={startTraining}>
            <div className="config-grid" style={{ marginBottom: 'var(--space-md)' }}>
              <div className="form-group">
                <label className="form-label">Dataset</label>
                <select
                  className="form-input"
                  value={config.dataset_id}
                  onChange={(e) => setConfig({ ...config, dataset_id: e.target.value })}
                  required
                >
                  <option value="">Select a dataset...</option>
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.num_images} images)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Model Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., DR_ResNet50_v1"
                  value={config.model_name}
                  onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Epochs</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="100"
                  value={config.epochs}
                  onChange={(e) => setConfig({ ...config, epochs: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Batch Size</label>
                <select
                  className="form-input"
                  value={config.batch_size}
                  onChange={(e) => setConfig({ ...config, batch_size: e.target.value })}
                >
                  <option value="8">8</option>
                  <option value="16">16</option>
                  <option value="32">32</option>
                  <option value="64">64</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Learning Rate</label>
                <select
                  className="form-input"
                  value={config.learning_rate}
                  onChange={(e) => setConfig({ ...config, learning_rate: e.target.value })}
                >
                  <option value="0.01">0.01</option>
                  <option value="0.001">0.001 (recommended)</option>
                  <option value="0.0001">0.0001</option>
                  <option value="0.00001">0.00001</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-success btn-lg" disabled={datasets.length === 0}>
              🚀 Start Training
            </button>

            {datasets.length === 0 && (
              <p style={{ color: 'var(--accent-orange)', fontSize: '0.8125rem', marginTop: 'var(--space-sm)' }}>
                ⚠️ No datasets available. Upload a dataset first.
              </p>
            )}
          </form>
        </div>
      )}

      {/* Training Progress */}
      {isTraining && (
        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <h2 className="section-title">🔄 Training in Progress</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
            {trainingStatus.message}
          </p>
          <div className="progress-bar-container" style={{ marginBottom: 'var(--space-sm)' }}>
            <div className="progress-bar-fill" style={{ width: `${trainingStatus.progress}%` }}></div>
          </div>
          <div className="flex justify-between" style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span>Epoch {trainingStatus.current_epoch} / {trainingStatus.total_epochs}</span>
            <span>{trainingStatus.progress}%</span>
          </div>

          {/* Live Metrics */}
          {trainingStatus.metrics?.length > 1 && (
            <div style={{ marginTop: 'var(--space-xl)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
              <TrainingChart metrics={trainingStatus.metrics} type="loss" />
              <TrainingChart metrics={trainingStatus.metrics} type="accuracy" />
            </div>
          )}
        </div>
      )}

      {/* Completed training results */}
      {trainingStatus?.status === 'completed' && !isTraining && trainingStatus.metrics?.length > 0 && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="flex justify-between items-center mb-md">
            <h2 className="section-title" style={{ marginBottom: 0 }}>📈 Last Training Results</h2>
            <button className="btn btn-outline btn-sm" onClick={resetTraining}>Dismiss</button>
          </div>
          <div className="alert alert-success">✅ {trainingStatus.message}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
            <TrainingChart metrics={trainingStatus.metrics} type="loss" />
            <TrainingChart metrics={trainingStatus.metrics} type="accuracy" />
          </div>
        </div>
      )}

      {trainingStatus?.status === 'failed' && !isTraining && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <div className="alert alert-error">❌ {trainingStatus.message}</div>
          <button className="btn btn-outline btn-sm" onClick={resetTraining}>Dismiss</button>
        </div>
      )}

      {/* Models Table */}
      <h2 className="section-title" style={{ marginTop: 'var(--space-xl)' }}>🗂️ Trained Models ({models.length})</h2>
      {models.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">🧠</div>
          <div className="empty-title">No models trained yet</div>
          <div className="empty-text">Train your first model using the form above</div>
        </div>
      ) : (
        <div className="model-table-wrap">
          <table className="model-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Version</th>
                <th>Dataset</th>
                <th>Accuracy</th>
                <th>Val Accuracy</th>
                <th>Epochs</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>{m.version}</td>
                  <td>{m.dataset_name}</td>
                  <td>{(m.accuracy * 100).toFixed(2)}%</td>
                  <td style={{ color: 'var(--accent-green)' }}>{(m.val_accuracy * 100).toFixed(2)}%</td>
                  <td>{m.epochs}</td>
                  <td>
                    {m.is_active ? (
                      <span className="badge badge-active">Active</span>
                    ) : m.status === 'completed' ? (
                      <span className="badge badge-inactive">Ready</span>
                    ) : m.status === 'training' ? (
                      <span className="badge badge-training">Training</span>
                    ) : (
                      <span className="badge badge-failed">Failed</span>
                    )}
                  </td>
                  <td>
                    <div className="flex gap-sm">
                      {!m.is_active && m.status === 'completed' && (
                        <button className="btn btn-primary btn-sm" onClick={() => activateModel(m.id)}>
                          Activate
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => deleteModel(m.id)}>
                        🗑️
                      </button>
                    </div>
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
