import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Shield, Save, Hash, UserPlus, AlertTriangle, Link as LinkIcon, Zap, X } from 'lucide-react';
import api from '../api/client';

const ModerationSettings = () => {
  const { id: guildId } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [settings, setSettings] = useState({
    antiLink: false,
    antiSpam: false,
    blacklistedWords: [],
    maxMentions: 5,
    muteRoleId: '',
    modLogChannelId: ''
  });
  const [wordInput, setWordInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [channelsRes, rolesRes, settingsRes] = await Promise.all([
          api.get(`/guilds/${guildId}/channels`),
          api.get(`/guilds/${guildId}/roles`),
          api.get(`/moderation?guildId=${guildId}`)
        ]);
        
        setChannels(channelsRes.data);
        setRoles(rolesRes.data);
        if (settingsRes.data) {
          setSettings(settingsRes.data);
        }
      } catch (err) {
        console.error("Error fetching moderation data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await api.post('/moderation', { guildId, ...settings });
      setTimeout(() => setSaving(false), 800);
    } catch (err) {
      console.error("Error saving moderation settings:", err);
      setSaving(false);
      alert("Failed to save moderation settings.");
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const addWord = () => {
    if (!wordInput.trim()) return;
    const words = wordInput.split(',').map(w => w.trim()).filter(w => w && !settings.blacklistedWords.includes(w));
    if (words.length > 0) {
      setSettings(prev => ({
        ...prev,
        blacklistedWords: [...prev.blacklistedWords, ...words]
      }));
    }
    setWordInput('');
  };

  const removeWord = (word) => {
    setSettings(prev => ({
      ...prev,
      blacklistedWords: prev.blacklistedWords.filter(w => w !== word)
    }));
  };

  if (loading) {
    return <div className="loading-container">Loading Moderation Suite...</div>;
  }

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <Link to={`/server/${guildId}/plugins`} className="back-link">
          ← Back to Plugins
        </Link>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Shield size={32} className="text-accent" />
          Moderation & Automod
        </h1>
        <p className="text-secondary">Premium protection suite to keep your server safe from spam and toxicity.</p>
      </div>

      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '1.5rem' }}>
        
        {/* LOGGING & SYSTEM ROLES */}
        <div className="glass-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <Hash className="text-accent" />
            <h2 style={{ fontSize: '1.25rem' }}>General Configuration</h2>
          </div>
          
          <div className="form-group">
            <label className="form-label">Moderation Log Channel</label>
            <select 
              className="form-input" 
              value={settings.modLogChannelId}
              onChange={(e) => handleChange('modLogChannelId', e.target.value)}
            >
              <option value="">-- No Channel Selected --</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
            <p className="form-help">Where the bot will post moderation logs (bans, kicks, warns).</p>
          </div>

          <div className="form-group">
            <label className="form-label">Mute / Jail Role</label>
            <select 
              className="form-input" 
              value={settings.muteRoleId}
              onChange={(e) => handleChange('muteRoleId', e.target.value)}
            >
              <option value="">-- No Role Selected --</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <p className="form-help">The role given to users when they are muted via standard commands.</p>
          </div>
        </div>

        {/* AUTOMOD SUITE */}
        <div className="glass-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <Zap className="text-accent" />
            <h2 style={{ fontSize: '1.25rem' }}>Automod Protections</h2>
          </div>

          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h3 style={{ marginBottom: '4px' }}>Anti-Link Protection</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Automatically deletes messages containing unauthorized URLs.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={settings.antiLink}
                onChange={(e) => handleChange('antiLink', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="settings-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <h3 style={{ marginBottom: '4px' }}>Spam Prevention</h3>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Detects and prevents rapid message flooding.</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={settings.antiSpam}
                onChange={(e) => handleChange('antiSpam', e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>

          <div className="form-group" style={{ marginTop: '1.5rem' }}>
            <label className="form-label">Max Mentions Allowed</label>
            <input 
              type="number" 
              className="form-input" 
              min="0" 
              max="50"
              value={settings.maxMentions}
              onChange={(e) => handleChange('maxMentions', parseInt(e.target.value))}
            />
            <p className="form-help">Messages exceeding this mention count will be flagged/deleted.</p>
          </div>
        </div>

        {/* WORD FILTER */}
        <div className="glass-card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <AlertTriangle className="text-accent" />
            <h2 style={{ fontSize: '1.25rem' }}>Smart Word Filter</h2>
          </div>

          <div className="form-group">
            <label className="form-label">Add Blacklisted Words</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Separate words with commas..." 
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addWord()}
              />
              <button type="button" onClick={addWord} className="btn btn-secondary">Add</button>
            </div>
          </div>

          <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '1rem' }}>
            {settings.blacklistedWords.length === 0 && (
              <p className="text-secondary" style={{ fontSize: '0.9rem', fontStyle: 'italic' }}>No words restricted yet.</p>
            )}
            {settings.blacklistedWords.map(word => (
              <div 
                key={word} 
                className="tag" 
                style={{ 
                  background: 'rgba(255,255,255,0.07)', 
                  padding: '6px 12px', 
                  borderRadius: '20px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  border: '1px solid rgba(255,255,255,0.1)' 
                }}
              >
                <span>{word}</span>
                <X 
                  size={14} 
                  style={{ cursor: 'pointer', opacity: 0.6 }} 
                  onClick={() => removeWord(word)} 
                />
              </div>
            ))}
          </div>
          <p className="form-help" style={{ marginTop: '1rem' }}>Jack will automatically check messages against this list and take action.</p>
        </div>

        <button 
          onClick={handleSave}
          className="btn btn-discord" 
          style={{ width: '100%', marginTop: '0.5rem', display: 'flex', gap: '8px', justifyContent: 'center' }}
          disabled={saving}
        >
          {saving ? 'Applying Protocol...' : <><Save size={20} /> Deploy Moderation Rules</>}
        </button>
      </div>
    </div>
  );
};

export default ModerationSettings;
