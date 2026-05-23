// src/pages/admin/AdminElections.js
import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import './Admin.css';

const EMPTY_FORM = {
  title: '', description: '', electionType: 'general',
  startDate: '', endDate: '', constituency: '', region: '',
};

export default function AdminElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const load = () => {
    setLoading(true);
    API.get('/elections?limit=50').then(r => { setElections(r.data.data); setLoading(false); })
      .catch(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (e) => {
    setForm({
      title: e.title, description: e.description, electionType: e.electionType,
      startDate: e.startDate?.slice(0, 16), endDate: e.endDate?.slice(0, 16),
      constituency: e.constituency || '', region: e.region || '',
    });
    setEditId(e._id);
    setShowModal(true);
  };

  const handleSave = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/elections/${editId}`, form);
        toast.success('Election updated!');
      } else {
        await API.post('/elections', form);
        toast.success('Election created!');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id, status) => {
    const labels = { active: 'start', ended: 'end', results_declared: 'publish results for' };
    if (!window.confirm(`Are you sure you want to ${labels[status] || 'update'} this election?`)) return;
    try {
      await API.patch(`/elections/${id}/status`, { status });
      toast.success('Status updated!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this election? This cannot be undone.')) return;
    try {
      await API.delete(`/elections/${id}`);
      toast.success('Election deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const filtered = elections.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    (e.constituency || '').toLowerCase().includes(search.toLowerCase())
  );

  const statusPill = (status) => (
    <span className={`status-pill status-${status}`}>
      {{ draft: '📝', upcoming: '⏳', active: '🟢', ended: '⬜', results_declared: '📊' }[status]} {status.replace('_', ' ')}
    </span>
  );

  return (
    <AppLayout title="Manage Elections">
      <div className="page-wrapper">
        <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="breadcrumb"><span>Admin</span> / Elections</div>
            <h1 className="page-title">Manage Elections</h1>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ Create Election</button>
        </div>

        <div className="filters-bar">
          <div className="search-box" style={{ flex: 1, maxWidth: 360 }}>
            <span className="icon">🔍</span>
            <input className="form-control" placeholder="Search elections..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-screen"><div className="spinner" /></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="icon">🗳️</div><h3>No elections found</h3><p>Create your first election to get started.</p></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Election</th>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Votes</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e._id}>
                      <td>
                        <div style={{ fontWeight: 600, maxWidth: 220 }} className="truncate">{e.title}</div>
                        {e.constituency && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍 {e.constituency}</div>}
                      </td>
                      <td><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{e.electionType}</span></td>
                      <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(e.startDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>{new Date(e.endDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 600 }}>{e.totalVotesCast || 0}</td>
                      <td>{statusPill(e.status)}</td>
                      <td>
                        <div className="table-actions">
                          {e.status === 'draft' && <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(e._id, 'upcoming')}>Publish</button>}
                          {e.status === 'upcoming' && <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(e._id, 'active')}>▶ Start</button>}
                          {e.status === 'active' && <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(e._id, 'ended')}>⏹ End</button>}
                          {e.status === 'ended' && <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(e._id, 'results_declared')}>📊 Publish</button>}
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}>✏️</button>
                          {['draft', 'upcoming'].includes(e.status) && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(e._id)}>🗑️</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="modal" style={{ maxWidth: 600 }}>
              <div className="modal-header">
                <div className="modal-title">{editId ? '✏️ Edit Election' : '➕ Create Election'}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Election Title <span className="req">*</span></label>
                    <input className="form-control" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. General Elections 2025 — Lok Sabha" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description <span className="req">*</span></label>
                    <textarea className="form-control" required rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this election..." />
                  </div>
                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Type</label>
                      <select className="form-control" value={form.electionType} onChange={e => setForm({ ...form, electionType: e.target.value })}>
                        {['general', 'state', 'local', 'college', 'corporate', 'other'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Constituency</label>
                      <input className="form-control" value={form.constituency} onChange={e => setForm({ ...form, constituency: e.target.value })} placeholder="e.g. New Delhi" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Region / State</label>
                      <input className="form-control" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="e.g. Delhi" />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Start Date & Time <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" required value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">End Date & Time <span className="req">*</span></label>
                      <input type="datetime-local" className="form-control" required value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? '💾 Update' : '✅ Create'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
