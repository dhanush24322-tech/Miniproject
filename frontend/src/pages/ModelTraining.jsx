import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import TrainingChart from '../components/TrainingChart';
import client from '../api/client';
import { Cpu, Play, RotateCcw, CheckCircle, Save } from 'lucide-react';

export default function ModelTraining() {
  const [datasets, setDatasets] = useState([]);
  const [models, setModels] = useState([]);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [config, setConfig] = useState({ dataset_id: '', model_name: '', epochs: 20 });
  const [message, setMessage] = useState({ type: '', text: '' });
  const pollRef = useRef(null);

  useEffect(() => {
    loadData();
    startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const loadData = async () => {
    try {
      // Relative paths (no leading slash) for cloud connectivity
      const [dsRes, modRes, statusRes] = await Promise.all([
        client.get('organizer/datasets'),
        client.get('organizer/models'),
        client.get('organizer/training-status'),
      ]);
      setDatasets(dsRes.data.datasets.filter((d) => d.status === 'ready'));
      setModels(modRes.data.models);
      setTrainingStatus(statusRes.data);
    } catch {
      // ignore
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get('organizer/training-status');
        setTrainingStatus(res.data);
        if (!res.data.is_training) {
          clearInterval(pollRef.current);
          loadData();
        }
      } catch {
        // ignore
      }
    }, 2000);
  };

  const startTraining = async (e) => {
    e.preventDefault();
    if (!config.dataset_id) return;
    setMessage({ type: '', text: '' });

    try {
      const res = await client.post('organizer/train', {
        dataset_id: parseInt(config.dataset_id),
        model_name: config.model_name || `DR_Model_${Date.now()}`,
        epochs: parseInt(config.epochs),
      });
      setMessage({ type: 'success', text: 'AI engine training started in backend!' });
      startPolling();
      // Delay and refresh
      setTimeout(() => {
        client.get('organizer/training-status').then((r) => setTrainingStatus(r.data));
      }, 1000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to start training' });
    }
  };

  const activateModel = async (modelId) => {
    try {
      await client.post(`organizer/models/${modelId}/activate`);
      setMessage({ type: 'success', text: 'Model activated for predictions' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Activation failed' });
    }
  };

  const deleteModel = async (modelId) => {
    if (!window.confirm('Delete this model permanently?')) return;
    try {
      await client.delete(`organizer/models/${modelId}`);
      setMessage({ type: 'success', text: 'Model deleted' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Delete failed' });
    }
  };

  const resetTraining = async () => {
    try {
      await client.post('organizer/training-reset');
      setTrainingStatus(null);
      loadData();
    } catch {
      // ignore
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">AI Model <span className="gradient-text">Engine</span></h1>
          <p className="text-slate-400">Configure, train, and activate Diabetic Retinopathy models</p>
        </header>

        {message.text && (
          <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} mb-6`}>
            {message.type === 'error' ? '⚠️' : '✅'} {message.text}
          </div>
        )}

        {trainingStatus?.is_training ? (
          <div className="glass-card p-8 mb-8 animate-pulse border-indigo-500/50">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <div className="animate-spin text-indigo-400">⚙️</div>
                  Training in Progress...
                </h2>
                <p className="text-slate-400">{trainingStatus.message}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-indigo-400">{trainingStatus.progress}%</div>
                <div className="text-sm text-slate-500">Global Progress</div>
              </div>
            </div>
            <div className="h-4 bg-slate-800 rounded-full overflow-hidden mb-6">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${trainingStatus.progress}%`}}></div>
            </div>
            {/* Mock Chart Data for visualization during training */}
            <TrainingChart data={[{name: 'Start', accuracy: 0, loss: 1}, {name: 'Now', accuracy: trainingStatus.progress * 0.8, loss: 1 - (trainingStatus.progress/100)}]} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Play className="text-emerald-400" />
                  New Training Session
                </h2>
                <form onSubmit={startTraining} className="space-y-4">
                  <div className="form-group">
                    <label className="block text-slate-400 mb-1">Select Dataset</label>
                    <select 
                      className="form-input w-full p-2 rounded bg-slate-800"
                      value={config.dataset_id}
                      onChange={(e) => setConfig({...config, dataset_id: e.target.value})}
                      required
                    >
                      <option value="">-- Choose Dataset --</option>
                      {datasets.map(ds => (
                        <option key={ds.id} value={ds.id}>{ds.name} ({ds.num_images} images)</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="block text-slate-400 mb-1">Model Name</label>
                    <input 
                      type="text" 
                      className="form-input w-full p-2 rounded bg-slate-800" 
                      placeholder="e.g. ResNet50_V1" 
                      value={config.model_name}
                      onChange={(e) => setConfig({...config, model_name: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label className="block text-slate-400 mb-1">Epochs</label>
                    <input 
                      type="number" 
                      className="form-input w-full p-2 rounded bg-slate-800" 
                      value={config.epochs}
                      onChange={(e) => setConfig({...config, epochs: e.target.value})}
                      min="1" max="100"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full p-3 rounded font-bold bg-indigo-600">
                    Run AI Engine →
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Save className="text-purple-400" />
                  Saved AI Models
                </h2>
                <div className="table-container">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-700 text-slate-400">
                        <th className="p-3">Model Details</th>
                        <th className="p-3 text-center">Accuracy</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {models.map(m => (
                        <tr key={m.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                          <td className="p-3">
                            <div className="font-bold">{m.name}</div>
                            <div className="text-xs text-slate-500">{m.epochs} Epochs • {new Date(m.created_at).toLocaleDateString()}</div>
                          </td>
                          <td className="p-3 text-center font-mono text-emerald-400">{(m.accuracy * 100).toFixed(1)}%</td>
                          <td className="p-3">
                            {m.is_active ? (
                              <span className="flex items-center gap-1 text-emerald-400 font-bold text-xs bg-emerald-400/10 px-2 py-1 rounded">
                                <CheckCircle size={12} /> ACTIVE
                              </span>
                            ) : (
                              <span className="text-slate-500 text-xs px-2 py-1 bg-slate-800 rounded">INACTIVE</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            {!m.is_active && (
                              <button onClick={() => activateModel(m.id)} className="text-indigo-400 hover:text-indigo-300 mr-4 text-xs font-bold">
                                ACTIVATE
                              </button>
                            )}
                            <button onClick={() => deleteModel(m.id)} className="text-rose-400 hover:text-rose-300">
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
