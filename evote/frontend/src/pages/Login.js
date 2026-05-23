// src/pages/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const [role, setRole] = useState('voter');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.email, form.password, role);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'voter' ? '/voter/dashboard' : '/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left panel */}
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-emblem">🗳️</div>
          <h1>E-Vote India</h1>
          <p>Election Commission of India</p>
          <div className="auth-features">
            {['Secure & Encrypted Voting', 'Real-time Results', 'Verified Voter Identity', 'Tamper-Proof System'].map(f => (
              <div key={f} className="auth-feature"><span>✓</span> {f}</div>
            ))}
          </div>
          <div className="auth-tricolor">
            <div style={{ background: '#FF9933' }} />
            <div style={{ background: '#fff' }} />
            <div style={{ background: '#138808' }} />
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-right">
        <div className="auth-form-wrapper">
          <div className="auth-header">
            <h2>Sign In</h2>
            <p>Access the secure voting portal</p>
          </div>

          {/* Role Toggle */}
          <div className="role-toggle">
            <button className={role === 'voter' ? 'active' : ''} onClick={() => setRole('voter')}>
              🗳️ Voter Login
            </button>
            <button className={role === 'admin' ? 'active' : ''} onClick={() => setRole('admin')}>
              ⚙️ Admin Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address <span className="req">*</span></label>
              <input
                type="email" className="form-control" required
                placeholder="Enter your registered email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password <span className="req">*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} className="form-control" required
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  style={{ paddingRight: '42px' }}
                />
                <button type="button" className="pass-toggle" onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex-between mt-2 mb-4">
              <label className="remember-label">
                <input type="checkbox" /> Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in...</> : '🔐 Sign In Securely'}
            </button>
          </form>

          {role === 'voter' && (
            <p className="auth-switch">
              New voter? <Link to="/register">Register here</Link>
            </p>
          )}

          {/* Demo credentials */}
          <div className="demo-creds">
            <div className="demo-title">Demo Credentials</div>
            <div className="demo-row">
              <span>Voter:</span>
              <code>rahul@example.com / Voter@123</code>
            </div>
            <div className="demo-row">
              <span>Admin:</span>
              <code>admin@evote.gov.in / Admin@123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
