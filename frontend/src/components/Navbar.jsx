import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, FileText, Briefcase, BarChart3, Brain, Map, User, Swords, LogOut, Zap } from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/resume', icon: FileText, label: 'Resume' },
    { to: '/jd', icon: Briefcase, label: 'JD' },
    { to: '/analysis', icon: BarChart3, label: 'Analysis' },
    { to: '/assessment', icon: Brain, label: 'Assessment' },
    { to: '/roadmap', icon: Map, label: 'Roadmap' },
    { to: '/mock-interview', icon: Swords, label: 'Interview' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand" onClick={() => navigate('/dashboard')}>
          <div className="brand-icon"><Zap size={20} /></div>
          <span className="brand-text">SkillForge</span>
          <span className="brand-ai">AI</span>
        </div>
        <div className="navbar-links">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
        <div className="navbar-user">
          <div className="user-avatar" style={{ background: user?.avatarColor || 'var(--indigo)' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <button className="btn-ghost btn-sm" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </nav>
  );
}
