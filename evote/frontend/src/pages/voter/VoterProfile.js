// src/pages/voter/VoterProfile.js
import React, { useState } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import { useAuth } from '../../context/AuthContext';
import './Voter.css';

export default function VoterProfile() {
  const { user } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <AppLayout title="My Profile">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Voter</span> / Profile</div>
          <h1 className="page-title">My Profile</h1>
        </div>

        {/* Profile Card */}
        <div className="card mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, flexShrink: 0 }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: 4 }}>{user?.name}</h2>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 8 }}>{user?.email}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className={`badge ${user?.isVerified ? 'badge-success' : 'badge-warning'}`}>
                  {user?.isVerified ? '✓ Verified' : '⏳ Unverified'}
                </span>
                <span className="badge badge-primary">Voter</span>
              </div>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Voter ID</div>
              <code style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: 2 }}>{user?.voterId}</code>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[{ id: 'profile', label: '👤 Details' }, { id: 'votes', label: '🗳️ Voting History' }].map(t => (
            <button key={t.id} className={`btn btn-sm ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="card">
            <div className="card-title mb-4">Personal Information</div>
            <div className="grid-2">
              {[
                ['Full Name', user?.name],
                ['Email', user?.email],
                ['Phone', user?.phone || 'Not provided'],
                ['Voter ID', user?.voterId],
                ['Account Status', user?.isActive ? 'Active' : 'Inactive'],
                ['Email Verified', user?.isVerified ? 'Yes' : 'No'],
                ['Member Since', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { dateStyle: 'long' }) : '—'],
                ['Last Login', user?.lastLogin ? new Date(user.lastLogin).toLocaleString('en-IN') : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                  <div style={{ fontWeight: 500 }}>{value || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'votes' && (
          <div className="card">
            <div className="card-title mb-4">Voting History</div>
            {user?.votedElections?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {user.votedElections.map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: 20 }}>✅</span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{e.title || `Election ID: ${e._id || e}`}</div>
                      {e.status && <span className={`badge badge-${e.status === 'active' ? 'success' : 'gray'}`}>{e.status}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="icon">🗳️</div>
                <h3>No votes cast yet</h3>
                <p>You haven't participated in any elections.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
