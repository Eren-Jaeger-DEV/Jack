import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings, Save, AlertCircle, Users, Image as ImageIcon, MessageSquare, Hash } from 'lucide-react';
import api from '../api/client';

const WelcomeSettings = () => {
  const { id: guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [settings, setSettings] = useState({
    enabled: false,
    channelId: '',
    message: 'Welcome {user} to {server}!',
    dmEnabled: false,
    dmMessage: 'Welcome to the server!',
    imageCardEnabled: true,
    backgroundImageUrl: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [channelsRes, settingsRes] = await Promise.all([
          api.get(`/guilds/${guildId}/channels`),
          api.get(`/welcome?guildId=${guildId}`)
        ]);
        
        setChannels(channelsRes.data);
        if (settingsRes.data && Object.keys(settingsRes.data).length > 0) {
          setSettings(prev => ({ ...prev, ...settingsRes.data }));
        }
      } catch (err) {
        console.error("Error fetching welcome settings data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/welcome', { guildId, ...settings });
      // Minor delay to show saving state
      setTimeout(() => setSaving(false), 800);
    } catch (err) {
      console.error("Error saving:", err);
      setSaving(false);
      alert("Failed to save welcome settings.");
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="loading-container">Loading Welcome Configuration...</div>;
  }

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <Link to={`/server/${guildId}/plugins`} className="back-link">
          ← Back to Plugins
        </Link>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={32} className="text-accent" />
          Welcome & Greetings
        </h1>
        <p className="text-secondary">Configure what happens when a new member joins your server.</p>
      </div>

      <form onSubmit={handleSave} className="settings-form glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Enable Welcome Module</h2>
            <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Turns on join messages and image cards.</p>
          </div>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.enabled}
              onChange={(e) => handleChange('enabled', e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>

        <div className="form-group">
          <label className="form-label">
            <Hash size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Welcome Channel
          </label>
          <select 
            className="form-input" 
            value={settings.channelId}
            onChange={(e) => handleChange('channelId', e.target.value)}
            disabled={!settings.enabled}
            required={settings.enabled}
          >
            <option value="">-- Select a Channel --</option>
            {channels.map(c => (
              <option key={c.id} value={c.id}>#{c.name}</option>
            ))}
          </select>
          <p className="form-help">The channel where the bot will post the welcome banner.</p>
        </div>

        <div className="form-group">
          <label className="form-label">
            <MessageSquare size={16} style={{ display: 'inline', marginRight: '8px' }} />
            Welcome Message (Chat)
          </label>
          <textarea 
            className="form-input" 
            value={settings.message}
            onChange={(e) => handleChange('message', e.target.value)}
            disabled={!settings.enabled}
            rows={4}
            placeholder="Welcome {user} to {server}!"
          />
          <div className="form-help" style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <strong>Variables you can use:</strong>
            <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <li><code>{'{user}'}</code> - @Mentions the user</li>
              <li><code>{'{server}'}</code> - The server name</li>
              <li><code>{'{membercount}'}</code> - Total server members</li>
              <li><code>{'{username}'}</code> - The user's name (no tag)</li>
            </ul>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '2rem 0', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Visual Welcome Cards</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Generates a beautiful customized greeting image.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={settings.imageCardEnabled}
                onChange={(e) => handleChange('imageCardEnabled', e.target.checked)}
                disabled={!settings.enabled}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className={`transition-opacity duration-300 ${!settings.imageCardEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="form-group">
              <label className="form-label">
                <ImageIcon size={16} style={{ display: 'inline', marginRight: '8px' }} />
                Custom Background Image URL (Optional)
              </label>
              <input 
                type="url" 
                className="form-input" 
                value={settings.backgroundImageUrl}
                onChange={(e) => handleChange('backgroundImageUrl', e.target.value)}
                placeholder="https://example.com/image.png"
                disabled={!settings.enabled || !settings.imageCardEnabled}
              />
              <p className="form-help">Provide a direct link to an image. Leave blank to use the default server banner.</p>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-discord" 
          style={{ width: '100%', marginTop: '1rem', display: 'flex', gap: '8px' }}
          disabled={saving}
        >
          {saving ? 'Saving Changes...' : <><Save size={20} /> Save Configuration</>}
        </button>
      </form>
    </div>
  );
};

export default WelcomeSettings;
