import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { recordsAPI, accessAPI, allergiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FiPlus, FiSearch, FiUpload, FiFile, FiFileText, FiTrash2, FiEye, FiX, FiCpu, FiUser, FiAlertTriangle } from 'react-icons/fi';
import './Records.css';

// Simple markdown to JSX renderer (no external library needed)
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

  // Skip lines that are raw machine-readable metadata blocks
    if (/^DETECTED_ALLERGIES_JSON:/.test(line)) continue;
    if (/^EXTRACTED_DATA_JSON:/.test(line)) continue;
    if (/^---$/.test(line.trim())) continue;
    if (/^ALLERGY EXTRACTION/.test(line)) continue;

    // ### Heading 3
    if (/^###\s+/.test(line)) {
      elements.push(
        <h5 key={key++} style={{ margin: '12px 0 4px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-400)', letterSpacing: 0.2 }}>
          {line.replace(/^###\s+/, '')}
        </h5>
      );
    }
    // ## Heading 2
    else if (/^##\s+/.test(line)) {
      elements.push(
        <h4 key={key++} style={{ margin: '14px 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {line.replace(/^##\s+/, '')}
        </h4>
      );
    }
    // # Heading 1
    else if (/^#\s+/.test(line)) {
      elements.push(
        <h3 key={key++} style={{ margin: '14px 0 4px', fontSize: '1.05rem', fontWeight: 800 }}>
          {line.replace(/^#\s+/, '')}
        </h3>
      );
    }
    // Bullet point (* item or - item)
    else if (/^[*-]\s+/.test(line)) {
      const content = line.replace(/^[*-]\s+/, '');
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, margin: '2px 0', paddingLeft: 4 }}>
          <span style={{ color: 'var(--primary-400)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ lineHeight: 1.6 }}>{inlineBold(content)}</span>
        </div>
      );
    }
    // Indented bullet (* * item or similar)
    else if (/^\s+[*-]\s+/.test(line)) {
      const content = line.replace(/^\s+[*-]\s+/, '');
      elements.push(
        <div key={key++} style={{ display: 'flex', gap: 8, margin: '2px 0', paddingLeft: 20 }}>
          <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 1 }}>◦</span>
          <span style={{ lineHeight: 1.6 }}>{inlineBold(content)}</span>
        </div>
      );
    }
    // Empty line -> spacer
    else if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: 6 }} />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={key++} style={{ margin: '2px 0', lineHeight: 1.7 }}>{inlineBold(line)}</p>
      );
    }
  }
  return elements;
}

