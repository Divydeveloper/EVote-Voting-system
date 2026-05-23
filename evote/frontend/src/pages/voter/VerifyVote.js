// src/pages/voter/VerifyVote.js
import React, { useState } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import toast from 'react-hot-toast';

export default function VerifyVote() {
  const [hash, setHash] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const verify = async (e) => {
    e.preventDefault();
    if (!hash.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const { data } = await API.get(`/votes/verify/${hash.trim()}`);
      setResult(data.data);
      toast.success('Vote verified!');
    } catch (err) {
      setError(err.response?.data?.message || 'Vote not found. Check the hash and try again.');
    } finally { setLoading(false); }
  };

  return (
    <AppLayout title="Verify Vote">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Voter</span> / Verify Vote</div>
          <h1 className="page-title">Vote Verification</h1>
          <p className="page-subtitle">Enter your vote reference hash to verify your vote was counted correctly.</p>
        </div>

        <div className="card" style={{ maxWidth: 600 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
            <h3 style={{ fontFamily: 'var(--font-serif)' }}>Verify Your Vote</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 6 }}>
              Your vote hash was sent to your email after voting. This verifies your vote was recorded without revealing who you voted for.
            </p>
          </div>

          <form onSubmit={verify}>
            <div className="form-group">
              <label className="form-label">Vote Hash</label>
              <textarea
                className="form-control" rows={3}
                placeholder="Paste your 64-character vote hash here..."
                value={hash} onChange={e => setHash(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading || !hash.trim()}>
              {loading ? '🔍 Verifying...' : '🔍 Verify Vote'}
            </button>
          </form>

          {error && (
            <div className="alert alert-danger mt-4">❌ {error}</div>
          )}

          {result && (
            <div style={{ marginTop: 24, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: 'var(--success)' }}>Vote Verified Successfully</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Your vote has been recorded in the system</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['🗳️ Election', result.election],
                  ['👤 Voted For', result.candidate],
                  ['🏛️ Party', result.party],
                  ['⏰ Timestamp', result.timestamp ? new Date(result.timestamp).toLocaleString('en-IN') : '—'],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{label}</span>
                    <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{val || '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
