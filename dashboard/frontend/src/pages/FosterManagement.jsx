import React, { useState, useEffect } from 'react';
import api from '../api/client';

const FosterManagement = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFoster = async () => {
      try {
        const res = await api.get('/foster/active');
        setData(res.data);
      } catch (err) {
        console.error('Failed to fetch foster data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFoster();
  }, []);

  if (loading) return <div className="loading-screen">Scanning Foster Subsystems...</div>;
  if (!data?.active) return (
    <div className="main-content fade-in">
      <h1 className="section-title">🎓 Foster Program v2</h1>
      <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-secondary)' }}>Status: IDLE</h2>
        <p style={{ marginTop: '1rem' }}>No active 30-day program detected. Start it from Discord using <code>Foster program starts</code>.</p>
      </div>
    </div>
  );

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">🎓 Foster Program v2 | Monitoring</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Term {data.term} • Shuffle Cycle {data.cycle}</p>
      </div>

      <div className="stats-row">
        <div className="glass-card stat-card">
          <span className="stat-label">STATUS</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>{data.status}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">ACTIVE PAIRS</span>
          <span className="stat-value">{data.pairs.length}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">NEXT SHUFFLE</span>
          <span className="stat-value">Automated</span>
        </div>
      </div>

      <h2 className="section-title">👥 Active Pairings</h2>
      <div className="plugins-grid">
        {data.pairs.map((pair, idx) => (
          <div key={idx} className="glass-card plugin-card" style={{ minHeight: '180px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ color: 'var(--accent-color)', fontSize: '1.2rem' }}>{pair.mentorIgn}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Mentor</p>
              </div>
              <div style={{ fontSize: '1.5rem' }}>↔️</div>
              <div style={{ textAlign: 'right' }}>
                <h3 style={{ color: '#fff', fontSize: '1.2rem' }}>{pair.partnerIgn}</h3>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>Partner</p>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                <span>Cycle Progress</span>
                <span>{pair.points} pts</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(100, (pair.points / 500) * 100)}%`, 
                  height: '100%', 
                  background: 'var(--accent-gradient)' 
                }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FosterManagement;
