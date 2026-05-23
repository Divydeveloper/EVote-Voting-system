// src/pages/voter/ElectionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import './Voter.css';

export default function ElectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [election, setElection] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [voteResult, setVoteResult] = useState(null);
  const [expandedCandidate, setExpandedCandidate] = useState(null);

  useEffect(() => {
    API.get(`/elections/${id}`).then(r => {
      setElection(r.data.data);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load election'); setLoading(false); });
  }, [id]);

  const handleVote = async () => {
    if (!selectedCandidate) { toast.error('Please select a candidate'); return; }
    setVoting(true);
    try {
      const { data } = await API.post('/votes/cast', {
        electionId: id,
        candidateId: selectedCandidate._id,
      });
      setVoteResult(data.data);
      setConfirmOpen(false);
      // Update user locally
      const updatedUser = { ...user, votedElections: [...(user.votedElections || []), id] };
      updateUser(updatedUser);
      toast.success('Vote cast successfully! 🎉');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cast vote');
      setConfirmOpen(false);
    } finally { setVoting(false); }
  };

  if (loading) return <AppLayout title="Election"><div className="loading-screen"><div className="spinner spinner-lg" /></div></AppLayout>;
  if (!election) return <AppLayout title="Election"><div className="page-wrapper"><div className="alert alert-danger">Election not found.</div></div></AppLayout>;

  const hasVoted = election.hasVoted || voteResult;
  const isActive = election.status === 'active';
  const now = new Date();
  const end = new Date(election.endDate);
  const hrs = Math.floor(Math.max(0, end - now) / 3600000);
  const mins = Math.floor((Math.max(0, end - now) % 3600000) / 60000);

  return (
    <AppLayout title={election.title}>
      <div className="page-wrapper">

        {/* Election Header */}
        <div className="card mb-6" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff', border: 'none' }}>
          <div className="flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.7, marginBottom: 6 }}>
                {election.electionType} Election
              </div>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.2rem, 3vw, 1.75rem)', marginBottom: 6 }}>
                {election.title}
              </h1>
              {election.constituency && (
                <div style={{ opacity: 0.8, fontSize: '0.875rem' }}>📍 {election.constituency}{election.region ? `, ${election.region}` : ''}</div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: 4 }}>STATUS</div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700 }}>
                {isActive ? `⏰ ${hrs}h ${mins}m left` : election.status.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 4 }}>
                {election.totalVotesCast} votes cast
              </div>
            </div>
          </div>
        </div>

        {/* Vote Success Screen */}
        {voteResult && (
          <div className="vote-confirm-card" style={{ margin: '0 auto 24px', maxWidth: '100%' }}>
            <div className="vote-success-icon">✅</div>
            <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: 8 }}>Vote Cast Successfully!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              You voted for <strong>{voteResult.candidateName}</strong> ({voteResult.candidateParty})
            </p>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Vote Reference Hash:</div>
            <div className="vote-hash">{voteResult.voteHash}</div>
            <p className="text-sm text-muted">Save this hash to verify your vote at any time.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
              <button className="btn btn-secondary" onClick={() => navigate('/voter/dashboard')}>← Dashboard</button>
              <button className="btn btn-primary" onClick={() => navigate(`/voter/verify-vote`)}>🔍 Verify Vote</button>
            </div>
          </div>
        )}

        {/* Candidates */}
        {!voteResult && (
          <>
            <div className="flex-between mb-4">
              <h3 style={{ fontWeight: 600 }}>👥 Candidates ({election.candidates?.length})</h3>
              {isActive && !hasVoted && selectedCandidate && (
                <button className="btn btn-primary" onClick={() => setConfirmOpen(true)}>
                  🗳️ Confirm Vote →
                </button>
              )}
            </div>

            {hasVoted && (
              <div className="alert alert-success mb-4">✅ You have already cast your vote in this election.</div>
            )}

            {!isActive && election.status === 'upcoming' && (
              <div className="alert alert-warning mb-4">⏳ This election has not started yet. Voting opens on {new Date(election.startDate).toLocaleDateString('en-IN', { dateStyle: 'full' })}.</div>
            )}

            <div className="candidates-grid">
              {election.candidates?.map(candidate => (
                <CandidateCard
                  key={candidate._id}
                  candidate={candidate}
                  selected={selectedCandidate?._id === candidate._id}
                  canVote={isActive && !hasVoted}
                  onSelect={() => setSelectedCandidate(candidate)}
                  expanded={expandedCandidate === candidate._id}
                  onExpand={() => setExpandedCandidate(expandedCandidate === candidate._id ? null : candidate._id)}
                />
              ))}
            </div>
          </>
        )}

        {/* Confirm Modal */}
        {confirmOpen && selectedCandidate && (
          <div className="vote-confirm-overlay">
            <div className="vote-confirm-card">
              <h3 style={{ fontFamily: 'var(--font-serif)', marginBottom: 16 }}>Confirm Your Vote</h3>
              <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: 20 }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                  {selectedCandidate.photo ? <img src={selectedCandidate.photo} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} /> : '👤'}
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{selectedCandidate.name}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                  <span className="party-color-dot" style={{ background: selectedCandidate.partyColor }} />
                  {selectedCandidate.party}
                </div>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
                ⚠️ <strong>This action cannot be undone.</strong> You can only vote once per election. Please confirm your choice.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setConfirmOpen(false)}>Cancel</button>
                <button className="btn btn-success" style={{ flex: 1 }} onClick={handleVote} disabled={voting}>
                  {voting ? '⏳ Submitting...' : '✅ Cast My Vote'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function CandidateCard({ candidate, selected, canVote, onSelect, expanded, onExpand }) {
  return (
    <div
      className={`candidate-card ${selected ? 'selected' : ''}`}
      style={{ '--party-color': candidate.partyColor || '#1e3a8a' }}
      onClick={canVote ? onSelect : undefined}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: candidate.partyColor || 'var(--primary)', borderRadius: '10px 10px 0 0' }} />
      <div className="candidate-serial">{candidate.serialNumber}</div>
      {selected && <div className="selected-check">✓</div>}

      <div className="candidate-photo">
        {candidate.photo ? <img src={candidate.photo} alt={candidate.name} /> : '👤'}
      </div>

      <div className="candidate-name">{candidate.name}</div>
      <div className="candidate-party">
        <span className="party-color-dot" style={{ background: candidate.partyColor }} />
        {candidate.partyAbbreviation ? `${candidate.partyAbbreviation} — ` : ''}{candidate.party}
      </div>
      {candidate.age && <div className="candidate-meta">Age: {candidate.age} | {candidate.gender}</div>}
      {candidate.qualification && <div className="candidate-meta">{candidate.qualification}</div>}

      {candidate.manifesto && (
        <div style={{ marginTop: 8 }}>
          <button
            className="btn btn-ghost btn-sm w-full"
            style={{ fontSize: '0.75rem', justifyContent: 'center' }}
            onClick={e => { e.stopPropagation(); onExpand(); }}
          >
            {expanded ? '▲ Hide Manifesto' : '▼ View Manifesto'}
          </button>
          {expanded && (
            <div style={{ marginTop: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg)', padding: 10, borderRadius: 'var(--radius)' }}>
              {candidate.manifesto}
              {candidate.keyPolicies?.length > 0 && (
                <ul style={{ marginTop: 8, paddingLeft: 16 }}>
                  {candidate.keyPolicies.map((p, i) => <li key={i} style={{ marginBottom: 3 }}>• {p}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
