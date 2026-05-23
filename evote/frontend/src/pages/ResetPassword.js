// src/pages/ResetPassword.js
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import './Auth.css';

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await API.post(`/auth/reset-password/${token}`, { password: form.password });
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Reset failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        <div className="auth-header" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <h2>Reset Password</h2>
          <p>Enter your new password below</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">New Password <span className="req">*</span></label>
            <input type="password" className="form-control" required placeholder="Min 8 characters"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
            <div className="form-hint">Must contain uppercase, lowercase, and a number.</div>
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password <span className="req">*</span></label>
            <input type="password" className="form-control" required placeholder="Repeat password"
              value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
          </div>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Resetting...' : '🔐 Reset Password'}
          </button>
        </form>
        <p className="auth-switch mt-4"><Link to="/login">← Back to Login</Link></p>
      </div>
    </div>
  );
}
