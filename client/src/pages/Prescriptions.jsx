import { useState, useEffect } from 'react';
import { prescriptionsAPI, accessAPI, drugAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FiPlus, FiClipboard, FiAlertCircle, FiX, FiTrash2, FiUser,
  FiSearch, FiAlertTriangle, FiUpload, FiEdit3, FiCpu, FiInfo
} from 'react-icons/fi';
import './Records.css';

// ─── Source badge helper ───────────────────────────────────────
function SourceBadge({ p }) {
  if (p.prescribedBy || p.doctorName) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
        borderRadius: 12, background: 'rgba(20,184,166,0.12)', color: 'var(--teal-400)'
      }}>
        <FiUser size={10} /> Doctor-prescribed
      </span>
    );
  }
  if (p.aiExtraction?.rawText) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
        borderRadius: 12, background: 'rgba(99,102,241,0.12)', color: 'var(--primary-400)'
      }}>
        <FiCpu size={10} /> AI-extracted
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
      borderRadius: 12, background: 'rgba(245,158,11,0.12)', color: 'var(--amber-400)'
    }}>
      <FiEdit3 size={10} /> Self-entered
    </span>
  );
}

export default function Prescriptions() {
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor';

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeMedIndex, setActiveMedIndex] = useState(null);

  // Patient entry mode: 'manual' | 'upload'
  const [entryMode, setEntryMode] = useState('manual');
  const [extracting, setExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);

  // All patients list (for doctor to select a patient)
  const [allPatients, setAllPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientSearching, setPatientSearching] = useState(false);

  const [form, setForm] = useState({
    patientId: '',
    doctorName: '',
    diagnosis: '',
    notes: '',
    medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  // Load all patients for doctor
  useEffect(() => {
    if (isDoctor && showModal) {
      fetchAllPatients('');
    }
  }, [isDoctor, showModal]);

  // Debounce patient search in modal
  useEffect(() => {
    if (!isDoctor || !showModal) return;
    const timer = setTimeout(() => {
      fetchAllPatients(patientSearch.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  const fetchAllPatients = async (q) => {
    try {
      setPatientSearching(true);
      const res = await accessAPI.getAllPatients(q || undefined);
      setAllPatients(res.data.data || []);
    } catch {
      setAllPatients([]);
    } finally {
      setPatientSearching(false);
    }
  };

  const fetchData = async () => {
    try {
      const res = await prescriptionsAPI.getAll();
      setPrescriptions(res.data.data || []);
    } catch { } finally { setLoading(false); }
  };

  const addMedication = () => {
    setForm({ ...form, medications: [...form.medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }] });
  };

  const updateMed = (index, field, value) => {
    const updated = [...form.medications];
    updated[index][field] = value;
    setForm({ ...form, medications: updated });
  };

  const removeMed = (index) => {
    if (form.medications.length <= 1) return;
    setForm({ ...form, medications: form.medications.filter((_, i) => i !== index) });
  };

  const handleMedNameChange = async (index, value) => {
    updateMed(index, 'name', value);
    if (value.trim().length >= 2) {
      try {
        const res = await drugAPI.suggest(value);
        if (res.data.success) {
          setSuggestions(res.data.data || []);
          setActiveMedIndex(index);
        }
      } catch (err) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setActiveMedIndex(null);
    }
  };

  const selectSuggestion = (index, value) => {
    updateMed(index, 'name', value);
    setSuggestions([]);
    setActiveMedIndex(null);
  };

  // Handle file upload + AI extraction for patient upload mode
  const handleFileUpload = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setExtractionResult(null);

    if (f.type.startsWith('image/')) {
      setExtracting(true);
      try {
        // Send the file to the prescription endpoint with just the file
        // so the server runs AI extraction and returns the rawText
        const formData = new FormData();
        formData.append('file', f);
        formData.append('medications', JSON.stringify([]));
        const res = await prescriptionsAPI.create(formData);

        // If server returned the prescription (auto-created), show extraction
        if (res.data.success && res.data.data?.aiExtraction?.rawText) {
          setExtractionResult(res.data.data.aiExtraction.rawText);
          // Auto-close and refresh — prescription was saved by the server
          setShowModal(false);
          resetForm();
          fetchData();
          alert('✅ Prescription uploaded and saved! AI has extracted the details — review it in your list.');
        } else {
          // No AI extraction available — just keep the file selected, submit manually
          setExtractionResult('(AI extraction not available for this file type — fill in details manually)');
        }
      } catch (err) {
        console.error('AI extraction error:', err);
        setExtractionResult('(AI extraction failed — you can still save with manual details)');
      } finally {
        setExtracting(false);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDoctor && !form.patientId) {
      alert('Please select a patient to prescribe to.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (isDoctor && form.patientId) formData.append('patientId', form.patientId);
      formData.append('doctorName', form.doctorName);
      formData.append('diagnosis', form.diagnosis);
      formData.append('notes', form.notes);
      formData.append('medications', JSON.stringify(form.medications.filter(m => m.name)));
      if (file) formData.append('file', file);
      await prescriptionsAPI.create(formData);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (err) { alert(err.response?.data?.message || 'Failed to save prescription'); }
    finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setForm({ patientId: '', doctorName: '', diagnosis: '', notes: '', medications: [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }] });
    setFile(null);
    setPatientSearch('');
    setAllPatients([]);
    setEntryMode('manual');
    setExtractionResult(null);
    setExtracting(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this prescription?')) return;
    try { await prescriptionsAPI.delete(id); fetchData(); } catch { alert('Failed'); }
  };

  const getPatientName = (p) => {
    if (!p) return '—';
    if (p.firstName || p.lastName) return `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return p.email || '—';
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="records-page">
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Prescriptions</h2>
          <p className="text-sm text-muted" style={{ marginTop: 2 }}>
            {isDoctor
              ? 'Create and manage prescriptions for your patients'
              : 'Track your medications — enter manually or upload a prescription photo for AI extraction'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><FiPlus /> Add Prescription</button>
      </div>

      {/* Info banner for patients */}
      {!isDoctor && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-start',
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 20,
          fontSize: '0.85rem', color: 'var(--text-secondary)'
        }}>
          <FiInfo size={16} style={{ flexShrink: 0, marginTop: 1, color: 'var(--primary-400)' }} />
          <span>
            <strong>How to add a prescription:</strong> You can type your medications manually, or
            <strong> upload a photo</strong> of your paper prescription — our AI will read and save the details automatically.
          </span>
        </div>
      )}

      {prescriptions.length > 0 ? (
        <div className="grid-2">
          {prescriptions.map(p => (
            <div key={p._id} className="card record-card">
              <div className="record-card-top">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${p.isActive ? 'badge-emerald' : 'badge-rose'}`}>{p.isActive ? 'Active' : 'Inactive'}</span>
                  <SourceBadge p={p} />
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 /></button>
              </div>

              {/* Patient name — shown for doctors */}
              {p.patient && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <FiUser size={13} style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm" style={{ fontWeight: 600 }}>
                    {getPatientName(p.patient)}
                  </span>
                  {p.patient.email && (
                    <span className="text-sm text-muted">· {p.patient.email}</span>
                  )}
                </div>
              )}

              {p.diagnosis && <h3 className="record-card-title">{p.diagnosis}</h3>}
              {p.doctorName && <p className="text-sm text-muted">Prescribed by: {p.doctorName}</p>}
              <div style={{ marginTop: 8 }}>
                {p.medications?.map((med, i) => (
                  <div key={i} className="rx-med-item">
                    <strong>{med.name}</strong>
                    {med.dosage && <span> — {med.dosage}</span>}
                    {med.frequency && <span>, {med.frequency}</span>}
                    {med.duration && <span> for {med.duration}</span>}
                  </div>
                ))}
              </div>

              {/* AI extraction notice */}
              {p.aiExtraction?.rawText && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', background: 'rgba(99,102,241,0.07)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--text-muted)',
                  display: 'flex', gap: 6, alignItems: 'flex-start'
                }}>
                  <FiCpu size={12} style={{ flexShrink: 0, marginTop: 2, color: 'var(--primary-400)' }} />
                  <span>AI extracted from uploaded image</span>
                </div>
              )}

              {p.interactionWarnings?.length > 0 && (
                <div className="alert alert-warning" style={{ marginTop: 12, marginBottom: 0 }}>
                  <FiAlertCircle /> {p.interactionWarnings.length} drug interaction warning(s)
                </div>
              )}
              {p.allergyWarnings?.length > 0 && (
                <div className="alert alert-rose" style={{ marginTop: 12, marginBottom: 0, backgroundColor: '#fdf2f2', borderColor: '#f8b4b4', color: '#9b1c1c', display: 'flex', gap: 8, alignItems: 'flex-start', padding: 12, borderRadius: 'var(--radius-md)' }}>
                  <FiAlertTriangle style={{ color: '#e02424', marginTop: 2, flexShrink: 0 }} size={16} />
                  <div>
                    <strong style={{ fontSize: '0.875rem' }}>🚨 Patient Allergy Warning:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: '0.8rem', lineHeight: 1.4 }}>
                      {p.allergyWarnings.map((w, idx) => (
                        <li key={idx}>
                          <strong>{w.matchedMedication}</strong> matches allergen <strong>{w.allergen}</strong> ({w.severity}): {w.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              <div className="record-card-meta" style={{ marginTop: 8 }}>
                <span>{new Date(p.prescriptionDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiClipboard style={{ fontSize: '4rem' }} className="empty-state-icon" />
          <p className="empty-state-title">No prescriptions</p>
          <p className="text-muted">
            {isDoctor ? 'Create prescriptions for your patients' : 'Add your prescriptions to track medications'}
          </p>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                {isDoctor ? 'Create Prescription' : 'Add Your Prescription'}
              </h2>
              <button className="btn btn-icon btn-ghost" onClick={() => { setShowModal(false); resetForm(); }}><FiX /></button>
            </div>

            {/* Entry mode selector — patients only */}
            {!isDoctor && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)'
              }}>
                <button
                  type="button"
                  onClick={() => { setEntryMode('manual'); setFile(null); setExtractionResult(null); }}
                  style={{
                    padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                    border: entryMode === 'manual' ? '2px solid var(--color-primary)' : '2px solid var(--border)',
                    background: entryMode === 'manual' ? 'rgba(99,102,241,0.08)' : 'var(--bg-tertiary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <FiEdit3 style={{ color: 'var(--primary-400)', marginBottom: 8, display: 'block' }} size={20} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Type Manually</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Enter medication names, dosages, and frequency yourself</div>
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('upload')}
                  style={{
                    padding: '14px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left',
                    border: entryMode === 'upload' ? '2px solid var(--color-primary)' : '2px solid var(--border)',
                    background: entryMode === 'upload' ? 'rgba(99,102,241,0.08)' : 'var(--bg-tertiary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <FiCpu style={{ color: 'var(--primary-400)', marginBottom: 8, display: 'block' }} size={20} />
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>Upload Photo (AI)</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Take a photo of your paper prescription — AI reads and saves it automatically</div>
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ padding: '16px 24px' }}>

              {/* ── UPLOAD MODE (patients) ── */}
              {!isDoctor && entryMode === 'upload' ? (
                <div>
                  <div className="file-upload-zone" style={{ position: 'relative' }}>
                    {extracting ? (
                      <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div className="spinner" style={{ margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>AI is reading your prescription...</p>
                      </div>
                    ) : file ? (
                      <div style={{ textAlign: 'center' }}>
                        <FiUpload size={28} style={{ color: 'var(--primary-400)', marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                        <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>📎 {file.name}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click to change file</p>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <FiUpload size={32} style={{ color: 'var(--text-muted)', marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                        <p style={{ fontWeight: 600 }}>Click to upload prescription image</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>JPG, PNG supported · AI will extract all medication details</p>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                    />
                  </div>

                  {/* Extraction result */}
                  {extractionResult && (
                    <div style={{
                      marginTop: 12, padding: '12px 14px', background: 'rgba(99,102,241,0.07)',
                      borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)',
                      fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                      maxHeight: 200, overflowY: 'auto'
                    }}>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8, fontWeight: 700 }}>
                        <FiCpu size={13} style={{ color: 'var(--primary-400)' }} /> AI Extraction Result
                      </div>
                      {extractionResult}
                    </div>
                  )}

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
                    Once you select an image, AI will automatically read and save your prescription. No need to fill any form!
                  </p>
                </div>
              ) : (
                <>
                  {/* ── DOCTOR: Patient selector ── */}
                  {isDoctor && (
                    <div className="form-group">
                      <label className="form-label">Select Patient *</label>
                      <div style={{ position: 'relative', marginBottom: 8 }}>
                        <FiSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                        <input
                          className="form-input"
                          style={{ paddingLeft: 36 }}
                          placeholder="Search patient by name or email..."
                          value={patientSearch}
                          onChange={(e) => { setPatientSearch(e.target.value); setForm({ ...form, patientId: '' }); }}
                        />
                      </div>
                      {form.patientId && (
                        <div style={{
                          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                          padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          marginBottom: 8, border: '1.5px solid var(--color-primary)'
                        }}>
                          <span style={{ fontWeight: 600 }}>
                            ✓ {allPatients.find(p => p._id === form.patientId)
                              ? getPatientName(allPatients.find(p => p._id === form.patientId))
                              : 'Patient selected'}
                          </span>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm({ ...form, patientId: '' })}>
                            <FiX size={12} />
                          </button>
                        </div>
                      )}
                      {!form.patientId && (
                        <div style={{
                          maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)'
                        }}>
                          {patientSearching ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Searching...</div>
                          ) : allPatients.length === 0 ? (
                            <div style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No patients found</div>
                          ) : allPatients.map(pt => (
                            <div
                              key={pt._id}
                              onClick={() => { setForm({ ...form, patientId: pt._id }); setPatientSearch(''); }}
                              style={{
                                padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                display: 'flex', flexDirection: 'column', gap: 2, transition: 'background 0.15s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pt.firstName} {pt.lastName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pt.email}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="form-row" style={{ marginBottom: 20 }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Doctor Name</label>
                      <input className="form-input" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Smith" />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Diagnosis</label>
                      <input className="form-input" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. Hypertension" />
                    </div>
                  </div>

                  {/* Medications */}
                  <div className="form-group">
                    <label className="form-label">Medications</label>
                    {form.medications.map((med, i) => (
                      <div key={i} style={{ background: 'var(--bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                          <div style={{ position: 'relative', flex: 2 }}>
                            <input
                              className="form-input"
                              placeholder="Drug name *"
                              value={med.name}
                              onChange={(e) => handleMedNameChange(i, e.target.value)}
                              onBlur={() => setTimeout(() => { setSuggestions([]); setActiveMedIndex(null); }, 200)}
                              style={{ width: '100%' }}
                            />
                            {activeMedIndex === i && suggestions.length > 0 && (
                              <div style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-sm)', maxHeight: 150, overflowY: 'auto',
                                boxShadow: 'var(--shadow-md)'
                              }}>
                                {suggestions.map((s, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => selectSuggestion(i, s)}
                                    style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    {s}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <input className="form-input" placeholder="Dosage" value={med.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} style={{ flex: 1 }} />
                          {form.medications.length > 1 && <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeMed(i)}><FiX /></button>}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input className="form-input" placeholder="Frequency (e.g. twice daily)" value={med.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)} />
                          <input className="form-input" placeholder="Duration (e.g. 7 days)" value={med.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={addMedication}><FiPlus /> Add Medication</button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." />
                  </div>

                  {/* Optional file upload in manual mode */}
                  <div className="form-group">
                    <label className="form-label">Attach Original Prescription (optional)</label>
                    <div className="file-upload-zone" style={{ padding: '16px', minHeight: 'unset' }}>
                      <p style={{ fontSize: '0.85rem' }}>Click to attach prescription image</p>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0])} />
                    </div>
                    {file && <p className="text-sm text-muted" style={{ marginTop: 6 }}>📎 {file.name}</p>}
                  </div>

                  <div className="flex gap-md" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Save Prescription'}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
