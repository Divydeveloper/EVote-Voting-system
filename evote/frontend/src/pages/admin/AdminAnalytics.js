// src/pages/admin/AdminAnalytics.js
import React, { useState, useEffect } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import './Admin.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminAnalytics() {
  const [elections, setElections] = useState([]);
  const [selected, setSelected] = useState('');
  const [liveData, setLiveData] = useState(null);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/elections?limit=50'),
      API.get('/admin/dashboard'),
    ]).then(([eRes, dRes]) => {
      setElections(eRes.data.data);
      setDashData(dRes.data.data);
      if (eRes.data.data.length > 0) setSelected(eRes.data.data[0]._id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    API.get(`/votes/live/${selected}`).then(r => setLiveData(r.data.data)).catch(() => {});
  }, [selected]);

  if (loading) return <AppLayout title="Analytics"><div className="loading-screen"><div className="spinner spinner-lg" /></div></AppLayout>;

  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#db2777'];

  const candidateBarData = liveData ? {
    labels: liveData.candidates.map(c => c.name),
    datasets: [{
      label: 'Votes',
      data: liveData.candidates.map(c => c.voteCount),
      backgroundColor: liveData.candidates.map((_, i) => COLORS[i % COLORS.length]),
      borderRadius: 6,
      borderSkipped: false,
    }],
  } : null;

  const doughnutData = liveData ? {
    labels: liveData.candidates.map(c => c.name),
    datasets: [{
      data: liveData.candidates.map(c => c.voteCount),
      backgroundColor: liveData.candidates.map((c, i) => c.partyColor || COLORS[i % COLORS.length]),
      borderWidth: 2, borderColor: 'var(--bg-card)',
    }],
  } : null;

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
  const votesMap = Object.fromEntries((dashData?.votesByDay || []).map(v => [v._id, v.count]));
  const regsMap = Object.fromEntries((dashData?.regsByDay || []).map(v => [v._id, v.count]));

  const activityData = {
    labels: last7Days.map(d => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
    datasets: [
      { label: 'Votes', data: last7Days.map(d => votesMap[d] || 0), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.1)', fill: true, tension: 0.4 },
      { label: 'New Voters', data: last7Days.map(d => regsMap[d] || 0), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.4 },
    ],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } };
  const barOpts = { ...chartOpts, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } } } };

  const selectedElection = elections.find(e => e._id === selected);

  return (
    <AppLayout title="Analytics">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Admin</span> / Analytics</div>
          <h1 className="page-title">Election Analytics</h1>
        </div>

        {/* Election Picker */}
        <div className="card mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Select Election:</label>
            <select className="form-control" style={{ maxWidth: 400 }} value={selected} onChange={e => setSelected(e.target.value)}>
              {elections.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
            </select>
            {liveData && (
              <div style={{ display: 'flex', gap: 16, marginLeft: 'auto', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Votes', value: liveData.election?.totalVotesCast || 0, color: '#2563eb' },
                  { label: 'Total Voters', value: liveData.election?.totalVoters || 0, color: '#16a34a' },
                  { label: 'Turnout', value: `${liveData.turnout}%`, color: '#d97706' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value.toLocaleString()}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {liveData && liveData.candidates?.length > 0 ? (
          <>
            {/* Winner Highlight */}
            {liveData.candidates[0]?.voteCount > 0 && (
              <div className="winner-card mb-6">
                <div className="winner-crown-big">🏆</div>
                <div className="winner-name">{liveData.candidates[0].name}</div>
                <div className="winner-party">
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: liveData.candidates[0].partyColor, display: 'inline-block', marginRight: 6 }} />
                  {liveData.candidates[0].party || 'Independent'}
                </div>
                <div className="winner-votes">{liveData.candidates[0].voteCount} Votes</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  {liveData.election?.totalVotesCast > 0
                    ? `${((liveData.candidates[0].voteCount / liveData.election.totalVotesCast) * 100).toFixed(1)}% of total votes`
                    : 'Leading'}
                </div>
              </div>
            )}

            <div className="grid-2 mb-6">
              {/* Bar Chart */}
              <div className="card">
                <div className="card-header"><div className="card-title">📊 Votes by Candidate</div></div>
                <div style={{ height: 280 }}>
                  <Bar data={candidateBarData} options={barOpts} />
                </div>
              </div>

              {/* Doughnut */}
              <div className="card">
                <div className="card-header"><div className="card-title">🥧 Vote Share</div></div>
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Doughnut data={doughnutData} options={{ ...chartOpts, cutout: '60%' }} />
                </div>
              </div>
            </div>

            {/* Candidate Results Table */}
            <div className="card mb-6">
              <div className="card-header"><div className="card-title">📋 Detailed Results</div></div>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Rank</th><th>Candidate</th><th>Party</th><th>Votes</th><th>Share</th><th>Bar</th></tr></thead>
                  <tbody>
                    {[...liveData.candidates].sort((a, b) => b.voteCount - a.voteCount).map((c, i) => {
                      const pct = liveData.election?.totalVotesCast > 0 ? ((c.voteCount / liveData.election.totalVotesCast) * 100).toFixed(1) : 0;
                      return (
                        <tr key={c._id}>
                          <td>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</td>
                          <td style={{ fontWeight: i === 0 ? 700 : 400 }}>{c.name}</td>
                          <td>
                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.partyColor || COLORS[i], display: 'inline-block', marginRight: 6 }} />
                            {c.party}
                          </td>
                          <td style={{ fontWeight: 700 }}>{c.voteCount}</td>
                          <td style={{ fontWeight: 500 }}>{pct}%</td>
                          <td style={{ width: 160 }}>
                            <div className="progress">
                              <div className="progress-bar" style={{ width: `${pct}%`, background: c.partyColor || COLORS[i % COLORS.length] }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state"><div className="icon">📊</div><h3>No vote data yet</h3><p>Select an active election to see analytics.</p></div>
        )}

        {/* Platform Activity Chart */}
        <div className="card">
          <div className="card-header"><div className="card-title">📈 Platform Activity — Last 7 Days</div></div>
          <div style={{ height: 260 }}>
            <Line data={activityData} options={{ ...barOpts, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } }} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
