// src/pages/voter/Elections.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import './Voter.css';

export default function Elections() {
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    API.get('/elections?limit=50').then(r => { setElections(r.data.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? elections : elections.filter(e => e.status === filter);

  const hasVoted = (electionId) =>
    user?.votedElections?.some(id => id === electionId || id?._id === electionId);

  return (
    <AppLayout title="Elections">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Voter</span> / Elections</div>
          <h1 className="page-title">All Elections</h1>
        </div>

        <div className="filters-bar mb-6">
          {['all', 'active', 'upcoming', 'ended', 'results_declared'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
              {{ all: '📋 All', active: '🟢 Active', upcoming: '⏳ Upcoming', ended: '⬜ Ended', results_declared: '📊 Results' }[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner spinner-lg" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="icon">🗳️</div><h3>No elections</h3><p>No elections match your filter.</p></div>
        ) : (
          <div className="elections-grid">
            {filtered.map(e => {
              const voted = hasVoted(e._id);
              const now = new Date();
              const end = new Date(e.endDate);
              const hrs = Math.floor(Math.max(0, end - now) / 3600000);
              const turnout = e.totalVoters > 0 ? ((e.totalVotesCast / e.totalVoters) * 100).toFixed(1) : 0;

              return (
                <div key={e._id} className="election-card">
                  <div className="election-card-header">
                    <div className="election-type-badge">{e.electionType?.toUpperCase()}</div>
                    <span className={`badge ${e.status === 'active' ? 'badge-success' : e.status === 'upcoming' ? 'badge-warning' : e.status === 'results_declared' ? 'badge-info' : 'badge-gray'}`}>
                      {e.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="election-title">{e.title}</h4>
                  {e.constituency && <div className="election-meta">📍 {e.constituency}</div>}
                  {e.status === 'active' && (
                    <div className="election-timer">⏰ {hrs}h remaining</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    <span>👥 {e.candidates?.length || 0} candidates</span>
                    {e.status !== 'upcoming' && <span>🗳️ {e.totalVotesCast} votes</span>}
                  </div>
                  {e.status === 'active' && e.totalVoters > 0 && (
                    <div>
                      <div className="flex-between text-sm text-secondary" style={{ marginBottom: 4 }}>
                        <span>Turnout</span><span>{turnout}%</span>
                      </div>
                      <div className="progress"><div className="progress-bar" style={{ width: `${turnout}%` }} /></div>
                    </div>
                  )}
                  <div className="election-card-footer">
                    {voted ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div className="voted-badge">✅ Voted</div>
                        {['ended', 'results_declared'].includes(e.status) && (
                          <Link to={`/voter/elections/${e._id}`} className="btn btn-sm btn-secondary">📊 Results</Link>
                        )}
                      </div>
                    ) : (
                      <Link to={`/voter/elections/${e._id}`} className={`btn btn-sm ${e.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}>
                        {e.status === 'active' ? '🗳️ Vote Now' : e.status === 'upcoming' ? '👁️ Details' : '📊 Results'}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
