import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Zap, Plus, Trash2, Edit2, Shield, MessageSquare, Filter, Save, X, PlusCircle, MinusCircle } from 'lucide-react';

const Triggers = () => {
  const { id: paramId } = useParams();
  let id = paramId;

  // Last resort failsafe: parse from URL
  if (!id || id === 'undefined') {
    const parts = window.location.pathname.split('/');
    const serverIdx = parts.indexOf('server');
    if (serverIdx !== -1 && parts[serverIdx + 1]) {
      id = parts[serverIdx + 1];
    }
  }
  const navigate = useNavigate();
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  
  // Discord Data
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);

  // Form State
  const initialForm = {
    trigger: '',
    matchType: 'substring',
    response: '',
    actions: {
      addRoles: [],
      removeRoles: [],
      deleteTriggeringMessage: false,
      dmResponse: false
    },
    filters: {
      allowedChannels: [],
      ignoredChannels: [],
      allowedRoles: [],
      ignoredRoles: []
    },
    enabled: true
  };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [trigRes, rolesRes, chanRes] = await Promise.all([
          api.get(`/guilds/${id}/triggers`),
          api.get(`/guilds/${id}/roles`),
          api.get(`/guilds/${id}/channels`)
        ]);
        setTriggers(trigRes.data);
        setRoles(rolesRes.data);
        setChannels(chanRes.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch data:', err);
        if (err.response) {
          console.error('Response data:', err.response.data);
          console.error('Response status:', err.response.status);
        }
        setError('Failed to load triggers.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleToggle = async (trig) => {
    try {
      const updated = { ...trig, enabled: !trig.enabled };
      await api.put(`/guilds/${id}/triggers/${trig._id}`, updated);
      setTriggers(prev => prev.map(t => t._id === trig._id ? updated : t));
    } catch (err) {
      alert("Failed to toggle trigger");
    }
  };

  const handleDelete = async (trigId) => {
    if (!window.confirm("Permanently delete this trigger?")) return;
    try {
      await api.delete(`/guilds/${id}/triggers/${trigId}`);
      setTriggers(prev => prev.filter(t => t._id !== trigId));
    } catch (err) {
      alert("Failed to delete trigger");
    }
  };

  const openModal = (trig = null) => {
    if (trig) {
      setEditingTrigger(trig);
      setFormData({
        ...initialForm,
        ...trig,
        actions: { ...initialForm.actions, ...trig.actions },
        filters: { ...initialForm.filters, ...trig.filters }
      });
    } else {
      setEditingTrigger(null);
      setFormData(initialForm);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTrigger) {
        const res = await api.put(`/guilds/${id}/triggers/${editingTrigger._id}`, formData);
        setTriggers(prev => prev.map(t => t._id === editingTrigger._id ? res.data : t));
      } else {
        const res = await api.post(`/guilds/${id}/triggers`, formData);
        setTriggers(prev => [res.data, ...prev]);
      }
      setShowModal(false);
    } catch (err) {
      console.error("Failed to save trigger:", err);
      if (err.response) {
        console.error('Response data:', err.response.data);
        console.error('Response status:', err.response.status);
      }
      alert("Failed to save trigger. Check console for details.");
    }
  };

  if (loading && triggers.length === 0) return <div className="loading-container">Loading Triggers...</div>;

  return (
    <div className="page-container fade-in" style={{maxWidth: '1200px'}}>
      <div className="overview-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 className="page-title" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <Zap size={28} /> Custom Triggers
          </h1>
          <p className="page-subtitle">Configure automated responses and actions (Carl-bot style).</p>
        </div>
        <button className="primary-button" onClick={() => openModal()} style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <Plus size={18} /> New Trigger
        </button>
      </div>

      <div className="triggers-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem', marginTop: '2rem'}}>
        {triggers.length === 0 ? (
          <div className="glass-card" style={{gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No triggers created yet. Click "New Trigger" to get started!
          </div>
        ) : (
          triggers.map((trig) => (
            <div key={trig._id} className={`glass-card trigger-card ${trig.enabled ? 'enabled' : 'disabled'}`} style={{padding: '1.5rem', borderLeft: '4px solid ' + (trig.enabled ? 'var(--primary)' : '#444')}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem'}}>
                <div>
                  <span className="status-badge" style={{background: 'rgba(255,255,255,0.05)', fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '8px', display: 'inline-block'}}>
                    {trig.matchType} match
                  </span>
                  <h3 style={{fontSize: '1.2rem', fontWeight: 600, wordBreak: 'break-all'}}>{trig.trigger}</h3>
                </div>
                <div className="plugin-toggle">
                  <label className="switch">
                    <input type="checkbox" checked={trig.enabled} onChange={() => handleToggle(trig)} />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
              
              <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>
                {trig.response || <span style={{fontStyle: 'italic'}}>No response (Actions only)</span>}
              </div>

              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div style={{display: 'flex', gap: '8px'}}>
                  {trig.actions.addRoles?.length > 0 && <Shield size={14} title="Adds Roles" color="var(--success)" />}
                  {trig.actions.deleteTriggeringMessage && <Trash2 size={14} title="Deletes Message" color="var(--danger)" />}
                  {trig.filters.allowedChannels?.length > 0 && <Filter size={14} title="Channel Restricted" color="var(--primary)" />}
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button className="icon-btn" onClick={() => openModal(trig)}><Edit2 size={16} /></button>
                  <button className="icon-btn" style={{color: 'var(--danger)'}} onClick={() => handleDelete(trig._id)}><Trash2 size={16} /></button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="modal-overlay fade-in" style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '20px'}}>
          <form className="glass-card" onSubmit={handleSubmit} style={{maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '0'}}>
            <div className="panel-header" style={{position: 'sticky', top: 0, zIndex: 10, background: '#1a1a1a'}}>
              <h2 className="section-title" style={{margin: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
                {editingTrigger ? <Edit2 size={20} /> : <Plus size={20} />}
                {editingTrigger ? 'Edit Trigger' : 'New Trigger'}
              </h2>
              <button type="button" onClick={() => setShowModal(false)} className="icon-btn"><X size={20} /></button>
            </div>
            
            <div className="panel-content" style={{padding: '2rem'}}>
              {/* Trigger Settings */}
              <div className="settings-section" style={{marginBottom: '2rem'}}>
                <h4 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)'}}><MessageSquare size={16}/> Trigger Configuration</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                  <div className="form-group">
                    <label className="form-label">Match Type</label>
                    <select className="form-input" value={formData.matchType} onChange={(e) => setFormData({...formData, matchType: e.target.value})}>
                      <option value="substring">Contains (anywhere)</option>
                      <option value="strict">Whole Word Only</option>
                      <option value="startswith">Starts With</option>
                      <option value="endswith">Ends With</option>
                      <option value="exact">Exact Match</option>
                      <option value="regex">Regex Pattern</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Trigger Text</label>
                    <input type="text" className="form-input" required placeholder="e.g. ping" value={formData.trigger} onChange={(e) => setFormData({...formData, trigger: e.target.value})} />
                  </div>
                </div>
              </div>

              {/* Response Settings */}
              <div className="settings-section" style={{marginBottom: '2rem'}}>
                <h4 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)'}}><Save size={16}/> Response</h4>
                <div className="form-group">
                  <label className="form-label">Response Text</label>
                  <textarea 
                    className="form-input" 
                    rows="4" 
                    placeholder="Hi {user.mention}, you said {trigger}!" 
                    value={formData.response} 
                    onChange={(e) => setFormData({...formData, response: e.target.value})}
                    style={{resize: 'vertical'}}
                  />
                  <p className="form-help">Variables: {'{user}'}, {'{user.mention}'}, {'{user.id}'}, {'{channel}'}, {'{server}'}</p>
                </div>
                <div style={{display: 'flex', gap: '2rem'}}>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={formData.actions.dmResponse} onChange={(e) => setFormData({...formData, actions: {...formData.actions, dmResponse: e.target.checked}})} />
                    Send in DM instead
                  </label>
                  <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer'}}>
                    <input type="checkbox" checked={formData.actions.deleteTriggeringMessage} onChange={(e) => setFormData({...formData, actions: {...formData.actions, deleteTriggeringMessage: e.target.checked}})} />
                    Delete User's Message
                  </label>
                </div>
              </div>

              {/* Action Settings */}
              <div className="settings-section" style={{marginBottom: '2rem'}}>
                <h4 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)'}}><PlusCircle size={16}/> Role Actions</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                  <div className="form-group">
                    <label className="form-label">Roles to Add</label>
                    <div style={{maxHeight: '150px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px'}}>
                      {roles.map(role => (
                        <label key={role.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem'}}>
                          <input 
                            type="checkbox" 
                            checked={formData.actions.addRoles.includes(role.id)} 
                            onChange={(e) => {
                              const newRoles = e.target.checked 
                                ? [...formData.actions.addRoles, role.id]
                                : formData.actions.addRoles.filter(r => r !== role.id);
                              setFormData({...formData, actions: {...formData.actions, addRoles: newRoles}});
                            }}
                          />
                          <span style={{color: (role.color === '#000000' || !role.color) ? 'var(--text-primary)' : role.color}}>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Roles to Remove</label>
                    <div style={{maxHeight: '150px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px'}}>
                      {roles.map(role => (
                        <label key={role.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem'}}>
                          <input 
                            type="checkbox" 
                            checked={formData.actions.removeRoles.includes(role.id)} 
                            onChange={(e) => {
                              const newRoles = e.target.checked 
                                ? [...formData.actions.removeRoles, role.id]
                                : formData.actions.removeRoles.filter(r => r !== role.id);
                              setFormData({...formData, actions: {...formData.actions, removeRoles: newRoles}});
                            }}
                          />
                          <span style={{color: (role.color === '#000000' || !role.color) ? 'var(--text-primary)' : role.color}}>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Settings */}
              <div className="settings-section">
                <h4 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--primary)'}}><Filter size={16}/> Filters & Restrictions</h4>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                  <div className="form-group">
                    <label className="form-label">Allowed Channels</label>
                    <div style={{maxHeight: '150px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px'}}>
                      {channels.map(chan => (
                        <label key={chan.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem'}}>
                          <input 
                            type="checkbox" 
                            checked={formData.filters.allowedChannels.includes(chan.id)} 
                            onChange={(e) => {
                              const newChans = e.target.checked 
                                ? [...formData.filters.allowedChannels, chan.id]
                                : formData.filters.allowedChannels.filter(c => c !== chan.id);
                              setFormData({...formData, filters: {...formData.filters, allowedChannels: newChans}});
                            }}
                          />
                          #{chan.name}
                        </label>
                      ))}
                    </div>
                    {formData.filters.allowedChannels.length === 0 && <p className="form-help">Empty = All channels</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ignored Roles</label>
                    <div style={{maxHeight: '150px', overflowY: 'auto', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '10px'}}>
                      {roles.map(role => (
                        <label key={role.id} style={{display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0', cursor: 'pointer', fontSize: '0.85rem'}}>
                          <input 
                            type="checkbox" 
                            checked={formData.filters.ignoredRoles.includes(role.id)} 
                            onChange={(e) => {
                              const newRoles = e.target.checked 
                                ? [...formData.filters.ignoredRoles, role.id]
                                : formData.filters.ignoredRoles.filter(r => r !== role.id);
                              setFormData({...formData, filters: {...formData.filters, ignoredRoles: newRoles}});
                            }}
                          />
                          <span style={{color: (role.color === '#000000' || !role.color) ? 'var(--text-primary)' : role.color}}>{role.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel-footer" style={{background: 'rgba(255,255,255,0.02)', padding: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem'}}>
              <button type="button" onClick={() => setShowModal(false)} className="btn">Cancel</button>
              <button type="submit" className="primary-button" style={{minWidth: '150px'}}>Save Trigger</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Triggers;
