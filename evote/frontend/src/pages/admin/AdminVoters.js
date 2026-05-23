// src/pages/admin/AdminVoters.js
import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import './Admin.css';

export default function AdminVoters() {
  const [voters, setVoters] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterVerified, setFilterVerified] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedVoter, setSelectedVoter] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback((page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 20 });
    if (search) params.set('search', search);
    if (filterVerified) params.set('verified', filterVerified);
    if (filterStatus) params.set('status', filterStatus);

    API.get(`/admin/voters?${params}`).then(r => {
      setVoters(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, filterVerified, filterStatus]);

  useEffect(() => {
    const t = setTimeout(() => load(1), 350);
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = async (voter) => {
    setDetailLoading(true);
    setSelectedVoter({ ...voter, loading: true });
    try {
      const { data } = await API.get(`/admin/voters/${voter._id}`);
      setSelectedVoter(data.data);
    } catch { setSelectedVoter(voter); }
    setDetailLoading(false);
  };

  const toggleStatus = async (voter) => {
    try {
      await API.patch(`/admin/voters/${voter._id}/status`, { isActive: !voter.isActive });
      toast.success(`Voter ${!voter.isActive ? 'activated' : 'deactivated'}`);
      load(pagination.page);
      if (selectedVoter?._id === voter._id) setSelectedVoter(v => ({ ...v, isActive: !v.isActive }));
    } catch (err) { toast.error('Failed to update status'); }
  };

  return (
    <AppLayout title="Manage Voters">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Admin</span> / Voters</div>
          <h1 className="page-title">Voter Management</h1>
          <p className="page-subtitle">Total: {pagination.total} registered voters</p>
        </div>

        <div className="filters-bar">
          <div className="search-box" style={{ flex: 1, maxWidth: 300 }}>
            <span className="icon">🔍</span>
            <input className="form-control" placeholder="Name, email, or Voter ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-control" style={{ width: 140 }} value={filterVerified} onChange={e => setFilterVerified(e.target.value)}>
            <option value="">All</option>
            <option value="true">Verified</option>
            <option value="false">Unverified</option>
          </select>
          <select className="form-control" style={{ width: 140 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Any Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selectedVoter ? '1fr 360px' : '1fr', gap: 20 }}>
          {/* Table */}
          <div className="card" style={{ padding: 0 }}>
            <div className="table-wrapper">
              {loading ? (
                <div className="loading-screen"><div className="spinner" /></div>
              ) : voters.length === 0 ? (
                <div className="empty-state"><div className="icon">👥</div><h3>No voters found</h3></div>
              ) : (
                <table>
                  <thead>
                    <tr><th>Voter</th><th>Voter ID</th><th>Phone</th><th>Verified</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {voters.map(v => (
                      <tr key={v._id} style={{ cursor: 'pointer' }} onClick={() => openDetail(v)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="voter-row-avatar">{v.name.charAt(0)}</div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{v.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{v.email}</div>
                            </div>
                          </div>
                        </td>
                        <td><code style={{ fontSize: '0.8rem' }}>{v.voterId}</code></td>
                        <td style={{ fontSize: '0.8125rem' }}>{v.phone || '—'}</td>
                        <td>
                          <span className={`badge ${v.isVerified ? 'badge-success' : 'badge-warning'}`}>
                            {v.isVerified ? '✓ Verified' : '⏳ Pending'}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${v.isActive ? 'badge-success' : 'badge-danger'}`}>
                            {v.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            className={`btn btn-sm ${v.isActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={e => { e.stopPropagation(); toggleStatus(v); }}
                          >
                            {v.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination" style={{ padding: '16px' }}>
                <button className="page-btn" disabled={pagination.page === 1} onClick={() => load(pagination.page - 1)}>‹</button>
                {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} className={`page-btn ${p === pagination.page ? 'active' : ''}`} onClick={() => load(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={pagination.page === pagination.pages} onClick={() => load(pagination.page + 1)}>›</button>
              </div>
            )}
          </div>

          {/* Voter Detail Panel */}
          {selectedVoter && (
            <div className="card" style={{ height: 'fit-content', position: 'sticky', top: 80 }}>
              <div className="flex-between mb-4">
                <div className="card-title">Voter Details</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelectedVoter(null)}>✕</button>
              </div>

              {detailLoading ? <div className="loading-screen" style={{ minHeight: 200 }}><div className="spinner" /></div> : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 700, margin: '0 auto 10px' }}>
                      {selectedVoter.voter?.name?.charAt(0) || selectedVoter.name?.charAt(0)}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{selectedVoter.voter?.name || selectedVoter.name}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedVoter.voter?.email || selectedVoter.email}</div>
                    <code style={{ fontSize: '0.875rem', background: 'var(--bg)', padding: '4px 10px', borderRadius: 'var(--radius)', display: 'inline-block', marginTop: 6 }}>
                      {selectedVoter.voter?.voterId || selectedVoter.voterId}
                    </code>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8125rem' }}>
                    {[
                      ['📱 Phone', selectedVoter.voter?.phone || selectedVoter.phone || '—'],
                      ['✅ Verified', (selectedVoter.voter?.isVerified ?? selectedVoter.isVerified) ? 'Yes' : 'No'],
                      ['📊 Votes Cast', selectedVoter.voter?.votedElections?.length ?? selectedVoter.votedElections?.length ?? 0],
                      ['📅 Registered', new Date(selectedVoter.voter?.createdAt || selectedVoter.createdAt).toLocaleDateString('en-IN')],
                      ['🔑 Last Login', selectedVoter.voter?.lastLogin ? new Date(selectedVoter.voter.lastLogin).toLocaleDateString('en-IN') : '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        <span style={{ fontWeight: 500 }}>{String(val)}</span>
                      </div>
                    ))}
                  </div>

                  {selectedVoter.auditLogs?.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Recent Activity</div>
                      {selectedVoter.auditLogs.slice(0, 5).map(log => (
                        <div key={log._id} className="audit-entry" style={{ padding: '8px 0' }}>
                          <div className="audit-dot" style={{ background: log.severity === 'critical' ? 'var(--danger)' : log.severity === 'warning' ? 'var(--warning)' : 'var(--success)' }} />
                          <div>
                            <div className="audit-action" style={{ fontSize: '0.8125rem' }}>{log.action.replace(/_/g, ' ')}</div>
                            <div className="audit-meta">{new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
