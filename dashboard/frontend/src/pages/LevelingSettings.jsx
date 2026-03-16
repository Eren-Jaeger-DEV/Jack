import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Save, ArrowLeft } from 'lucide-react';

const LevelingSettings = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ xpMultiplier: 1, announcementChannel: '' });
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/guilds/${id}/plugin/leveling`)
      .then(res => {
        setSettings(prev => ({ ...prev, ...res.data.settings }));
        setChannels(res.data.channels || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch settings:', err);
        setLoading(false);
      });
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post(`/guilds/${id}/plugin/leveling`, settings);
      alert('Settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-container">Loading Leveling Settings...</div>;

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <button onClick={() => navigate(-1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">Leveling Settings</h1>
        <p className="page-subtitle">Configure how XP and level-ups work in your server.</p>
      </div>

      <div className="glass-card settings-form">
        <div className="form-group">
          <label className="form-label">XP Multiplier</label>
          <input 
            type="number" 
            className="form-input" 
            value={settings.xpMultiplier} 
            onChange={(e) => setSettings({ ...settings, xpMultiplier: parseFloat(e.target.value) })}
            min="0.1"
            step="0.1"
          />
          <p className="form-help">Increase or decrease the amount of XP earned per message.</p>
        </div>

        <div className="form-group">
          <label className="form-label">Announcement Channel</label>
          <select 
            className="form-input" 
            value={settings.announcementChannel} 
            onChange={(e) => setSettings({ ...settings, announcementChannel: e.target.value })}
          >
            <option value="">None (Send to current channel)</option>
            {channels.map(ch => (
              <option key={ch.id} value={ch.id}>#{ch.name}</option>
            ))}
          </select>
          <p className="form-help">Select where level-up messages should be sent.</p>
        </div>

        <button 
          className="primary-button" 
          onClick={handleSave}
          disabled={saving}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '1rem' }}
        >
          <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default LevelingSettings;
