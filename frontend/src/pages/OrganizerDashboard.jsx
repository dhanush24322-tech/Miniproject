import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import StatsCard from '../components/StatsCard';
import client from '../api/client';
import { Database, Cpu, TrendingUp, AlertCircle } from 'lucide-react';

export default function OrganizerDashboard() {
  const [stats, setStats] = useState({
    datasets: 0,
    models: 0,
    active_model: 'None',
    is_training: false
  });

  useEffect(() => {
    // Relative paths (no leading slash) for cloud connectivity
    const loadStats = async () => {
      try {
        const [ds, mod, status] = await Promise.all([
          client.get('organizer/datasets'),
          client.get('organizer/models'),
          client.get('organizer/training-status')
        ]);
        
        const active = mod.data.models.find(m => m.is_active);
        
        setStats({
          datasets: ds.data.datasets.length,
          models: mod.data.models.length,
          active_model: active ? active.name : 'None',
          is_training: status.data.is_training
        });
      } catch (err) {
        console.error("Failed to load stats", err);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <main className="dashboard-content p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Organizer <span className="gradient-text">Overview</span></h1>
          <p className="text-slate-400">Manage your AI datasets and model training pipeline</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard label="Datasets" value={stats.datasets} icon={Database} color="blue" />
          <StatsCard label="Models" value={stats.models} icon={Cpu} color="purple" />
          <StatsCard label="Active Model" value={stats.active_model} icon={TrendingUp} color="emerald" />
          <StatsCard label="Training" value={stats.is_training ? 'Active' : 'Idle'} icon={AlertCircle} color={stats.is_training ? 'amber' : 'slate'} />
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <Link to="/organizer/datasets" className="btn btn-primary p-3 rounded">Upload Dataset</Link>
            <Link to="/organizer/training" className="btn btn-secondary p-3 rounded">Start Training</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// Simple internal Link mock if react-router-dom Link is needed
import { Link } from 'react-router-dom';
