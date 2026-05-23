// src/pages/voter/VoterDashboard.js
import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../utils/api';
import './Voter.css';

export default function VoterDashboard() {
  const { user } = useAuth();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/elections?limit=6').then(r => {
      setElections(r.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const activeElections = elections.filter(e => e.status === 'active');
  const upcomingElections = elections.filter(e => e.status === 'upcoming');
  const votedCount = user?.votedElections?.length || 0;

  const statusBadge = (status) => {
    const map = {
      active: { cls: 'badge-success', label: '🟢 Active' },
      upcoming: { cls: 'badge-warning', label: '⏳ Upcoming' },
      ended: { cls: 'badge-gray', label: '⬜ Ended' },
      results_declared: { cls: 'badge-info', label: '📊 Results' },
    };
    return map[status] || { cls: 'badge-gray', label: status };
  };

  return (
    <AppLayout title="Voter Dashboard">
      <div className="page-wrapper">

        {/* Welcome Banner */}
        <div className="welcome-banner">
          <div className="welcome-content">
            <h2>Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
            <p>Your vote is your voice. Exercise your democratic right responsibly.</p>
            <div className="voter-id-chip">
              <span>🪪 Voter ID:</span>
              <strong>{user?.voterId || 'N/A'}</strong>
            </div>
          </div>
          <div className="welcome-graphic">🗳️</div>
        </div>

        {/* Verification Warning */}
        {!user?.isVerified && (
          <div className="alert alert-warning">
            ⚠️ <strong>Email not verified.</strong> You must verify your email to cast votes.{' '}
            <button style={{ color: 'inherit', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Resend verification OTP
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid-4 mb-6">
          {[
            { icon: '🗳️', value: activeElections.length, label: 'Active Elections', color: '#16a34a', bg: '#dcfce7' },
            { icon: '⏳', value: upcomingElections.length, label: 'Upcoming Elections', color: '#d97706', bg: '#fef3c7' },
            { icon: '✅', value: votedCount, label: 'Votes Cast', color: '#1d4ed8', bg: '#dbeafe' },
            { icon: '📊', value: elections.filter(e => e.status === 'results_declared').length, label: 'Results Declared', color: '#7c3aed', bg: '#ede9fe' },
          ].map((s, i) => (
            <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
              </div>
              <div className="stat-content">
                <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Active Elections */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            {activeElections.length > 0 && (
              <div className="mb-6">
                <div className="section-heading">
                  <h3>🟢 Active Elections — Vote Now!</h3>
                  <Link to="/voter/elections" className="btn btn-ghost btn-sm">View All →</Link>
                </div>
                <div className="elections-grid">
                  {activeElections.map(election => (
                    <ElectionCard key={election._id} election={election} hasVoted={user?.votedElections?.some(id => id === election._id || id?._id === election._id)} />
                  ))}
                </div>
              </div>
            )}

            {upcomingElections.length > 0 && (
              <div className="mb-6">
                <div className="section-heading">
                  <h3>⏳ Upcoming Elections</h3>
                </div>
                <div className="elections-grid">
                  {upcomingElections.map(election => (
                    <ElectionCard key={election._id} election={election} hasVoted={false} />
                  ))}
                </div>
              </div>
            )}

            {elections.length === 0 && (
              <div className="empty-state">
                <div className="icon">🗳️</div>
                <h3>No Elections Available</h3>
                <p>There are no elections scheduled at this time. Check back later.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}

function ElectionCard({ election, hasVoted }) {
  const now = new Date();
  const end = new Date(election.endDate);
  const start = new Date(election.startDate);

  const timeRemaining = election.status === 'active'
    ? Math.max(0, end - now)
    : Math.max(0, start - now);

  const hrs = Math.floor(timeRemaining / 3600000);
  const mins = Math.floor((timeRemaining % 3600000) / 60000);

  const turnout = election.totalVoters > 0
    ? ((election.totalVotesCast / election.totalVoters) * 100).toFixed(1)
    : 0;

  return (
    <div className="election-card">
      <div className="election-card-header">
        <div className="election-type-badge">{election.electionType?.toUpperCase()}</div>
        <div className={`badge ${election.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
          {election.status === 'active' ? '🟢 Active' : '⏳ Upcoming'}
        </div>
      </div>

      <h4 className="election-title">{election.title}</h4>

      {election.constituency && (
        <div className="election-meta">📍 {election.constituency}</div>
      )}

      {election.status === 'active' && (
        <>
          <div className="election-timer">
            ⏰ {hrs}h {mins}m remaining
          </div>
          <div style={{ margin: '10px 0' }}>
            <div className="flex-between text-sm text-secondary mb-1">
              <span>Voter Turnout</span>
              <span>{turnout}%</span>
            </div>
            <div className="progress">
              <div className="progress-bar" style={{ width: `${turnout}%`, background: turnout > 50 ? 'var(--success)' : 'var(--primary)' }} />
            </div>
          </div>
        </>
      )}

      <div className="election-candidates-count">
        👥 {election.candidates?.length || 0} Candidates
      </div>

      <div className="election-card-footer">
        {hasVoted ? (
          <div className="voted-badge">✅ You have voted</div>
        ) : (
          <Link to={`/voter/elections/${election._id}`}
            className={`btn btn-sm ${election.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}>
            {election.status === 'active' ? '🗳️ Vote Now' : '👁️ View Details'}
          </Link>
        )}
      </div>
    </div>
  );
}
