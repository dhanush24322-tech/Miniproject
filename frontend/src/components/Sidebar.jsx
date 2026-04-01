import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Database, 
  Cpu, 
  History, 
  LogOut,
  User as UserIcon
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const organizerLinks = [
    { to: '/organizer', icon: LayoutDashboard, label: 'Overview' },
    { to: '/organizer/datasets', icon: Database, label: 'Datasets' },
    { to: '/organizer/training', icon: Cpu, label: 'AI Models' },
  ];

  const doctorLinks = [
    { to: '/doctor', icon: LayoutDashboard, label: 'Diagnostics' },
    { to: '/doctor/history', icon: History, label: 'History' },
  ];

  const links = user?.role === 'organizer' ? organizerLinks : doctorLinks;

  return (
    <aside className="sidebar glass-card">
      <div className="sidebar-header">
        <div className="sidebar-logo">👁️</div>
        <div className="sidebar-brand">DR Detect</div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? 'active' : ''}`}
          >
            <link.icon className="nav-icon" size={20} />
            <span>{link.label}</span>
          </Link>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar flex-center">
            <UserIcon size={18} />
          </div>
          <div className="user-details">
            <div className="user-name">{user?.username}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        <button onClick={logout} className="logout-btn w-full flex-center">
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
