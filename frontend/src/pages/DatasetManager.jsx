import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import client from '../api/client';
import { Database, Upload, Trash2, CheckCircle, AlertCircle } from 'lucide-react';

export default function DatasetManager() {
  const [datasets, setDatasets] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadDatasets();
  }, []);

  const loadDatasets = async () => {
    try {
      // Relative path (no leading slash) for cloud connectivity
      const res = await client.get('organizer/datasets');
      setDatasets(res.data.datasets);
    } catch {
      // ignore
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('dataset', file);
    formData.append('name', name);
    formData.append('description', description);

    try {
      // Relative path (no leading slash) for cloud connectivity
      const res = await client.post('organizer/datasets', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
      setMessage({ type: 'success', text: 'Dataset uploaded and training triggered!' });
      setFile(null); setName(''); setDescription(''); setUploadProgress(0);
      loadDatasets();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Upload failed' });
    }
  };

  const deleteDataset = async (id) => {
    if (!window.confirm('Are you sure? This will permanently delete the dataset and all its associated models.')) return;
    try {
      // Relative path (no leading slash) for cloud connectivity
      await client.delete(`organizer/datasets/${id}`);
      setMessage({ type: 'success', text: 'Dataset and associated models deleted' });
      loadDatasets();
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Dataset <span className="gradient-text">Manager</span></h1>
          <p className="text-slate-400">Manage retinal datasets and trigger AI training sessions</p>
        </header>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} mb-6`}>
            {message.type === 'error' ? '⚠️' : '✅'} {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Upload className="text-indigo-400" />
                Upload New Dataset
              </h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="form-group">
                  <label className="block text-slate-400 mb-1">Dataset Name</label>
                  <input 
                    type="text" 
                    className="form-input w-full p-2 rounded bg-slate-800" 
                    placeholder="e.g. Kaggle_Primary" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="block text-slate-400 mb-1">Description</label>
                  <textarea 
                    className="form-input w-full p-2 rounded bg-slate-800" 
                    placeholder="Brief description..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="upload-box border-dashed glass-card p-6 text-center cursor-pointer"
                     onClick={() => document.getElementById('ds-file').click()}>
                  <input id="ds-file" type="file" hidden accept=".zip" onChange={(e) => setFile(e.target.files[0])} />
                  {file ? (
                    <div className="text-emerald-400 font-bold">{file.name}</div>
                  ) : (
                    <div className="text-slate-400">Click to upload .zip dataset</div>
                  )}
                </div>

                {uploadProgress > 0 && (
                  <div className="progress-bar-container bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all" style={{width: `${uploadProgress}%`}}></div>
                  </div>
                )}

                <button type="submit" className="btn btn-primary w-full p-3 rounded font-bold bg-indigo-600" disabled={!file}>
                  {uploadProgress > 0 ? 'Uploading...' : 'Upload & Train Engine'}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Database className="text-purple-400" />
                Existing Datasets
              </h2>
              <div className="table-container">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="p-3">Name</th>
                      <th className="p-3 text-center">Images</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datasets.map((ds) => (
                      <tr key={ds.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                        <td className="p-3">
                          <div className="font-bold">{ds.name}</div>
                          <div className="text-xs text-slate-500">{new Date(ds.created_at).toLocaleDateString()}</div>
                        </td>
                        <td className="p-3 text-center">{ds.num_images}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${ds.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {ds.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => deleteDataset(ds.id)} className="text-rose-400 hover:text-rose-300">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {datasets.length === 0 && (
                      <tr><td colSpan="4" className="text-center p-8 text-slate-500 italic">No datasets found. Upload one to begin training.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
