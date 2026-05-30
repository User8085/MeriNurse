import { useState, useEffect } from 'react';
import { accessAPI, prescriptionsAPI } from '../services/api';
import { FiUsers, FiFileText, FiSearch, FiX, FiDroplet, FiHash, FiPlus, FiClipboard } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);

  // Prescription modal state
  const [showRxModal, setShowRxModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [rxForm, setRxForm] = useState({
    doctorName: '',
    diagnosis: '',
    notes: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '' }]
  });
  const [rxFile, setRxFile] = useState(null);
  const [rxSubmitting, setRxSubmitting] = useState(false);

  // Load all patients on mount
  useEffect(() => {
    fetchAllPatients();
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim()) {
        searchPatients(search.trim());
      } else {
        fetchAllPatients();
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchAllPatients = async () => {
    try {
      setSearching(true);
      const res = await accessAPI.getAllPatients();
      setPatients(res.data.data || []);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
      setSearching(false);
    }
  };

  const searchPatients = async (q) => {
    try {
      setSearching(true);
      const res = await accessAPI.getAllPatients(q);
      setPatients(res.data.data || []);
    } catch {
      fetchAllPatients();
    } finally {
      setSearching(false);
    }
  };

  const openRxModal = (patient) => {
    setSelectedPatient(patient);
    setRxForm({ doctorName: '', diagnosis: '', notes: '', medications: [{ name: '', dosage: '', frequency: '', duration: '' }] });
    setRxFile(null);
    setShowRxModal(true);
  };

  const closeRxModal = () => {
    setShowRxModal(false);
    setSelectedPatient(null);
  };

  const addMedication = () => {
    setRxForm({ ...rxForm, medications: [...rxForm.medications, { name: '', dosage: '', frequency: '', duration: '' }] });
  };

  const updateMed = (index, field, value) => {
    const updated = [...rxForm.medications];
    updated[index][field] = value;
    setRxForm({ ...rxForm, medications: updated });
  };

  const removeMed = (index) => {
    if (rxForm.medications.length <= 1) return;
    setRxForm({ ...rxForm, medications: rxForm.medications.filter((_, i) => i !== index) });
  };

  const handleRxSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setRxSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('patientId', selectedPatient._id);
      formData.append('doctorName', rxForm.doctorName);
      formData.append('diagnosis', rxForm.diagnosis);
      formData.append('notes', rxForm.notes);
      formData.append('medications', JSON.stringify(rxForm.medications.filter(m => m.name)));
      if (rxFile) formData.append('file', rxFile);
      await prescriptionsAPI.create(formData);
      closeRxModal();
      alert(`Prescription added successfully for ${selectedPatient.firstName} ${selectedPatient.lastName}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add prescription');
    } finally {
      setRxSubmitting(false);
    }
  };

  const getInitials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();

  const avatarColors = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #0ea5e9, #38bdf8)',
    'linear-gradient(135deg, #10b981, #34d399)',
    'linear-gradient(135deg, #f59e0b, #fbbf24)',
    'linear-gradient(135deg, #ef4444, #f87171)',
  ];

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div style={{ padding: '28px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>My Patients</h2>
        <span className="badge badge-primary" style={{ fontSize: '0.8rem' }}>
          {patients.length} patient{patients.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search Box */}
      <div style={{ position: 'relative', marginBottom: 24 }}>
        <FiSearch style={{
          position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none', zIndex: 1
        }} />
        <input
          className="form-input"
          style={{ paddingLeft: 40, paddingRight: search ? 40 : 14 }}
          placeholder="Search by name, email, or blood group..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
              display: 'flex', alignItems: 'center'
            }}
          >
            <FiX />
          </button>
        )}
      </div>

      {searching && (
        <div style={{ textAlign: 'center', padding: 12, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Searching...
        </div>
      )}

      {!searching && patients.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: 20 }}>
          {patients.map((p, idx) => {
            const color = avatarColors[idx % avatarColors.length];
            return (
              <div key={p._id} className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Avatar + Name */}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 'var(--radius-full)',
                      background: color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', fontWeight: 700,
                      fontSize: '1.125rem', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                    }}>
                      {getInitials(p.firstName, p.lastName)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>
                        {p.firstName} {p.lastName}
                      </h3>
                      <p className="text-sm text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.email}
                      </p>
                    </div>
                  </div>

                  {/* Patient Info */}
                  {(p.bloodGroup || p.gender || p.dateOfBirth) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {p.bloodGroup && (
                        <span className="badge badge-rose" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FiDroplet size={11} /> {p.bloodGroup}
                        </span>
                      )}
                      {p.gender && (
                        <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                          {p.gender}
                        </span>
                      )}
                      {p.dateOfBirth && (
                        <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                          DOB: {new Date(p.dateOfBirth).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Unique Patient ID */}
                  <div style={{
                    background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)',
                    padding: '6px 10px', fontSize: '0.7rem', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'monospace',
                    overflow: 'hidden'
                  }}>
                    <FiHash size={10} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p._id}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                    <Link
                      to={`/records?patientId=${p._id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <FiFileText size={14} /> View Records
                    </Link>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => openRxModal(p)}
                    >
                      <FiPlus size={14} /> Add Prescription
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : !searching ? (
        <div className="empty-state">
          <FiUsers style={{ fontSize: '4rem' }} className="empty-state-icon" />
          <p className="empty-state-title">
            {search ? 'No patients found' : 'No patients registered'}
          </p>
          <p className="text-muted">
            {search
              ? `No results for "${search}". Try a different name or email.`
              : 'No patients are registered on the portal yet.'}
          </p>
        </div>
      ) : null}

      {/* Add Prescription Modal */}
      {showRxModal && selectedPatient && (
        <div className="modal-overlay" onClick={closeRxModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add Prescription</h2>
                <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                  Patient: <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
                </p>
              </div>
              <button className="btn btn-icon btn-ghost" onClick={closeRxModal}><FiX /></button>
            </div>
            <form onSubmit={handleRxSubmit}>
              <div className="form-row" style={{ marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Doctor Name</label>
                  <input className="form-input" value={rxForm.doctorName} onChange={(e) => setRxForm({ ...rxForm, doctorName: e.target.value })} placeholder="Dr. Smith" />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Diagnosis</label>
                  <input className="form-input" value={rxForm.diagnosis} onChange={(e) => setRxForm({ ...rxForm, diagnosis: e.target.value })} placeholder="e.g. Hypertension" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Medications</label>
                {rxForm.medications.map((med, i) => (
                  <div key={i} style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input className="form-input" placeholder="Drug name *" value={med.name} onChange={(e) => updateMed(i, 'name', e.target.value)} style={{ flex: 2 }} />
                      <input className="form-input" placeholder="Dosage" value={med.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} style={{ flex: 1 }} />
                      {rxForm.medications.length > 1 && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMed(i)}><FiX /></button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" placeholder="Frequency (e.g. Twice daily)" value={med.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)} />
                      <input className="form-input" placeholder="Duration (e.g. 7 days)" value={med.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={addMedication}><FiPlus /> Add Medication</button>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-input" value={rxForm.notes} onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })} placeholder="Additional notes or instructions..." />
              </div>

              <div className="form-group">
                <label className="form-label">Upload Prescription Image (optional)</label>
                <div className="file-upload-zone">
                  <p>Click to upload prescription image</p>
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setRxFile(e.target.files[0])} />
                </div>
                {rxFile && <p className="text-sm text-muted" style={{ marginTop: 6 }}>📎 {rxFile.name}</p>}
              </div>

              <div className="flex gap-md" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={closeRxModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={rxSubmitting}>
                  <FiClipboard size={14} /> {rxSubmitting ? 'Saving...' : 'Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
