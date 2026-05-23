// src/pages/admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import AppLayout from '../../components/shared/AppLayout';
import { Link } from 'react-router-dom';
import API from '../../utils/api';
import './Admin.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/admin/dashboard').then(r => {
      setData(r.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <AppLayout title="Admin Dashboard"><div className="loading-screen"><div className="spinner spinner-lg" /><p>Loading dashboard...</p></div></AppLayout>;
  if (!data) return <AppLayout title="Admin Dashboard"><div className="page-wrapper"><div className="alert alert-danger">Failed to load dashboard.</div></div></AppLayout>;

  const { stats, votesByDay, regsByDay, recentAlerts, recentVoters, electionStats } = data;

  // Chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const votesMap = Object.fromEntries((votesByDay || []).map(v => [v._id, v.count]));
  const regsMap = Object.fromEntries((regsByDay || []).map(v => [v._id, v.count]));

  const lineChartData = {
    labels: last7Days.map(d => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Votes Cast',
        data: last7Days.map(d => votesMap[d] || 0),
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)',
        fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
      },
      {
        label: 'Registrations',
        data: last7Days.map(d => regsMap[d] || 0),
        borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.08)',
        fill: true, tension: 0.4, pointRadius: 4, borderWidth: 2,
      },
    ],
  };

  const electionStatusMap = Object.fromEntries((electionStats || []).map(e => [e._id, e.count]));
  const doughnutData = {
    labels: ['Draft', 'Upcoming', 'Active', 'Ended', 'Results'],
    datasets: [{
      data: ['draft', 'upcoming', 'active', 'ended', 'results_declared'].map(s => electionStatusMap[s] || 0),
      backgroundColor: ['#94a3b8', '#d97706', '#16a34a', '#475569', '#2563eb'],
      borderWidth: 0,
    }],
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 11 } }, beginAtZero: true },
    },
  };

  const severityColor = { info: 'badge-info', warning: 'badge-warning', critical: 'badge-danger', error: 'badge-danger' };

  return (
    <AppLayout title="Admin Dashboard">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Admin</span> / Dashboard</div>
          <h1 className="page-title">Election Commission Dashboard</h1>
          <p className="page-subtitle">Overview of all elections, voters, and system activity</p>
        </div>

        {/* Stat Cards */}
        <div className="grid-4 mb-6">
          {[
            { icon: '👥', label: 'Total Voters', value: stats.totalVoters, sub: `${stats.verifiedVoters} verified`, color: '#1d4ed8', bg: '#dbeafe' },
            { icon: '🗳️', label: 'Total Elections', value: stats.totalElections, sub: `${stats.activeElections} active`, color: '#16a34a', bg: '#dcfce7' },
            { icon: '✅', label: 'Total Votes', value: stats.totalVotes, sub: 'across all elections', color: '#7c3aed', bg: '#ede9fe' },
            { icon: '👤', label: 'Candidates', value: stats.totalCandidates, sub: 'registered', color: '#d97706', bg: '#fef3c7' },
          ].map((s, i) => (
            <div className="stat-card" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="stat-icon" style={{ background: s.bg }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
              </div>
              <div className="stat-content">
                <div className="stat-value" style={{ color: s.color }}>{s.value.toLocaleString()}</div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-change">{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid-2 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">📈 Activity — Last 7 Days</div>
            </div>
            <div style={{ height: 240 }}>
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">🗳️ Elections by Status</div>
            </div>
            <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, cutout: '65%' }} />
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid-2">
          {/* Recent Voters */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">👥 Recent Registrations</div>
              <Link to="/admin/voters" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th>Voter</th><th>Voter ID</th><th>Status</th></tr></thead>
                <tbody>
                  {recentVoters?.map(v => (
                    <tr key={v._id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{v.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.email}</div>
                      </td>
                      <td><code style={{ fontSize: '0.75rem' }}>{v.voterId}</code></td>
                      <td><span className={`badge ${v.isVerified ? 'badge-success' : 'badge-warning'}`}>{v.isVerified ? 'Verified' : 'Pending'}</span></td>
                    </tr>
                  ))}
                  {!recentVoters?.length && <tr><td colSpan={3} className="text-center text-muted">No voters yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Security Alerts */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🔐 Security Alerts</div>
              <Link to="/admin/audit-logs" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentAlerts?.slice(0, 6).map(log => (
                <div key={log._id} className="alert-log-item">
                  <span className={`badge ${severityColor[log.severity] || 'badge-gray'}`}>{log.severity}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.action.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{log.userEmail || 'System'}</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {!recentAlerts?.length && <div className="empty-state" style={{ padding: 24 }}><p>No alerts</p></div>}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
