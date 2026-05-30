import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { recordsAPI, prescriptionsAPI, allergiesAPI, accessAPI, chatAPI, appointmentsAPI } from '../services/api';
import {
  FiFileText, FiClipboard, FiAlertTriangle, FiMessageSquare,
  FiUsers, FiPlus, FiArrowRight, FiActivity, FiShield, FiClock,
  FiCalendar, FiCheck
} from 'react-icons/fi';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    records: 0, prescriptions: 0, allergies: 0, conversations: 0, doctors: 0, patients: 0
  });
  const [recentRecords, setRecentRecords] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [recordsRes, prescRes] = await Promise.all([
        recordsAPI.getAll({ limit: 5 }),
        prescriptionsAPI.getAll({ active: 'true' })
      ]);

      const newStats = {
        records: recordsRes.data.pagination?.total || 0,
        prescriptions: prescRes.data.data?.length || 0,
      };

      try {
        const allergyRes = await allergiesAPI.getAll();
        newStats.allergies = allergyRes.data.data?.length || 0;
      } catch { newStats.allergies = 0; }

      try {
        const chatRes = await chatAPI.getConversations();
        newStats.conversations = chatRes.data.data?.length || 0;
      } catch { newStats.conversations = 0; }

      if (user.role === 'patient') {
        try {
          const accessRes = await accessAPI.getMyDoctors();
          newStats.doctors = accessRes.data.data?.length || 0;
        } catch { newStats.doctors = 0; }
      } else {
        try {
          const patientsRes = await accessAPI.getMyPatients();
          newStats.patients = patientsRes.data.data?.length || 0;
        } catch { newStats.patients = 0; }
      }

      // Upcoming confirmed appointments (next 2)
      try {
        const apptRes = await appointmentsAPI.getAll({ upcoming: 'true' });
        setUpcomingAppointments((apptRes.data.data || []).slice(0, 3));
      } catch { setUpcomingAppointments([]); }

      setStats(newStats);
      setRecentRecords(recordsRes.data.data?.slice(0, 5) || []);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (cat) => {
    const labels = {
      'lab-report': 'Lab Report', 'prescription': 'Prescription', 'imaging': 'Imaging',
      'vaccination': 'Vaccination', 'surgery': 'Surgery', 'consultation': 'Consultation',
      'discharge-summary': 'Discharge', 'insurance': 'Insurance', 'other': 'Other'
    };
    return labels[cat] || cat;
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  if (loading) {
    return <div className="loading-page"><div className="spinner" /><p className="text-muted">Loading dashboard...</p></div>;
  }

  const isDoctor = user.role === 'doctor';

  return (
    <div className="dashboard">
      {/* Welcome Section */}
      <div className="dash-welcome">
        <div className="dash-welcome-text">
          <h2 className="dash-welcome-title">
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user.firstName}! 👋
          </h2>
          <p className="text-secondary">
            {isDoctor ? 'Here\'s an overview of your patients and records' : 'Here\'s your health records overview'}
          </p>
        </div>
        <div className="dash-welcome-actions">
          <Link to="/records" className="btn btn-primary">
            <FiPlus /> {isDoctor ? 'View Records' : 'Add Record'}
          </Link>
          <Link to="/appointments" className="btn btn-teal">
            <FiCalendar /> Appointments
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dash-stats">
        <div className="stat-card">
          <div className="stat-icon purple"><FiFileText /></div>
          <div>
            <div className="stat-value">{stats.records}</div>
            <div className="stat-label">Medical Records</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal"><FiClipboard /></div>
          <div>
            <div className="stat-value">{stats.prescriptions}</div>
            <div className="stat-label">Active Prescriptions</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon rose"><FiAlertTriangle /></div>
          <div>
            <div className="stat-value">{stats.allergies}</div>
            <div className="stat-label">Known Allergies</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber"><FiCalendar /></div>
          <div>
            <div className="stat-value">{upcomingAppointments.length}</div>
            <div className="stat-label">Upcoming Appointments</div>
          </div>
        </div>
        {isDoctor ? (
          <div className="stat-card">
            <div className="stat-icon emerald"><FiUsers /></div>
            <div>
              <div className="stat-value">{stats.patients}</div>
              <div className="stat-label">Active Patients</div>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-icon emerald"><FiUsers /></div>
            <div>
              <div className="stat-value">{stats.doctors}</div>
              <div className="stat-label">Connected Doctors</div>
            </div>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="dash-grid">
        {/* Recent Records */}
        <div className="card dash-section">
          <div className="dash-section-header">
            <h3><FiClock /> Recent Records</h3>
            <Link to="/records" className="btn btn-ghost btn-sm">
              View All <FiArrowRight />
            </Link>
          </div>
          {recentRecords.length > 0 ? (
            <div className="dash-record-list">
              {recentRecords.map(record => (
                <div key={record._id} className="dash-record-item">
                  <div className="dash-record-info">
                    <span className="dash-record-title">{record.title}</span>
                    <span className="text-sm text-muted">
                      {new Date(record.recordDate).toLocaleDateString()} • {getCategoryLabel(record.category)}
                    </span>
                  </div>
                  <span className={`badge badge-${record.category === 'prescription' ? 'teal' : 'primary'}`}>
                    {getCategoryLabel(record.category)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <FiFileText className="empty-state-icon" />
              <p className="empty-state-title">No records yet</p>
              <p className="text-muted text-sm">Upload your first medical record to get started</p>
            </div>
          )}
        </div>

        {/* Right column: Upcoming Appointments + Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upcoming Appointments */}
          <div className="card dash-section">
            <div className="dash-section-header">
              <h3><FiCalendar /> Upcoming Appointments</h3>
              <Link to="/appointments" className="btn btn-ghost btn-sm">
                View All <FiArrowRight />
              </Link>
            </div>
            {upcomingAppointments.length > 0 ? (
              <div style={{ padding: '8px 0' }}>
                {upcomingAppointments.map(appt => (
                  <div key={appt._id} className="dash-record-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {isDoctor
                          ? `${appt.patient?.firstName} ${appt.patient?.lastName}`
                          : `Dr. ${appt.doctor?.firstName} ${appt.doctor?.lastName}`}
                      </span>
                      <span className="badge badge-emerald" style={{ fontSize: '0.7rem' }}>
                        <FiCheck size={10} style={{ marginRight: 3 }} />Confirmed
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span><FiCalendar size={11} style={{ marginRight: 3 }} />{fmtDate(appt.confirmedDate)}</span>
                      <span><FiClock size={11} style={{ marginRight: 3 }} />{appt.confirmedTime}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {appt.reason?.substring(0, 60)}{appt.reason?.length > 60 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '24px 20px' }}>
                <FiCalendar className="empty-state-icon" style={{ fontSize: '2.5rem' }} />
                <p className="empty-state-title" style={{ fontSize: '0.9rem' }}>No upcoming appointments</p>
                {!isDoctor && (
                  <Link to="/appointments" className="btn btn-primary btn-sm" style={{ marginTop: 10, fontSize: '0.8rem' }}>
                    <FiPlus /> Book Now
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card dash-section">
            <div className="dash-section-header">
              <h3><FiActivity /> Quick Actions</h3>
            </div>
            <div className="dash-quick-actions">
              <Link to="/records" className="quick-action-card">
                <div className="quick-action-icon purple"><FiFileText /></div>
                <span>Upload Record</span>
              </Link>
              <Link to="/chat" className="quick-action-card">
                <div className="quick-action-icon teal"><FiMessageSquare /></div>
                <span>Ask AI</span>
              </Link>
              <Link to="/appointments" className="quick-action-card">
                <div className="quick-action-icon amber"><FiCalendar /></div>
                <span>Appointments</span>
              </Link>
              <Link to="/drugs" className="quick-action-card">
                <div className="quick-action-icon emerald"><FiShield /></div>
                <span>Drug Info</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
