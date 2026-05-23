// src/pages/voter/MyVotes.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export default function MyVotes() {
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/elections?limit=50').then(r => { setElections(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const votedElectionIds = (user?.votedElections || []).map(e => e?._id || e?.toString?.() || e);
  const votedElections = elections.filter(e => votedElectionIds.includes(e._id));

  return (
    <AppLayout title="My Votes">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Voter</span> / My Votes</div>
          <h1 className="page-title">My Votes</h1>
          <p className="page-subtitle">You have voted in {votedElections.length} election{votedElections.length !== 1 ? 's' : ''}.</p>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : votedElections.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🗳️</div>
            <h3>No votes yet</h3>
            <p>You haven't cast any votes yet.</p>
            <Link to="/voter/elections" className="btn btn-primary mt-4">View Elections →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {votedElections.map(e => (
              <div key={e._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius)', background: 'linear-gradient(135deg, var(--primary), #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🗳️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{e.title}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    {e.constituency && `📍 ${e.constituency} · `}
                    {new Date(e.startDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="voted-badge">✅ Voted</span>
                  <span className={`badge ${e.status === 'active' ? 'badge-success' : e.status === 'results_declared' ? 'badge-info' : 'badge-gray'}`}>
                    {e.status.replace('_', ' ')}
                  </span>
                  {['ended', 'results_declared'].includes(e.status) && (
                    <Link to={`/voter/elections/${e._id}`} className="btn btn-sm btn-secondary">📊 Results</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
