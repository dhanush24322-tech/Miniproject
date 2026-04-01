import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import client from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { History, Eye, Search, Filter, AlertCircle } from 'lucide-react';

export default function PredictionHistory() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      // Relative path (no leading slash) for cloud connectivity
      const res = await client.get('doctor/history');
      setPredictions(res.data.predictions);
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = predictions.filter(p => 
    p.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.result.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold">Clinical <span className="gradient-text">History</span></h1>
            <p className="text-slate-400">Track and review previous AI-powered diagnoses</p>
          </div>
          <div className="flex gap-2 bg-slate-800 p-2 rounded-lg border border-white/5">
            <Search className="text-slate-500" size={20} />
            <input 
              type="text" 
              className="bg-transparent border-none outline-none text-sm w-64"
              placeholder="Search patients or results..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </header>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <History className="text-indigo-400" size={20} />
            Diagnostic Records
          </h2>
          <div className="table-container">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">AI Result</th>
                  <th className="p-4 text-center">Confidence</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="font-bold flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex-center text-xs text-indigo-400">
                          {p.patient_name.charAt(0)}
                        </div>
                        {p.patient_name}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${p.result === 'No DR' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {p.result.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-center font-mono">{(p.confidence).toFixed(1)}%</td>
                    <td className="p-4 text-slate-500 text-xs">{new Date(p.created_at).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <Link to={`/doctor/result/${p.id}`} className="text-indigo-400 hover:text-indigo-300">
                        <Eye size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" className="text-center p-12 text-slate-500 italic">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="text-slate-600" size={48} />
                        <p>No matching diagnostic records found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
