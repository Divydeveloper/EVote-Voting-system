// src/pages/admin/AdminCandidates.js
import React, { useState, useEffect } from 'react';
import AppLayout from '../../components/shared/AppLayout';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import './Admin.css';

const EMPTY = {
  name: '', age: '', gender: '', party: '', partyAbbreviation: '',
  partyColor: '#1e40af', qualification: '', occupation: '',
  constituency: '', manifesto: '', keyPolicies: '',
  election: '', photo: '',
};

export default function AdminCandidates() {
  const [candidates, setCandidates] = useState([]);
  const [elections, setElections] = useState([]);
  const [filterElection, setFilterElection] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/elections?limit=100').then(r => {
      const all = r.data.data;
      setElections(all);
      if (all.length > 0) setFilterElection(all[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!filterElection) return;
    setLoading(true);
    API.get(`/candidates/${filterElection}`).then(r => {
      setCandidates(r.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterElection]);

  const openCreate = () => { setForm({ ...EMPTY, election: filterElection }); setEditId(null); setShowModal(true); };
  const openEdit = (c) => {
    setForm({
      name: c.name, age: c.age || '', gender: c.gender || '', party: c.party,
      partyAbbreviation: c.partyAbbreviation || '', partyColor: c.partyColor || '#1e40af',
      qualification: c.qualification || '', occupation: c.occupation || '',
      constituency: c.constituency || '', manifesto: c.manifesto || '',
      keyPolicies: (c.keyPolicies || []).join('\n'), election: c.election, photo: c.photo || '',
    });
    setEditId(c._id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      age: form.age ? parseInt(form.age) : undefined,
      keyPolicies: form.keyPolicies ? form.keyPolicies.split('\n').map(p => p.trim()).filter(Boolean) : [],
    };
    try {
      if (editId) {
        await API.put(`/candidates/${editId}`, payload);
        toast.success('Candidate updated!');
      } else {
        await API.post('/candidates', payload);
        toast.success('Candidate added!');
      }
      setShowModal(false);
      if (filterElection) {
        API.get(`/candidates/${filterElection}`).then(r => setCandidates(r.data.data));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this candidate?')) return;
    try {
      await API.delete(`/candidates/${id}`);
      toast.success('Candidate deleted');
      setCandidates(prev => prev.filter(c => c._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const selectedElection = elections.find(e => e._id === filterElection);

  return (
    <AppLayout title="Manage Candidates">
      <div className="page-wrapper">
        <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="breadcrumb"><span>Admin</span> / Candidates</div>
            <h1 className="page-title">Manage Candidates</h1>
          </div>
          <button className="btn btn-primary" onClick={openCreate} disabled={!filterElection}>+ Add Candidate</button>
        </div>

        {/* Election filter */}
        <div className="filters-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="form-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Election:</label>
            <select className="form-control" style={{ minWidth: 260 }} value={filterElection} onChange={e => setFilterElection(e.target.value)}>
              {elections.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
            </select>
          </div>
          {selectedElection && (
            <span className={`status-pill status-${selectedElection.status}`}>
              {selectedElection.status}
            </span>
          )}
        </div>

        <div className="card">
          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : candidates.length === 0 ? (
            <div className="empty-state">
              <div className="icon">👥</div>
              <h3>No candidates yet</h3>
              <p>Add candidates to the selected election.</p>
              <button className="btn btn-primary mt-4" onClick={openCreate}>+ Add First Candidate</button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Candidate</th><th>Party</th><th>Votes</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {candidates.map(c => (
                    <tr key={c._id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{c.serialNumber}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: c.partyColor || 'var(--primary)',
                            color: '#fff', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                          }}>
                            {c.photo ? <img src={c.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : c.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.age && `Age: ${c.age}`} {c.gender && `| ${c.gender}`}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: c.partyColor, flexShrink: 0, display: 'inline-block' }} />
                          <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.partyAbbreviation || c.party}</div>
                            {c.partyAbbreviation && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.party}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{c.voteCount}</td>
                      <td>
                        <div className="table-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>✏️ Edit</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c._id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
            <div className="modal" style={{ maxWidth: 680 }}>
              <div className="modal-header">
                <div className="modal-title">{editId ? '✏️ Edit Candidate' : '➕ Add Candidate'}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>

                  <div className="form-group">
                    <label className="form-label">Election <span className="req">*</span></label>
                    <select className="form-control" required value={form.election} onChange={e => setForm({ ...form, election: e.target.value })}>
                      <option value="">Select election…</option>
                      {elections.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
                    </select>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Full Name <span className="req">*</span></label>
                      <input className="form-control" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Candidate's full name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Photo URL</label>
                      <input className="form-control" value={form.photo} onChange={e => setForm({ ...form, photo: e.target.value })} placeholder="https://..." />
                    </div>
                  </div>

                  <div className="form-grid-3">
                    <div className="form-group">
                      <label className="form-label">Age</label>
                      <input type="number" className="form-control" min={18} max={120} value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select className="form-control" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}>
                        <option value="">Select…</option>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Party Color</label>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="color" style={{ width: 40, height: 38, padding: 2, border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }} value={form.partyColor} onChange={e => setForm({ ...form, partyColor: e.target.value })} />
                        <input className="form-control" value={form.partyColor} onChange={e => setForm({ ...form, partyColor: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Party Name <span className="req">*</span></label>
                      <input className="form-control" required value={form.party} onChange={e => setForm({ ...form, party: e.target.value })} placeholder="e.g. Bharatiya Janata Party" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Party Abbreviation</label>
                      <input className="form-control" value={form.partyAbbreviation} onChange={e => setForm({ ...form, partyAbbreviation: e.target.value })} placeholder="e.g. BJP" />
                    </div>
                  </div>

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Qualification</label>
                      <input className="form-control" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. M.A. Political Science" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Occupation</label>
                      <input className="form-control" value={form.occupation} onChange={e => setForm({ ...form, occupation: e.target.value })} placeholder="e.g. Politician" />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Manifesto</label>
                    <textarea className="form-control" rows={3} value={form.manifesto} onChange={e => setForm({ ...form, manifesto: e.target.value })} placeholder="Candidate's election manifesto..." />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Key Policies <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(one per line)</span></label>
                    <textarea className="form-control" rows={3} value={form.keyPolicies} onChange={e => setForm({ ...form, keyPolicies: e.target.value })} placeholder={'Digital India\nFree Education\nClean Energy'} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editId ? '💾 Update' : '✅ Add Candidate'}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
