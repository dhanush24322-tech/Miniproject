import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import HeatmapViewer from '../components/HeatmapViewer';
import client from '../api/client';
import { ArrowLeft, Printer, Share2, Clipboard } from 'lucide-react';

export default function PredictionResult() {
  const { id } = useParams();
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPrediction = async () => {
      try {
        const res = await client.get(`doctor/history`);
        const found = res.data.predictions.find(p => p.id === parseInt(id));
        setPrediction(found);
      } catch (err) {
        console.error("Failed to load result", err);
      } finally {
        setLoading(false);
      }
    };
    loadPrediction();
  }, [id]);

  if (loading) return <div className="loading flex-center h-screen bg-slate-900">AI Loading Result...</div>;
  if (!prediction) return <div className="error-screen flex-center h-screen bg-slate-900 text-white">Result not found or unauthorized.</div>;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <Link to="/doctor" className="text-indigo-400 flex items-center gap-2 mb-4 hover:underline">
              <ArrowLeft size={16} /> Back to Diagnostics
            </Link>
            <h1 className="text-3xl font-bold">Diagnostic <span className="gradient-text">Report</span></h1>
            <p className="text-slate-400">Detailed AI analysis and visualization for {prediction.patient_name}</p>
          </div>
          <div className="flex gap-3">
            <button className="btn bg-slate-800 p-3 rounded hover:bg-slate-700" onClick={() => window.print()}>
              <Printer size={18} />
            </button>
            <button className="btn bg-slate-800 p-3 rounded hover:bg-slate-700">
              <Share2 size={18} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <HeatmapViewer 
              originalImage={`${client.defaults.baseURL}predictions/image/${prediction.id}?t=${Date.now()}`} 
              heatmapImage={`${client.defaults.baseURL}predictions/heatmap/${prediction.id}?t=${Date.now()}`}
              prediction={prediction}
            />
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clipboard className="text-purple-400" size={20} />
                Clinical Summary
              </h3>
              <div className="space-y-4">
                <div className="summary-item border-b border-white/5 pb-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Status</div>
                  <div className={`text-xl font-bold ${prediction.result === 'No DR' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {prediction.result} Found
                  </div>
                </div>
                <div className="summary-item border-b border-white/5 pb-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Certainty</div>
                  <div className="text-xl font-bold">{prediction.confidence.toFixed(1)}% Match</div>
                </div>
                <div className="summary-item border-b border-white/5 pb-4">
                  <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Timestamp</div>
                  <div className="text-xl font-bold">{new Date(prediction.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 border-l-4 border-amber-500/50">
              <h3 className="text-sm font-bold text-amber-500 mb-2">Medical Disclaimer</h3>
              <p className="text-xs text-slate-400 italic">
                AI results are intended for decision support and clinical research only. This report should be reviewed by a qualified ophthalmologist before making treatment decisions.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
