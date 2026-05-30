import { useState, useEffect } from 'react';
import { allergiesAPI } from '../services/api';
import { FiPlus, FiAlertTriangle, FiTrash2, FiEdit2, FiX } from 'react-icons/fi';

export default function Allergies() {
  const [allergies, setAllergies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ allergen: '', type: 'drug', severity: 'moderate', reaction: '', notes: '' });
  const [editId, setEditId] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try { const res = await allergiesAPI.getAll(); setAllergies(res.data.data || []); }
    catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await allergiesAPI.update(editId, form); }
      else { await allergiesAPI.create(form); }
      setShowModal(false);
      setForm({ allergen: '', type: 'drug', severity: 'moderate', reaction: '', notes: '' });
      setEditId(null);
      fetchData();
    } catch (err) { alert('Failed to save'); }
  };

  const handleEdit = (a) => {
    setForm({ allergen: a.allergen, type: a.type, severity: a.severity, reaction: a.reaction || '', notes: a.notes || '' });
    setEditId(a._id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this allergy?')) return;
    try { await allergiesAPI.delete(id); fetchData(); } catch { }
  };

  const severityColors = { mild: 'amber', moderate: 'primary', severe: 'rose', 'life-threatening': 'rose' };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '28px 0' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Allergies</h2>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ allergen: '', type: 'drug', severity: 'moderate', reaction: '', notes: '' }); setShowModal(true); }}>
          <FiPlus /> Add Allergy
        </button>
      </div>

      {allergies.length > 0 ? (
        <div className="grid-3">
          {allergies.map(a => (
            <div key={a._id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`badge badge-${severityColors[a.severity] || 'primary'}`}>{a.severity}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(a)}><FiEdit2 size={14} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a._id)}><FiTrash2 size={14} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>{a.allergen}</h3>
              <span className="badge badge-primary" style={{ width: 'fit-content' }}>{a.type}</span>
              {a.reaction && <p className="text-sm text-secondary">{a.reaction}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiAlertTriangle style={{ fontSize: '4rem' }} className="empty-state-icon" />
          <p className="empty-state-title">No allergies recorded</p>
          <p className="text-muted">Track your allergies for better health management</p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">{editId ? 'Edit' : 'Add'} Allergy</h2><button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}><FiX /></button></div>
            <form onSubmit={handleSubmit}>
              <div className="form-group"><label className="form-label">Allergen *</label><input className="form-input" value={form.allergen} onChange={(e) => setForm({ ...form, allergen: e.target.value })} required placeholder="e.g., Penicillin" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Type *</label>
                  <select className="form-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="drug">Drug</option><option value="food">Food</option><option value="environmental">Environmental</option><option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Severity *</label>
                  <select className="form-select" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                    <option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option><option value="life-threatening">Life-threatening</option>
                  </select>
                </div>
              </div>
              <div className="form-group"><label className="form-label">Reaction</label><input className="form-input" value={form.reaction} onChange={(e) => setForm({ ...form, reaction: e.target.value })} placeholder="Describe the reaction" /></div>
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="flex gap-md" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update' : 'Add'} Allergy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
