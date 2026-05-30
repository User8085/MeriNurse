import { useState, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiPhone, FiHeart } from 'react-icons/fi';
import './Auth.css';

// Lazy-load the heavy 3-D viewer
const AvatarViewer = lazy(() => import('../components/AvatarViewer'));

export default function Register() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    role: 'patient', phone: '', gender: '',
    specialization: '', licenseNumber: '', hospital: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [localError, setLocalError]     = useState('');
  const { register, error, setError }   = useAuth();
  const navigate                        = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
    setLocalError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch {
      // Error set in context
    } finally {
      setLoading(false);
    }
  };

  // Derive avatar gender: default to male for doctor or unknown
  const avatarGender = form.gender === 'female' ? 'female' : 'male';

  return (
    <div className="auth-page">
      {/* Decorative shapes */}
      <div className="auth-bg-shapes">
        <div className="auth-shape auth-shape-1" />
        <div className="auth-shape auth-shape-2" />
        <div className="auth-shape auth-shape-3" />
      </div>

      <div className="auth-split-container auth-split-container--wide">
        {/* ── LEFT: Registration form ── */}
        <div className="auth-form-side">
          <div className="auth-card auth-card--wide">
            {/* Brand */}
            <div className="auth-header">
              <div className="auth-logo-text">
                <div className="auth-logo-badge"><FiHeart size={18} /></div>
                <span className="auth-brand-name">Meri<span>Nurse</span></span>
              </div>
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">Join MeriNurse to manage your health records</p>
            </div>

            {(error || localError) && (
              <div className="alert alert-error">{localError || error}</div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
              {/* Role Toggle */}
              <div className="role-toggle">
                <button
                  type="button"
                  className={`role-btn ${form.role === 'patient' ? 'role-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, role: 'patient' })}
                >🧑 Patient</button>
                <button
                  type="button"
                  className={`role-btn ${form.role === 'doctor' ? 'role-btn-active' : ''}`}
                  onClick={() => setForm({ ...form, role: 'doctor' })}
                >🩺 Doctor</button>
              </div>

              {/* Name Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">First Name</label>
                  <div className="input-with-icon">
                    <FiUser className="input-icon" />
                    <input name="firstName" className="form-input" placeholder="John"
                      value={form.firstName} onChange={handleChange} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name</label>
                  <input name="lastName" className="form-input" placeholder="Doe"
                    value={form.lastName} onChange={handleChange} required />
                </div>
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input name="email" type="email" className="form-input"
                    placeholder="you@example.com" value={form.email}
                    onChange={handleChange} required />
                </div>
              </div>

              {/* Phone + Gender Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <div className="input-with-icon">
                    <FiPhone className="input-icon" />
                    <input name="phone" className="form-input" placeholder="+91 98765 43210"
                      value={form.phone} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select name="gender" className="form-select" value={form.gender} onChange={handleChange} required>
                    <option value="">Select gender</option>
                    <option value="male">♂ Male</option>
                    <option value="female">♀ Female</option>
                    <option value="other">⚥ Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              {/* Doctor-only fields */}
              {form.role === 'doctor' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Specialization</label>
                    <input name="specialization" className="form-input"
                      placeholder="e.g., Cardiology" value={form.specialization} onChange={handleChange} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">License Number</label>
                      <input name="licenseNumber" className="form-input"
                        placeholder="License #" value={form.licenseNumber} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Hospital</label>
                      <input name="hospital" className="form-input"
                        placeholder="Hospital name" value={form.hospital} onChange={handleChange} />
                    </div>
                  </div>
                </>
              )}

              {/* Password Row */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="input-with-icon">
                    <FiLock className="input-icon" />
                    <input name="password" type={showPassword ? 'text' : 'password'}
                      className="form-input" placeholder="Min 8 characters"
                      value={form.password} onChange={handleChange} required />
                    <button type="button" className="input-icon-right"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <input name="confirmPassword" type="password" className="form-input"
                    placeholder="Repeat password" value={form.confirmPassword} onChange={handleChange} required />
                </div>
              </div>

              <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
                {loading
                  ? <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'white' }} />
                  : 'Create Account →'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Gender-reactive 3D avatar ── */}
        <div className="auth-avatar-side">
          <Suspense fallback={
            <div className="auth-avatar-loading">
              <div className="spinner" style={{ width: 48, height: 48, borderTopColor: 'var(--brand-500)' }} />
              <p>Loading avatar…</p>
            </div>
          }>
            <AvatarViewer gender={avatarGender} style={{ height: '100%' }} />
          </Suspense>

          {/* Live hint */}
          <div className="auth-avatar-caption">
            {form.gender
              ? <span>Showing your {form.gender === 'female' ? '♀ female' : '♂ male'} avatar</span>
              : <span>👆 Select your gender to see your avatar</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
