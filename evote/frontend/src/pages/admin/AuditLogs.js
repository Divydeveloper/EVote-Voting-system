// src/pages/admin/AuditLogs.js
import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import './Admin.css';

const SEV_COLOR = { info: 'badge-info', warning: 'badge-warning', critical: 'badge-danger', error: 'badge-danger' };
const SEV_DOT   = { info: '#0891b2', warning: '#d97706', critical: '#dc2626', error: '#dc2626' };

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1 });
  const [loading, setLoading] = useState(true);
  const [severity, setSeverity] = useState('');
  const [action, setAction] = useState('');

  const load = (page = 1) => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 30 });
    if (severity) params.set('severity', severity);
    if (action) params.set('action', action);
    API.get(`/audit?${params}`).then(r => {
      setLogs(r.data.data);
      setPagination(r.data.pagination);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(1); }, [severity, action]);

  return (
    <AppLayout title="Audit Logs">
      <div className="page-wrapper">
        <div className="page-header">
          <div className="breadcrumb"><span>Admin</span> / Audit Logs</div>
          <h1 className="page-title">Security & Audit Logs</h1>
          <p className="page-subtitle">Complete trail of all system events — {pagination.total} total records</p>
        </div>

        <div className="filters-bar">
          <select className="form-control" style={{ width: 140 }} value={severity} onChange={e => setSeverity(e.target.value)}>
            <option value="">All Severity</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <select className="form-control" style={{ width: 220 }} value={action} onChange={e => setAction(e.target.value)}>
            <option value="">All Actions</option>
            {['USER_LOGIN', 'USER_LOGIN_FAILED', 'VOTE_CAST', 'DUPLICATE_VOTE_ATTEMPT', 'USER_REGISTERED', 'USER_LOCKED', 'ELECTION_CREATED', 'ELECTION_STARTED', 'ELECTION_ENDED', 'PASSWORD_RESET_REQUEST'].map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state"><div className="icon">🔐</div><h3>No logs found</h3></div>
          ) : (
            <div>
              {logs.map(log => (
                <div key={log._id} className="audit-entry">
                  <div className="audit-dot" style={{ background: SEV_DOT[log.severity] || '#94a3b8', marginTop: 6 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="audit-action">{log.action.replace(/_/g, ' ')}</span>
                      <span className={`badge ${SEV_COLOR[log.severity] || 'badge-gray'}`}>{log.severity}</span>
                    </div>
                    <div className="audit-meta">
                      {log.user ? `${log.user.name || 'Unknown'} (${log.userEmail})` : log.userEmail || 'System'}
                      {log.ipAddress && ` • IP: ${log.ipAddress}`}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
                          {JSON.stringify(log.details).substring(0, 80)}{JSON.stringify(log.details).length > 80 ? '…' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(log.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'medium' })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {pagination.pages > 1 && (
            <div className="pagination" style={{ paddingTop: 16 }}>
              <button className="page-btn" disabled={pagination.page === 1} onClick={() => load(pagination.page - 1)}>‹</button>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Page {pagination.page} of {pagination.pages}</span>
              <button className="page-btn" disabled={pagination.page === pagination.pages} onClick={() => load(pagination.page + 1)}>›</button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
