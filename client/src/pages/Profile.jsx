import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { FiSave } from 'react-icons/fi';
import './Auth.css';

// Lazy-load the heavy 3-D viewer
const AvatarViewer = lazy(() => import('../components/AvatarViewer'));

export default function Profile() {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', gender: '', bloodGroup: '',
    dateOfBirth: '', specialization: '', licenseNumber: '', hospital: '',
    emergencyContact: { name: '', phone: '', relationship: '' },
    address: { street: '', city: '', state: '', zipCode: '', country: '' }
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
        specialization: user.specialization || '',
        licenseNumber: user.licenseNumber || '',
        hospital: user.hospital || '',
        emergencyContact: user.emergencyContact || { name: '', phone: '', relationship: '' },
        address: user.address || { street: '', city: '', state: '', zipCode: '', country: '' }
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      const res = await authAPI.updateProfile(form);
      updateUser(res.data.data);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch { alert('Failed to update profile'); }
    finally { setSaving(false); }
  };

  const avatarGender = form.gender === 'female' ? 'female' : 'male';

  return (
    /* Split layout: form on left, 3D avatar on right */
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', minHeight: 'calc(100vh - 120px)' }}>

      {/* ── Left: Profile form ── */}
      <div style={{ flex: '1 1 0', minWidth: 0, padding: '28px 0' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>Profile Settings</h2>

        {success && <div className="alert alert-success">Profile updated successfully!</div>}

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Personal Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group"><label className="form-label">First Name</label>
                <input className="form-input" value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Last Name</label>
                <input className="form-input" value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Phone</label>
                <input className="form-input" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Date of Birth</label>
                <input className="form-input" type="date" value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Gender</label>
                <select className="form-select" value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">Select</option>
                  <option value="male">♂ Male</option>
                  <option value="female">♀ Female</option>
                  <option value="other">⚥ Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select></div>
              <div className="form-group"><label className="form-label">Blood Group</label>
                <select className="form-select" value={form.bloodGroup}
                  onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}>
                  <option value="">Select</option>
                  {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg =>
                    <option key={bg} value={bg}>{bg}</option>)}
                </select></div>
            </div>
          </div>

          {user?.role === 'doctor' && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Professional Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="form-group"><label className="form-label">Specialization</label>
                  <input className="form-input" value={form.specialization}
                    onChange={(e) => setForm({ ...form, specialization: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">License Number</label>
                  <input className="form-input" value={form.licenseNumber}
                    onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} /></div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Hospital</label>
                  <input className="form-input" value={form.hospital}
                    onChange={(e) => setForm({ ...form, hospital: e.target.value })} /></div>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Address</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Street</label>
                <input className="form-input" value={form.address.street}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })} /></div>
              <div className="form-group"><label className="form-label">City</label>
                <input className="form-input" value={form.address.city}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })} /></div>
              <div className="form-group"><label className="form-label">State</label>
                <input className="form-input" value={form.address.state}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })} /></div>
              <div className="form-group"><label className="form-label">ZIP Code</label>
                <input className="form-input" value={form.address.zipCode}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })} /></div>
              <div className="form-group"><label className="form-label">Country</label>
                <input className="form-input" value={form.address.country}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })} /></div>
            </div>
          </div>

          {user?.role === 'patient' && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Emergency Contact</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                <div className="form-group"><label className="form-label">Name</label>
                  <input className="form-input" value={form.emergencyContact.name}
                    onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: e.target.value } })} /></div>
                <div className="form-group"><label className="form-label">Phone</label>
                  <input className="form-input" value={form.emergencyContact.phone}
                    onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: e.target.value } })} /></div>
                <div className="form-group"><label className="form-label">Relationship</label>
                  <input className="form-input" value={form.emergencyContact.relationship}
                    onChange={(e) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: e.target.value } })} /></div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? 'Saving...' : <><FiSave /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* ── Right: Gender-reactive 3D avatar (sticky) ── */}
      <div className="profile-avatar-panel">
        <div className="profile-avatar-inner">
          <Suspense fallback={
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', gap: 12, color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--brand-500)' }} />
              <p style={{ fontSize: '0.875rem' }}>Loading 3D Avatar…</p>
            </div>
          }>
            <AvatarViewer gender={avatarGender} style={{ height: '100%' }} />
          </Suspense>
        </div>

        {/* Hint card */}
        <div className="profile-avatar-hint">
          <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>
            {form.gender === 'female' ? '♀' : '♂'}
          </div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
            {form.firstName || 'Your'} {form.lastName || 'Avatar'}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {form.gender || 'Gender not set'} · {form.bloodGroup || 'Blood group not set'}
          </div>
        </div>
      </div>

    </div>
  );
}
