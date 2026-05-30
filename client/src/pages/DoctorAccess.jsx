import { useState, useEffect } from 'react';
import { accessAPI } from '../services/api';
import { FiPlus, FiUsers, FiTrash2, FiX, FiShield, FiSearch } from 'react-icons/fi';

export default function DoctorAccess() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [form, setForm] = useState({ doctorEmail: '', accessLevel: 'view', grantedCategories: ['all'] });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const res = await accessAPI.getMyDoctors(); setDoctors(res.data.data || []); }
    catch { } finally { setLoading(false); }
  };

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try { const res = await accessAPI.searchDoctors(q); setSearchResults(res.data.data || []); }
    catch { }
  };

  const handleGrant = async (e) => {
    e.preventDefault();
    try {
      await accessAPI.grantAccess(form);
      setShowModal(false);
      setForm({ doctorEmail: '', accessLevel: 'view', grantedCategories: ['all'] });
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to grant access'); }
  };

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this doctor\'s access?')) return;
    try { await accessAPI.revokeAccess(id); fetchData(); } catch { }
  };

  const accessLabels = { view: 'View Only', 'view-upload': 'View & Upload', full: 'Full Access' };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '28px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Doctor Access</h2>
          <p className="text-muted text-sm">Control which doctors can view your medical records</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Grant Access</button>
      </div>

      {doctors.length > 0 ? (
        <div className="grid-2">
          {doctors.map(a => (
            <div key={a._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className={`badge ${a.isActive ? 'badge-emerald' : 'badge-rose'}`}>{a.isActive ? 'Active' : 'Revoked'}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => handleRevoke(a._id)}><FiTrash2 size={14} /></button>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--teal-600), var(--teal-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                  {a.doctor?.firstName?.[0]}{a.doctor?.lastName?.[0]}
                </div>
                <div>
                  <h3 style={{ fontWeight: 700 }}>Dr. {a.doctor?.firstName} {a.doctor?.lastName}</h3>
                  <p className="text-sm text-muted">{a.doctor?.specialization || 'General'} • {a.doctor?.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="badge badge-primary"><FiShield size={10} /> {accessLabels[a.accessLevel]}</span>
              </div>
              <p className="text-sm text-muted">Granted: {new Date(a.grantedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiUsers style={{ fontSize: '4rem' }} className="empty-state-icon" />
          <p className="empty-state-title">No doctors connected</p>
          <p className="text-muted">Grant access to a doctor so they can view your records</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Grant Doctor Access</h2><button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}><FiX /></button></div>
            <form onSubmit={handleGrant}>
              <div className="form-group">
                <label className="form-label">Search Doctor</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-input" placeholder="Search by name or specialization" value={search} onChange={(e) => handleSearch(e.target.value)} />
                  {searchResults.length > 0 && (
                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', marginTop: 4, zIndex: 10, maxHeight: 200, overflowY: 'auto' }}>
                      {searchResults.map(d => (
                        <div key={d._id} style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '0.875rem', borderBottom: '1px solid var(--border-subtle)' }}
                          onClick={() => { setForm({ ...form, doctorEmail: d.email }); setSearch(`Dr. ${d.firstName} ${d.lastName}`); setSearchResults([]); }}>
                          <strong>Dr. {d.firstName} {d.lastName}</strong> — {d.specialization || 'General'}<br />
                          <span className="text-muted">{d.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Doctor Email *</label>
                <input className="form-input" type="email" value={form.doctorEmail} onChange={(e) => setForm({ ...form, doctorEmail: e.target.value })} required placeholder="doctor@hospital.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Access Level</label>
                <select className="form-select" value={form.accessLevel} onChange={(e) => setForm({ ...form, accessLevel: e.target.value })}>
                  <option value="view">View Only</option>
                  <option value="view-upload">View & Upload</option>
                  <option value="full">Full Access</option>
                </select>
              </div>
              <div className="flex gap-md" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Grant Access</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
