/**
 * Dataset Manager — upload, view, and delete retinal image datasets.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import FileUpload from '../components/FileUpload';

export default function DatasetManager() {
  const navigate = useNavigate();
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [datasetName, setDatasetName] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      const res = await client.get('organizer/datasets');
      setDatasets(res.data.datasets);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (data) => {
    const msg = data.auto_training_started 
      ? 'Dataset uploaded and training started automatically!' 
      : 'Dataset uploaded successfully.';
    
    setMessage({ type: 'success', text: msg });
    setFile(null);
    setDatasetName('');
    setDescription('');
    loadDatasets();
    
    if (data.auto_training_started) {
      // Small delay to let the user read the success message before redirecting
      setTimeout(() => {
        navigate('/organizer/training');
      }, 2500);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a ZIP file to upload' });
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', datasetName || file.name.replace('.zip', ''));
    formData.append('description', description);

    try {
      const res = await client.post('organizer/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      handleUploadSuccess(res.data);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  const deleteDataset = async (id) => {
    if (!window.confirm('Are you sure? This will permanently delete the dataset and all its associated models.')) return;
    try {
      await client.delete(`organizer/datasets/${id}`);
      setMessage({ type: 'success', text: 'Dataset and associated models deleted' });
      loadDatasets();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Delete failed. There might be an active training session or a server error.';
      setMessage({ type: 'error', text: errorMsg });
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
        <h1 className="page-title">📁 Dataset Manager</h1>
        <p className="page-subtitle">Upload and manage retinal image datasets for training</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'error' ? '⚠️' : '✅'} {message.text}
        </div>
      )}

      {/* Upload Section */}
      <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
        <h2 className="section-title">📤 Upload New Dataset</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', marginBottom: 'var(--space-md)' }}>
          Upload a ZIP file containing labeled retinal images. Expected structure:
          <code style={{ display: 'block', background: 'var(--bg-input)', padding: 'var(--space-sm) var(--space-md)', borderRadius: 'var(--radius-sm)', marginTop: 'var(--space-xs)', fontSize: '0.75rem', color: 'var(--text-accent)' }}>
            dataset.zip/ → 0_No_DR/ | 1_Mild/ | 2_Moderate/ | 3_Severe/ | 4_Proliferative_DR/
          </code>
        </p>

        <form onSubmit={handleUpload}>
          <div className="config-grid" style={{ marginBottom: 'var(--space-md)' }}>
            <div className="form-group">
              <label className="form-label">Dataset Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., APTOS 2019"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Brief description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <FileUpload
            onFileSelect={setFile}
            accept=".zip"
            hint="Drop your dataset ZIP here"
            icon="🗂️"
            maxSize={500 * 1024 * 1024}
          />

          {uploading && (
            <div className="upload-progress" style={{ marginTop: 'var(--space-md)' }}>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg mt-md"
            disabled={uploading || !file}
          >
            {uploading ? <><span className="spinner"></span> Uploading...</> : '📤 Upload Dataset'}
          </button>
        </form>
      </div>

      {/* Dataset List */}
      <h2 className="section-title">📋 Uploaded Datasets ({datasets.length})</h2>
      {datasets.length === 0 ? (
        <div className="empty-state glass-card">
          <div className="empty-icon">📭</div>
          <div className="empty-title">No datasets yet</div>
          <div className="empty-text">Upload your first dataset to get started with model training</div>
        </div>
      ) : (
        <div className="dataset-grid stagger">
          {datasets.map((ds) => {
            const dist = ds.class_distribution || {};
            const maxCount = Math.max(...Object.values(dist), 1);

            return (
              <div key={ds.id} className="dataset-card glass-card">
                <div className="dataset-card-header">
                  <div className="dataset-name">{ds.name}</div>
                  <span className={`dataset-status ${ds.status}`}>{ds.status}</span>
                </div>

                <div className="dataset-meta">
                  <span>🖼️ {ds.num_images} images</span>
                  <span>📅 {new Date(ds.created_at).toLocaleDateString()}</span>
                </div>

                {Object.keys(dist).length > 0 && (
                  <div className="dist-bars">
                    {Object.entries(dist).map(([cls, count]) => (
                      <div key={cls} className="dist-row">
                        <span className="dist-label" title={cls}>
                          {cls.replace(/^\d+_/, '').replace(/_/g, ' ')}
                        </span>
                        <div className="dist-bar">
                          <div
                            className="dist-bar-fill"
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          ></div>
                        </div>
                        <span className="dist-count">{count}</span>
                      </div>
                    ))}
                  </div>
                )}

                {ds.description && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>
                    {ds.description}
                  </p>
                )}

                <div className="dataset-actions">
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => deleteDataset(ds.id)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
