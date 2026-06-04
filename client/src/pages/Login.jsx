import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff, FiHeart } from 'react-icons/fi';
import VideoAvatarViewer from '../components/VideoAvatarViewer';
import './Auth.css';

export default function Login() {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);
  const { login, error, setError }      = useAuth();
  const navigate                        = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      // Error is set in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Decorative shapes */}
      <div className="auth-bg-shapes">
        <div className="auth-shape auth-shape-1" />
        <div className="auth-shape auth-shape-2" />
        <div className="auth-shape auth-shape-3" />
      </div>

      <div className="auth-split-container">
        {/* ── LEFT: Form panel ── */}
        <div className="auth-form-side">
          <div className="auth-card">
            {/* Brand */}
            <div className="auth-header">
              <div className="auth-logo-text">
                <div className="auth-logo-badge"><FiHeart size={18} /></div>
                <span className="auth-brand-name">Meri<span>Nurse</span></span>
              </div>
              <h1 className="auth-title">Welcome Back</h1>
              <p className="auth-subtitle">Sign in to your health dashboard</p>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-with-icon">
                  <FiMail className="input-icon" />
                  <input
                    id="login-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-with-icon">
                  <FiLock className="input-icon" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    required
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="btn btn-primary btn-lg auth-submit"
                disabled={loading}
              >
                {loading
                  ? <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'white' }} />
                  : 'Sign In →'}
              </button>
            </form>

            <div className="auth-footer">
              <p>Don&apos;t have an account? <Link to="/register">Create account</Link></p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="auth-stats">
            <div className="auth-stat-item">
              <div className="auth-stat-value">50K+</div>
              <div className="auth-stat-label">Active Patients</div>
            </div>
            <div className="auth-stat-item">
              <div className="auth-stat-value">2,400+</div>
              <div className="auth-stat-label">Doctors Enrolled</div>
            </div>
            <div className="auth-stat-item">
              <div className="auth-stat-value">99.9%</div>
              <div className="auth-stat-label">Uptime SLA</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Video avatar panel ── */}
        <div className="auth-avatar-side">
          <VideoAvatarViewer style={{ height: '100%' }} />

          {/* Floating pill info */}
          <div className="auth-avatar-caption">
            <span>🏥 Your personal health companion</span>
          </div>
        </div>
      </div>
    </div>
  );
}
