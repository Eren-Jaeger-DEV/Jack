import React, { useState, useEffect } from 'react';
import api from '../api/client';

const AIBrainControl = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAI = async () => {
      try {
        const res = await api.get('/ai/status');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch AI status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAI();
  }, []);

  if (loading) return <div className="loading-screen">Calibrating AI Persona...</div>;

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">🧠 AI Command Center | Jack v4.2</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Model Configuration & Persona Matrix Diagnostics</p>
      </div>

      <div className="analytics-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div className="glass-card panel-container" style={{ padding: '2rem' }}>
          <div className="panel-header" style={{ marginBottom: '2rem' }}>🎭 Reputation & Persona Matrix</div>
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600 }}>Professionalism Threshold</span>
                <span style={{ color: 'var(--accent-color)' }}>85%</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                <div style={{ width: '85%', height: '100%', background: 'var(--accent-gradient)', borderRadius: '5px' }}></div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 600 }}>Toxicity Filter</span>
                <span style={{ color: 'var(--success)' }}>Strict</span>
              </div>
              <div style={{ height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px' }}>
                <div style={{ width: '100%', height: '100%', background: 'var(--success)', borderRadius: '5px' }}></div>
              </div>
            </div>
            
            <p style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Jack's personality dynamically adapts based on the member's reputation score. 
              Currently responding with: <code>Cool & Professional</code>.
            </p>
          </div>
        </div>

        <div className="glass-card panel-container" style={{ padding: '1.5rem' }}>
          <div className="panel-header" style={{ marginBottom: '1.5rem' }}>📊 Core Engine Diagnostics</div>
          <div className="stat-card" style={{ background: 'transparent', border: 'none' }}>
            <span className="stat-label">PRIMARY MODEL</span>
            <span className="stat-value" style={{ fontSize: '1.3rem' }}>{data.model}</span>
          </div>
          <div className="stat-card" style={{ background: 'transparent', border: 'none', marginTop: '1.5rem' }}>
            <span className="stat-label">MULTI-KEY FAILOVER</span>
            <span className="stat-value" style={{ fontSize: '1.3rem', color: 'var(--success)' }}>ACTIVE</span>
          </div>
          <div className="stat-card" style={{ background: 'transparent', border: 'none', marginTop: '1.5rem' }}>
            <span className="stat-label">STATUS</span>
            <span className="stat-value" style={{ fontSize: '1.3rem' }}>{data.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIBrainControl;
