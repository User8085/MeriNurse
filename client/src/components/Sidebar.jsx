import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiHome, FiFileText, FiClipboard, FiMessageSquare,
  FiAlertTriangle, FiUsers, FiSearch, FiSettings, FiX, FiCalendar
} from 'react-icons/fi';
import './Sidebar.css';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const patientLinks = [
    { to: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/appointments', icon: <FiCalendar />, label: 'Appointments' },
    { to: '/records', icon: <FiFileText />, label: 'Medical Records' },
    { to: '/prescriptions', icon: <FiClipboard />, label: 'Prescriptions' },
    { to: '/allergies', icon: <FiAlertTriangle />, label: 'Allergies' },
    { to: '/chat', icon: <FiMessageSquare />, label: 'AI Assistant' },
    { to: '/drugs', icon: <FiSearch />, label: 'Drug Info' },
    { to: '/access', icon: <FiUsers />, label: 'Doctor Access' },
    { to: '/profile', icon: <FiSettings />, label: 'Profile' },
  ];

  const doctorLinks = [
    { to: '/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/appointments', icon: <FiCalendar />, label: 'Appointments' },
    { to: '/patients', icon: <FiUsers />, label: 'My Patients' },
    { to: '/records', icon: <FiFileText />, label: 'Patient Records' },
    { to: '/prescriptions', icon: <FiClipboard />, label: 'Prescriptions' },
    { to: '/chat', icon: <FiMessageSquare />, label: 'AI Assistant' },
    { to: '/drugs', icon: <FiSearch />, label: 'Drug Info' },
    { to: '/profile', icon: <FiSettings />, label: 'Profile' },
  ];

  const links = isDoctor ? doctorLinks : patientLinks;

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-close-btn-wrap">
          <button className="btn-icon btn-ghost" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              onClick={onClose}
            >
              <span className="sidebar-link-icon">{link.icon}</span>
              <span className="sidebar-link-label">{link.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-badge">
            <span className="sidebar-footer-dot" />
            <span className="text-sm text-muted">HIPAA Compliant</span>
          </div>
        </div>
      </aside>
    </>
  );
}
