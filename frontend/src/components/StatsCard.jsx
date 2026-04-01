import React from 'react';

export default function StatsCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    slate: 'bg-slate-500/10 text-slate-400'
  };

  return (
    <div className="stats-card glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colors[color] || colors.slate}`}>
          <Icon size={24} />
        </div>
      </div>
      <div className="stats-info">
        <div className="text-slate-400 text-sm mb-1">{label}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}
