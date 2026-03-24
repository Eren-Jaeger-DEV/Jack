import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Save, ArrowLeft, Shield, Users } from 'lucide-react';

const RoleMapping = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    roles: {
      owner: '',
      manager: '',
      admin: '',
      contributor: ''
    }
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, rolesRes] = await Promise.all([
          api.get(`/guilds/${id}/config`),
          api.get(`/guilds/${id}/roles`)
        ]);
        
        setConfig(prev => ({
          ...prev,
          roles: { ...prev.roles, ...configRes.data.roles }
        }));
        setRoles(rolesRes.data || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/guilds/${id}/config`, {
        roles: config.roles
      });
      alert('Role mapping saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateRole = (key, value) => {
    setConfig({
      ...config,
      roles: { ...config.roles, [key]: value }
    });
  };

  if (loading) return <div className="loading-container">Loading Role Mapping...</div>;

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <button onClick={() => navigate(-1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Role Mapping</h1>
        <p className="page-subtitle">Map Discord roles to internal dashboard permissions.</p>
      </div>

      <div className="glass-card settings-form">
        <h3 className="section-title"><Shield size={18} /> Permission Roles</h3>
        <p className="form-help" style={{ marginBottom: '1.5rem' }}>Discord roles mapped here will grant access levels to the dashboard and bot commands.</p>

        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label" style={{ color: '#ff4b2b' }}>Owner Role</label>
            <select className="form-input" value={config.roles.owner} onChange={(e) => updateRole('owner', e.target.value)}>
              <option value="">Select a role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#ff9068' }}>Manager Role</label>
            <select className="form-input" value={config.roles.manager} onChange={(e) => updateRole('manager', e.target.value)}>
              <option value="">Select a role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#3182ce' }}>Admin Role</label>
            <select className="form-input" value={config.roles.admin} onChange={(e) => updateRole('admin', e.target.value)}>
              <option value="">Select a role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ color: '#38a169' }}>Contributor Role</label>
            <select className="form-input" value={config.roles.contributor} onChange={(e) => updateRole('contributor', e.target.value)}>
              <option value="">Select a role...</option>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <button 
          className="primary-button" 
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2rem' }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Mapping'}
        </button>
      </div>
    </div>
  );
};

export default RoleMapping;
