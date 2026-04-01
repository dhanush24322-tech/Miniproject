/**
 * Sidebar — role-aware dashboard navigation with user info.
 */
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const organizerLinks = [
  { to: '/organizer', icon: '📊', label: 'Dashboard', end: true },
  { to: '/organizer/datasets', icon: '📁', label: 'Datasets' },
  { to: '/organizer/training', icon: '🧠', label: 'Model Training' },
];

const doctorLinks = [
  { to: '/doctor', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/doctor/predict', icon: '🔬', label: 'New Diagnosis' },
  { to: '/doctor/history', icon: '📋', label: 'History' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const links = user.role === 'organizer' ? organizerLinks : doctorLinks;
  const initials = (user.full_name || user.username || 'U').slice(0, 2).toUpperCase();

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">👁️</span>
          <span className="gradient-text">DR Detect</span>
        </div>
        <div className="sidebar-role">{user.role} Panel</div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-link-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.full_name || user.username}</div>
            <div className="sidebar-user-email">{user.email}</div>
          </div>
        </div>
        <button className="logout-btn" onClick={logout}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );
}