// Render inline **bold** and `code` text
function inlineBold(text) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (/^\*\*.*\*\*$/.test(part)) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (/^`.*`$/.test(part)) {
      return <code key={i} style={{ background: 'var(--bg-tertiary)', padding: '1px 5px', borderRadius: 4, fontSize: '0.85em', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

export default function Records() {
  const location = useLocation();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const patientIdFromUrl = queryParams.get('patientId');

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [patientInfo, setPatientInfo] = useState(null); // holds { firstName, lastName } for doctor view
  const [form, setForm] = useState({
    title: '', category: 'lab-report', description: '', doctorName: '', hospitalName: '', notes: '', tags: ''
  });
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [analyzing, setAnalyzing] = useState(null);
  const [addedAllergies, setAddedAllergies] = useState({});

  useEffect(() => { fetchRecords(); }, [search, category, patientIdFromUrl]);

  // When viewing a specific patient's records (doctor view), fetch patient info to show their name
  useEffect(() => {
    if (patientIdFromUrl && user?.role === 'doctor') {
      accessAPI.getAllPatients(patientIdFromUrl)
        .then(res => {
          const found = (res.data.data || []).find(p => p._id === patientIdFromUrl);
          if (found) setPatientInfo(found);
        })
        .catch(() => setPatientInfo(null));
    } else {
      setPatientInfo(null);
    }
  }, [patientIdFromUrl, user?.role]);

  const fetchRecords = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (patientIdFromUrl) params.patientId = patientIdFromUrl;
      const res = await recordsAPI.getAll(params);
      setRecords(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.keys(form).forEach(k => formData.append(k, form[k]));
      files.forEach(f => formData.append('files', f));
      await recordsAPI.create(formData);
      setShowModal(false);
      setForm({ title: '', category: 'lab-report', description: '', doctorName: '', hospitalName: '', notes: '', tags: '' });
      setFiles([]);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await recordsAPI.delete(id);
      fetchRecords();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleAnalyze = async (id) => {
    setAnalyzing(id);
    try {
      const res = await recordsAPI.analyze(id);
      if (res.data.success) {
        fetchRecords(); // Refresh to show AI badge
      } else {
        alert('AI Analysis returned no result. Ensure the file is a valid image.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Analysis failed. Make sure the record has an image file and Gemini API key is set.');
    } finally {
      setAnalyzing(null);
    }
  };

  const handleAddAllergy = async (allergy) => {
    try {
      const payload = {
        allergen: allergy.allergen,
        type: 'drug',
        severity: allergy.severity || 'moderate',
        reaction: allergy.reaction || 'Detected via AI Report Analysis',
        notes: `Automatically extracted from medical record: "${selectedRecord.title}".`
      };
      if (user?.role === 'doctor') {
        payload.patientId = selectedRecord.patient._id || selectedRecord.patient;
      }
      await allergiesAPI.create(payload);
      setAddedAllergies(prev => ({ ...prev, [allergy.allergen]: true }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add allergy');
    }
  };

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'lab-report', label: 'Lab Report' },
    { value: 'prescription', label: 'Prescription' },
    { value: 'imaging', label: 'Imaging' },
    { value: 'vaccination', label: 'Vaccination' },
    { value: 'surgery', label: 'Surgery' },
    { value: 'consultation', label: 'Consultation' },
    { value: 'discharge-summary', label: 'Discharge Summary' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'other', label: 'Other' },
  ];

  const getCategoryColor = (cat) => {
    const colors = {
      'lab-report': 'primary', 'prescription': 'teal', 'imaging': 'amber',
      'vaccination': 'emerald', 'surgery': 'rose', 'consultation': 'primary',
    };
    return colors[cat] || 'primary';
  };

  if (loading) return <div className="loading-page"><div className="spinner" /></div>;

  return (
    <div className="records-page">
      {/* Patient Filter Banner */}
      {patientIdFromUrl && (
        <div className="alert alert-info" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>
            <FiUser style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Viewing records for patient:{' '}
            <strong>
              {patientInfo
                ? `${patientInfo.firstName} ${patientInfo.lastName}`
                : patientIdFromUrl}
            </strong>
          </span>
          <a href="/records" className="btn btn-ghost btn-sm">✕ Clear Filter</a>
        </div>
      )}
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="search-box">
            <FiSearch className="search-icon" />
            <input className="form-input search-input" placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select category-filter" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <FiPlus /> Add Record
        </button>
      </div>

      {/* Records Grid */}
      {records.length > 0 ? (
        <div className="grid-2">
          {records.map(record => (
            <div key={record._id} className="card record-card">
              <div className="record-card-top">
                <span className={`badge badge-${getCategoryColor(record.category)}`}>
                  {categories.find(c => c.value === record.category)?.label || record.category}
                </span>
                <div className="record-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setSelectedRecord(record)} title="View details"><FiEye /></button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleAnalyze(record._id)}
                    title={user?.role === 'doctor' ? 'AI Analyze (as Doctor)' : 'AI Analyze'}
                    disabled={analyzing === record._id}
                    style={{ position: 'relative' }}
                  >
                    {analyzing === record._id ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FiCpu />}
                  </button>
                  {/* Only the record's owner (patient) can delete */}
                  {user?.role === 'patient' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(record._id)} title="Delete"><FiTrash2 /></button>
                  )}
                </div>
              </div>
              <h3 className="record-card-title">{record.title}</h3>
              <p className="record-card-desc">{record.description || 'No description'}</p>
              <div className="record-card-meta">
                <span>{new Date(record.recordDate).toLocaleDateString()}</span>
                {record.doctorName && <span>Dr. {record.doctorName}</span>}
                {record.files?.length > 0 && <span><FiFile /> {record.files.length} file(s)</span>}
              </div>
              {record.aiAnalysis?.summary && (
                <div className="record-ai-badge">
                  <FiCpu /> AI Analyzed
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <FiFileText className="empty-state-icon" style={{ fontSize: '4rem' }} />
          <p className="empty-state-title">No medical records found</p>
          <p className="text-muted">Upload your first record to get started</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowModal(true)}><FiPlus /> Add Record</button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecord && (
        <div className="modal-overlay" onClick={() => setSelectedRecord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedRecord.title}</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setSelectedRecord(null)}><FiX /></button>
            </div>
            <div className="record-detail">
              <div className="record-detail-row">
                <span className="text-muted">Category</span>
                <span className={`badge badge-${getCategoryColor(selectedRecord.category)}`}>
                  {categories.find(c => c.value === selectedRecord.category)?.label}
                </span>
              </div>
              <div className="record-detail-row">
                <span className="text-muted">Date</span>
                <span>{new Date(selectedRecord.recordDate).toLocaleDateString()}</span>
              </div>
              {selectedRecord.doctorName && (
                <div className="record-detail-row"><span className="text-muted">Doctor</span><span>{selectedRecord.doctorName}</span></div>
              )}
              {selectedRecord.hospitalName && (
                <div className="record-detail-row"><span className="text-muted">Hospital</span><span>{selectedRecord.hospitalName}</span></div>
              )}
              {selectedRecord.description && (
                <div className="record-detail-section"><h4>Description</h4><p>{selectedRecord.description}</p></div>
              )}
              {selectedRecord.notes && (
                <div className="record-detail-section"><h4>Notes</h4><p>{selectedRecord.notes}</p></div>
              )}
              {selectedRecord.aiAnalysis?.extractedData?.detectedAllergies?.length > 0 && (
                <div className="alert alert-rose" style={{ marginTop: 16, marginBottom: 16, backgroundColor: '#fdf2f2', borderColor: '#f8b4b4', color: '#9b1c1c', display: 'flex', flexDirection: 'column', gap: 8, padding: 14, borderRadius: 'var(--radius-md)', border: '1.5px solid #f8b4b4' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <FiAlertTriangle style={{ color: '#e02424', flexShrink: 0 }} size={18} />
                    <strong style={{ fontSize: '0.9rem' }}>⚠️ AI-Detected Allergies in this Document:</strong>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                    {selectedRecord.aiAnalysis.extractedData.detectedAllergies.map((allergy, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid #f3f4f6' }}>
                        <div style={{ fontSize: '0.85rem', color: '#374151' }}>
                          <strong>{allergy.allergen}</strong> ({allergy.severity}): {allergy.reaction || 'No reaction specified'}
                        </div>
                        <button
                          className="btn btn-sm"
                          style={{ 
                            padding: '4px 8px', fontSize: '0.75rem', height: 'auto', 
                            background: addedAllergies[allergy.allergen] ? '#10b981' : 'var(--color-primary)',
                            color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer'
                          }}
                          onClick={() => handleAddAllergy(allergy)}
                          disabled={addedAllergies[allergy.allergen]}
                        >
                          {addedAllergies[allergy.allergen] ? '✓ Added' : user?.role === 'doctor' ? 'Add to Patient Profile' : 'Add to My Profile'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedRecord.aiAnalysis?.summary && (
                <div className="record-detail-section ai-section">
                  <h4><FiCpu /> AI Analysis</h4>
                  <div className="ai-analysis-text" style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
                    {renderMarkdown(selectedRecord.aiAnalysis.summary)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Record Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2 className="modal-title">Add Medical Record</h2>
              <button className="btn btn-icon btn-ghost" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required placeholder="e.g., Blood Work Results - March 2026" />
              </div>
              <div className="form-row" style={{ marginBottom: 20 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category *</label>
                  <select className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Doctor Name</label>
                  <input className="form-input" value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Dr. Smith" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this record" />
              </div>
              <div className="form-group">
                <label className="form-label">Hospital / Clinic</label>
                <input className="form-input" value={form.hospitalName} onChange={(e) => setForm({ ...form, hospitalName: e.target.value })} placeholder="Hospital name" />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (comma separated)</label>
                <input className="form-input" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="cardiac, annual-checkup" />
              </div>
              <div className="form-group">
                <label className="form-label">Attach Files</label>
                <div className="file-upload-zone">
                  <FiUpload size={24} />
                  <p>Click or drag files here</p>
                  <p className="text-sm text-muted">JPEG, PNG, PDF up to 10MB</p>
                  <input type="file" multiple accept="image/*,.pdf" onChange={(e) => setFiles([...e.target.files])} />
                </div>
                {files.length > 0 && (
                  <div className="file-list">
                    {[...files].map((f, i) => <div key={i} className="file-item"><FiFile /> {f.name}</div>)}
                  </div>
                )}
              </div>
              <div className="flex gap-md" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Uploading...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
