import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMenu, FiLogOut, FiHeart } from 'react-icons/fi';
import './Navbar.css';

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/records') return 'Medical Records';
    if (path === '/prescriptions') return 'Prescriptions';
    if (path === '/chat') return 'AI Health Assistant';
    if (path === '/allergies') return 'Allergies';
    if (path === '/access') return 'Doctor Access';
    if (path === '/patients') return 'My Patients';
    if (path === '/drugs') return 'Drug Information';
    if (path === '/profile') return 'Profile';
    return 'MeriNurse';
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        <button className="btn-icon btn-ghost nav-menu-btn" onClick={onToggleSidebar}>
          <FiMenu size={20} />
        </button>
        <div className="nav-brand">
          <div className="nav-logo">
            <FiHeart size={18} />
          </div>
          <span className="nav-brand-text hide-mobile">Meri<span>Nurse</span></span>
        </div>
        <div className="nav-divider hide-mobile" />
        <h1 className="nav-page-title">{getPageTitle()}</h1>
      </div>

      <div className="navbar-right">
        <Link to="/profile" className="nav-user-info">
          <div className="nav-avatar">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="nav-user-details hide-mobile">
            <span className="nav-user-name">{user?.firstName} {user?.lastName}</span>
            <span className="nav-user-role">{user?.role === 'doctor' ? '🩺 Doctor' : '🧑 Patient'}</span>
          </div>
        </Link>
        <button className="btn-icon btn-ghost" onClick={logout} title="Logout">
          <FiLogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
