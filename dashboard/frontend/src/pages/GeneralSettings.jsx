import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Save, ArrowLeft, Hash, MessageSquare } from 'lucide-react';

const GeneralSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState({
    prefix: 'j ',
    channels: {
      general: '',
      media: '',
      links: '',
      commands: '',
      counting: ''
    }
  });
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, channelsRes] = await Promise.all([
          api.get(`/guilds/${id}/config`),
          api.get(`/guilds/${id}/channels`)
        ]);
        
        setConfig(prev => ({
          ...prev,
          prefix: configRes.data.prefix || 'j ',
          channels: { ...prev.channels, ...configRes.data.channels }
        }));
        setChannels(channelsRes.data || []);
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
        prefix: config.prefix,
        channels: config.channels
      });
      alert('General settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateChannel = (key, value) => {
    setConfig({
      ...config,
      channels: { ...config.channels, [key]: value }
    });
  };

  if (loading) return <div className="loading-container">Loading General Settings...</div>;

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <button onClick={() => navigate(-1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">General Settings</h1>
        <p className="page-subtitle">Configure the bot's global identity and channel mapping.</p>
      </div>

      <div className="glass-card settings-form">
        <h3 className="section-title"><MessageSquare size={18} /> Basic Config</h3>
        <div className="form-group">
          <label className="form-label">Command Prefix</label>
          <input 
            type="text" 
            className="form-input" 
            value={config.prefix} 
            onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
            placeholder="e.g. j!"
          />
          <p className="form-help">The prefix used to trigger bot commands in this server (e.g. <code>jack help</code>).</p>
        </div>

        <div className="divider" style={{ margin: '2rem 0' }} />

        <h3 className="section-title"><Hash size={18} /> Channel Mapping</h3>
        <p className="form-help" style={{ marginBottom: '1.5rem' }}>Set specific channels for different bot functions.</p>

        <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">General Chat</label>
            <select className="form-input" value={config.channels.general} onChange={(e) => updateChannel('general', e.target.value)}>
              <option value="">Select a channel...</option>
              {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Media Channel</label>
            <select className="form-input" value={config.channels.media} onChange={(e) => updateChannel('media', e.target.value)}>
              <option value="">Select a channel...</option>
              {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Links Channel</label>
            <select className="form-input" value={config.channels.links} onChange={(e) => updateChannel('links', e.target.value)}>
              <option value="">Select a channel...</option>
              {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bot Commands Channel</label>
            <select className="form-input" value={config.channels.commands} onChange={(e) => updateChannel('commands', e.target.value)}>
              <option value="">Select a channel...</option>
              {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Counting Channel</label>
            <select className="form-input" value={config.channels.counting} onChange={(e) => updateChannel('counting', e.target.value)}>
              <option value="">Select a channel...</option>
              {channels.map(ch => <option key={ch.id} value={ch.id}>#{ch.name}</option>)}
            </select>
          </div>
        </div>

        <button 
          className="primary-button" 
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2rem' }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};

export default GeneralSettings;
