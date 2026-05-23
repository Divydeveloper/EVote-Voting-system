// src/pages/Register.js
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Register() {
  const [step, setStep] = useState(1); // 1=form, 2=otp
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/register', {
        name: form.name, email: form.email, phone: form.phone, password: form.password,
      });
      setUserId(data.userId);
      setStep(2);
      toast.success('OTP sent to your email!');
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otpValues];
    next[idx] = val.slice(-1);
    setOtpValues(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (!val && idx > 0) otpRefs.current[idx - 1]?.focus();
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    const otp = otpValues.join('');
    if (otp.length !== 6) { toast.error('Please enter complete 6-digit OTP'); return; }
    setLoading(true);
    try {
      const { data } = await API.post('/auth/verify-otp', { userId, otp });
      localStorage.setItem('evote_token', data.token);
      localStorage.setItem('evote_user', JSON.stringify(data.user));
      toast.success('Email verified! Welcome to E-Vote India 🎉');
      navigate('/voter/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'OTP verification failed');
    } finally { setLoading(false); }
  };

  const resendOtp = async () => {
    try {
      await API.post('/auth/resend-otp', { userId });
      toast.success('OTP resent!');
    } catch (err) { toast.error('Failed to resend OTP'); }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="auth-emblem">🗳️</div>
          <h1>E-Vote India</h1>
          <p>Election Commission of India</p>
          <div className="auth-features">
            {['Constitutional Right to Vote', 'Secure & Anonymous', 'One Vote Per Election', 'Verified Identity'].map(f => (
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

      <div className="auth-right">
        <div className="auth-form-wrapper">
          {step === 1 ? (
            <>
              <div className="auth-header">
                <h2>Voter Registration</h2>
                <p>Create your secure E-Vote account</p>
              </div>
              <form onSubmit={handleRegister} className="auth-form">
                <div className="form-group">
                  <label className="form-label">Full Name <span className="req">*</span></label>
                  <input type="text" className="form-control" required placeholder="As per Aadhaar/ID"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address <span className="req">*</span></label>
                  <input type="email" className="form-control" required placeholder="your@email.com"
                    value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-control" placeholder="10-digit mobile number"
                    value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Password <span className="req">*</span></label>
                    <input type="password" className="form-control" required placeholder="Min 8 chars"
                      value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Confirm Password <span className="req">*</span></label>
                    <input type="password" className="form-control" required placeholder="Repeat password"
                      value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} />
                  </div>
                </div>
                <p className="form-hint">Password must have uppercase, lowercase, and a number.</p>
                <button type="submit" className="btn btn-primary btn-block btn-lg mt-4" disabled={loading}>
                  {loading ? 'Registering...' : '📝 Register as Voter'}
                </button>
              </form>
              <p className="auth-switch">Already registered? <Link to="/login">Sign In</Link></p>
            </>
          ) : (
            <>
              <div className="auth-header">
                <h2>Verify Your Email</h2>
                <p>Enter the 6-digit OTP sent to <strong>{form.email}</strong></p>
              </div>
              <form onSubmit={handleOtpSubmit}>
                <div className="otp-inputs">
                  {otpValues.map((v, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el}
                      className="otp-input" type="text" inputMode="numeric"
                      maxLength={1} value={v}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => { if (e.key === 'Backspace' && !v && i > 0) otpRefs.current[i-1]?.focus(); }}
                    />
                  ))}
                </div>
                <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
                  {loading ? 'Verifying...' : '✅ Verify OTP'}
                </button>
              </form>
              <p className="auth-switch mt-4">
                Didn't receive? <button onClick={resendOtp} style={{ color: 'var(--primary)', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Resend OTP</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
