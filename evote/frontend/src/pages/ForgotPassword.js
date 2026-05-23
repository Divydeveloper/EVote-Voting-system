// src/pages/ForgotPassword.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import toast from 'react-hot-toast';
import './Auth.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent if email is registered');
    } catch (err) {
      toast.error('Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page" style={{ justifyContent: 'center', alignItems: 'center', background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        <div className="auth-header" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔑</div>
          <h2>Forgot Password?</h2>
          <p>Enter your email and we'll send a reset link</p>
        </div>

        {sent ? (
          <div className="alert alert-success">
            ✅ If your email is registered, you'll receive a password reset link shortly. Check your inbox.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Registered Email <span className="req">*</span></label>
              <input type="email" className="form-control" required placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
              {loading ? 'Sending...' : '📧 Send Reset Link'}
            </button>
          </form>
        )}

        <p className="auth-switch mt-4"><Link to="/login">← Back to Login</Link></p>
      </div>
    </div>
  );
}
