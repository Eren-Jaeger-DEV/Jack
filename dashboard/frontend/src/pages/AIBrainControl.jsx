import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

const AIBrainControl = () => {
  const { guildId } = useParams();
  const [status, setStatus] = useState(null);
  const [personality, setPersonality] = useState({
    tone: "calm",
    humor: 50,
    strictness: 50,
    verbosity: 50,
    respect_bias: 50
  });
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, personalityRes, memoryRes] = await Promise.all([
          api.get('/ai/status'),
          api.get(`/ai/personality/${guildId}`),
          api.get(`/ai/memory/${guildId}`)
        ]);
        setStatus(statusRes.data);
        setPersonality(personalityRes.data);
        setMemories(memoryRes.data);
      } catch (err) {
        console.error('Strategic Link Failure:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);

  const handleSliderChange = (key, value) => {
    setPersonality(prev => ({ ...prev, [key]: parseInt(value) }));
  };

  const savePersonality = async () => {
    setSaving(true);
    try {
      await api.post(`/ai/personality/${guildId}`, personality);
      alert('⚡ Neural Matrix Synchronized');
    } catch (err) {
      alert('❌ Matrix Sync Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Calibrating Neural Link...</div>;

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">🧠 NEURAL LINK | Strategic Overwatch</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configuring the autonomous personality matrix and semantic memory buffers.</p>
      </div>

      <div className="personality-deck">
        {/* Left Column: Sliders */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎭 Persona Matrix
          </h3>
          
          {[
            { id: 'humor', label: 'Humor Level', icon: '😄' },
            { id: 'strictness', label: 'Strategic Strictness', icon: '⚖️' },
            { id: 'verbosity', label: 'Response Verbosity', icon: '💬' },
            { id: 'respect_bias', label: 'Respect Bias', icon: '🫡' }
          ].map(slider => (
            <div key={slider.id} className="slider-container">
              <div className="slider-label">
                <span>{slider.icon} {slider.label}</span>
                <span style={{ color: 'var(--accent-blurple)', fontWeight: 700 }}>{personality[slider.id]}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={personality[slider.id]} 
                onChange={(e) => handleSliderChange(slider.id, e.target.value)}
              />
            </div>
          ))}

          <button 
            className="btn-premium btn-primary" 
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
            onClick={savePersonality}
            disabled={saving}
          >
            {saving ? 'Synchronizing...' : '⚡ UPDATE NEURAL MATRIX'}
          </button>
        </div>

        {/* Right Column: Memory & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📡 Engine Status</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Primary Model</span>
                <span style={{ fontWeight: 600 }}>{status.model}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Failover Matrix</span>
                <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>ACTIVE ({status.keysCount} keys)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>System Health</span>
                <span style={{ color: 'var(--accent-gold)' }}>{status.status}</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', flex: 1 }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>💾 Semantic Fragments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {memories.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No memory fragments detected in current buffer.</p>
              ) : (
                memories.map(mem => (
                  <div key={mem._id} style={{ 
                    padding: '10px', 
                    background: 'rgba(255,255,255,0.03)', 
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    borderLeft: `3px solid ${mem.importance > 0.7 ? 'var(--accent-gold)' : 'var(--accent-blurple)'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{mem.type.toUpperCase()}</span>
                      <span style={{ opacity: 0.5 }}>{new Date(mem.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p style={{ color: 'var(--text-primary)' }}>{mem.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBrainControl;
