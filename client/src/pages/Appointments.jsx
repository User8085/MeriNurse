import { useState, useEffect, useCallback } from 'react';
import { appointmentsAPI, accessAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiCalendar, FiClock, FiUser, FiPlus, FiX, FiCheck, FiXCircle,
  FiSearch, FiMessageSquare, FiAlertCircle, FiChevronDown
} from 'react-icons/fi';
import './Records.css';

const STATUS_COLORS = {
  pending:   { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: 'badge-amber' },
  confirmed: { bg: '#f0fdf4', border: '#86efac', text: '#14532d', badge: 'badge-emerald' },
  declined:  { bg: '#fdf2f2', border: '#f8b4b4', text: '#9b1c1c', badge: 'badge-rose' },
  cancelled: { bg: 'var(--bg-tertiary)', border: 'var(--border)', text: 'var(--text-muted)', badge: 'badge-secondary' },
};

const TABS = [
  { key: 'pending',   label: 'Pending',   emoji: '⏳' },
  { key: 'confirmed', label: 'Confirmed', emoji: '✅' },
  { key: 'declined',  label: 'Declined',  emoji: '❌' },
  { key: 'cancelled', label: 'Cancelled', emoji: '🚫' },
];

const TIME_SLOTS = [
  '08:00 AM','08:30 AM','09:00 AM','09:30 AM','10:00 AM','10:30 AM',
  '11:00 AM','11:30 AM','12:00 PM','12:30 PM','01:00 PM','01:30 PM',
  '02:00 PM','02:30 PM','03:00 PM','03:30 PM','04:00 PM','04:30 PM',
  '05:00 PM','05:30 PM','06:00 PM',
];

