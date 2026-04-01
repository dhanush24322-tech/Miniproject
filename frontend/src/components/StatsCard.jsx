/**
 * StatsCard — glassmorphism metric card with icon.
 */
export default function StatsCard({ icon, value, label, color = 'blue' }) {
  return (
    <div className="stat-card glass-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}