export default function Appointments() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  // Book modal state
  const [showModal, setShowModal] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorResults, setDoctorResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [form, setForm] = useState({ doctorId: '', selectedDoctor: null, date: '', time: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  // Doctor action modal (confirm/decline)
  const [actionModal, setActionModal] = useState(null); // { type: 'confirm'|'decline', appointment }
  const [actionForm, setActionForm] = useState({ confirmedDate: '', confirmedTime: '', doctorNote: '' });
  const [actioning, setActioning] = useState(false);

  const fetchAppointments = useCallback(async () => {
    try {
      const res = await appointmentsAPI.getAll({ status: activeTab });
      setAppointments(res.data.data || []);
    } catch { setAppointments([]); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchAppointments();
  }, [fetchAppointments]);

  // Search doctors with debounce
  useEffect(() => {
    if (!showModal || isDoctor) return;
    if (doctorSearch.trim().length < 1) { setDoctorResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await accessAPI.searchDoctors(doctorSearch);
        setDoctorResults(res.data.data || []);
      } catch { setDoctorResults([]); }
      finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [doctorSearch, showModal, isDoctor]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!form.doctorId || !form.date || !form.time || !form.reason.trim()) {
      alert('Please fill all fields and select a doctor.');
      return;
    }
    setSubmitting(true);
    try {
      await appointmentsAPI.create({
        doctorId: form.doctorId,
        requestedDate: form.date,
        requestedTime: form.time,
        reason: form.reason,
      });
      setShowModal(false);
      resetForm();
      setActiveTab('pending');
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to book appointment');
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm({ doctorId: '', selectedDoctor: null, date: '', time: '', reason: '' });
    setDoctorSearch('');
    setDoctorResults([]);
  };

  const openActionModal = (type, appt) => {
    setActionModal({ type, appointment: appt });
    setActionForm({
      confirmedDate: appt.requestedDate?.split('T')[0] || '',
      confirmedTime: appt.requestedTime || '',
      doctorNote: '',
    });
  };

  const handleAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;
    setActioning(true);
    try {
      if (actionModal.type === 'confirm') {
        await appointmentsAPI.confirm(actionModal.appointment._id, {
          confirmedDate: actionForm.confirmedDate,
          confirmedTime: actionForm.confirmedTime,
          doctorNote: actionForm.doctorNote,
        });
      } else {
        await appointmentsAPI.decline(actionModal.appointment._id, {
          doctorNote: actionForm.doctorNote,
        });
      }
      setActionModal(null);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed');
    } finally { setActioning(false); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await appointmentsAPI.cancel(id);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not cancel');
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const getDrName = (a) => a.doctor ? `Dr. ${a.doctor.firstName} ${a.doctor.lastName}` : '—';
  const getPtName = (a) => a.patient ? `${a.patient.firstName} ${a.patient.lastName}` : '—';

  const filtered = appointments; // already filtered by tab via API
  const tabCounts = {}; // for badge display (could be fetched separately — keeping simple)

  return (
    <div className="records-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            <FiCalendar style={{ marginRight: 8, verticalAlign: 'middle' }} />
            Appointments
          </h2>
          <p className="text-sm text-muted" style={{ marginTop: 2 }}>
            {isDoctor ? 'Manage patient appointment requests' : 'Book and track your appointments'}
          </p>
        </div>
        {!isDoctor && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus /> Book Appointment
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontWeight: activeTab === tab.key ? 700 : 500 }}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <FiCalendar className="empty-state-icon" style={{ fontSize: '3.5rem' }} />
          <p className="empty-state-title">No {activeTab} appointments</p>
          <p className="text-muted text-sm">
            {!isDoctor && activeTab === 'pending' ? 'Book an appointment with a doctor to get started.' : ''}
          </p>
          {!isDoctor && activeTab === 'pending' && (
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}>
              <FiPlus /> Book Appointment
            </button>
          )}
        </div>
      ) : (
        <div className="grid-2">
          {filtered.map(appt => {
            const colors = STATUS_COLORS[appt.status] || STATUS_COLORS.pending;
            const confirmedOrRequested = appt.status === 'confirmed'
              ? { date: appt.confirmedDate, time: appt.confirmedTime }
              : { date: appt.requestedDate, time: appt.requestedTime };

            return (
              <div key={appt._id} className="card" style={{
                border: `1.5px solid ${colors.border}`,
                background: colors.bg,
                padding: 0,
                overflow: 'hidden'
              }}>
                {/* Card header */}
                <div style={{
                  padding: '14px 18px',
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span className={`badge ${colors.badge}`} style={{ textTransform: 'capitalize' }}>
                    {appt.status}
                  </span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {/* Patient: cancel pending/confirmed */}
                    {!isDoctor && ['pending', 'confirmed'].includes(appt.status) && (
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: '#e02424', fontSize: '0.75rem' }}
                        onClick={() => handleCancel(appt._id)}
                      >
                        <FiXCircle size={13} /> Cancel
                      </button>
                    )}
                    {/* Doctor: confirm/decline on pending */}
                    {isDoctor && appt.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#10b981', color: '#fff', border: 'none', fontSize: '0.75rem' }}
                          onClick={() => openActionModal('confirm', appt)}
                        >
                          <FiCheck size={13} /> Confirm
                        </button>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#ef4444', color: '#fff', border: 'none', fontSize: '0.75rem' }}
                          onClick={() => openActionModal('decline', appt)}
                        >
                          <FiX size={13} /> Decline
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '16px 18px' }}>
                  {/* Person name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FiUser size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', color: colors.text }}>
                      {isDoctor ? getPtName(appt) : getDrName(appt)}
                    </span>
                    {!isDoctor && appt.doctor?.specialization && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        · {appt.doctor.specialization}
                      </span>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiCalendar size={13} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {fmtDate(confirmedOrRequested.date)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FiClock size={13} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                        {confirmedOrRequested.time}
                      </span>
                    </div>
                  </div>

                  {/* Reason */}
                  <div style={{
                    background: 'rgba(255,255,255,0.6)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    fontSize: '0.83rem',
                    color: 'var(--text-secondary)',
                    marginBottom: appt.doctorNote ? 8 : 0
                  }}>
                    <strong>Reason:</strong> {appt.reason}
                  </div>

                  {/* Doctor's note */}
                  {appt.doctorNote && (
                    <div style={{
                      background: 'rgba(255,255,255,0.6)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: '0.83rem',
                      color: colors.text,
                      display: 'flex',
                      gap: 8,
                      marginTop: 8
                    }}>
                      <FiMessageSquare size={13} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div><strong>Doctor's note:</strong> {appt.doctorNote}</div>
                    </div>
                  )}

                  {/* If confirmed but date was changed */}
                  {appt.status === 'confirmed' &&
                    appt.confirmedDate &&
                    appt.confirmedDate !== appt.requestedDate && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                      Originally requested: {fmtDate(appt.requestedDate)} {appt.requestedTime}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Book Appointment Modal (Patient) ─── */}
      {showModal && !isDoctor && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title"><FiCalendar /> Book Appointment</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>
            <form onSubmit={handleBook} style={{ padding: '0 4px 4px' }}>

              {/* Doctor search */}
              <div className="form-group">
                <label className="form-label">Search Doctor *</label>
                {form.selectedDoctor ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px', border: '1.5px solid var(--color-primary)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>Dr. {form.selectedDoctor.firstName} {form.selectedDoctor.lastName}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {form.selectedDoctor.specialization} · {form.selectedDoctor.email}
                      </div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, doctorId: '', selectedDoctor: null })}>
                      <FiX size={12} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ position: 'relative' }}>
                      <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        className="form-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Type doctor name or specialization..."
                        value={doctorSearch}
                        onChange={e => setDoctorSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {(searching || doctorResults.length > 0) && (
                      <div style={{
                        border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-elevated)', maxHeight: 180, overflowY: 'auto', marginTop: 4
                      }}>
                        {searching ? (
                          <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Searching...</div>
                        ) : doctorResults.length === 0 ? (
                          <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No doctors found</div>
                        ) : doctorResults.map(doc => (
                          <div
                            key={doc._id}
                            onClick={() => { setForm({ ...form, doctorId: doc._id, selectedDoctor: doc }); setDoctorSearch(''); setDoctorResults([]); }}
                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dr. {doc.firstName} {doc.lastName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{doc.specialization} · {doc.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {doctorSearch.length === 0 && (
                      <p className="text-sm text-muted" style={{ marginTop: 6 }}>
                        Start typing to search for a registered doctor
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Date & Time row */}
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label className="form-label">Preferred Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Preferred Time *</label>
                  <select
                    className="form-input"
                    value={form.time}
                    onChange={e => setForm({ ...form, time: e.target.value })}
                    required
                  >
                    <option value="">Select time slot</option>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div className="form-group">
                <label className="form-label">Reason for Visit *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Briefly describe your symptoms or reason for the appointment..."
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  maxLength={500}
                  required
                />
                <span className="text-sm text-muted" style={{ float: 'right' }}>{form.reason.length}/500</span>
              </div>

              {/* Info note */}
              <div style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)',
                padding: '10px 14px', marginBottom: 20, fontSize: '0.82rem', color: 'var(--text-secondary)'
              }}>
                <FiAlertCircle size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--primary-400)' }} />
                <span>Your request will be sent to the doctor. Once confirmed, it will appear on your dashboard. The doctor may adjust the date/time if needed.</span>
              </div>

              <div className="flex gap-md" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Doctor Confirm / Decline Modal ─── */}
      {actionModal && (
        <div className="modal-overlay" onClick={() => setActionModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: actionModal.type === 'confirm' ? '#10b981' : '#ef4444' }}>
                {actionModal.type === 'confirm' ? <><FiCheck /> Confirm Appointment</> : <><FiXCircle /> Decline Appointment</>}
              </h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setActionModal(null)}><FiX /></button>
            </div>
            <div style={{ padding: '0 4px 4px' }}>
              {/* Appointment summary */}
              <div style={{
                background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)',
                padding: '12px 16px', marginBottom: 18, fontSize: '0.875rem'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{getPtName(actionModal.appointment)}</div>
                <div style={{ color: 'var(--text-muted)' }}>
                  Requested: {fmtDate(actionModal.appointment.requestedDate)} at {actionModal.appointment.requestedTime}
                </div>
                <div style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  Reason: {actionModal.appointment.reason}
                </div>
              </div>

              <form onSubmit={handleAction}>
                {/* Confirm: allow adjusting slot */}
                {actionModal.type === 'confirm' && (
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    <div className="form-group">
                      <label className="form-label">Confirmed Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={actionForm.confirmedDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setActionForm({ ...actionForm, confirmedDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirmed Time</label>
                      <select
                        className="form-input"
                        value={actionForm.confirmedTime}
                        onChange={e => setActionForm({ ...actionForm, confirmedTime: e.target.value })}
                      >
                        <option value="">Keep requested</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    {actionModal.type === 'confirm' ? 'Note for Patient (optional)' : 'Reason for Declining (optional)'}
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder={actionModal.type === 'confirm'
                      ? 'E.g. Please bring your previous reports...'
                      : 'E.g. I am unavailable on this date, please rebook...'}
                    value={actionForm.doctorNote}
                    onChange={e => setActionForm({ ...actionForm, doctorNote: e.target.value })}
                    maxLength={500}
                  />
                </div>

                <div className="flex gap-md" style={{ justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
                  <button
                    type="submit"
                    className="btn"
                    disabled={actioning}
                    style={{
                      background: actionModal.type === 'confirm' ? '#10b981' : '#ef4444',
                      color: '#fff', border: 'none'
                    }}
                  >
                    {actioning ? 'Saving...' : actionModal.type === 'confirm' ? 'Confirm Appointment' : 'Decline Appointment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
