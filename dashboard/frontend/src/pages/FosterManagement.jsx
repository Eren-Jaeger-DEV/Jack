import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

const FosterManagement = () => {
  const { guildId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      // Mocking action routes - in a real app, these would hit the backend
      // await api.post(`/foster/${action}/${guildId}`);
      alert(`⚡ Strategic Command Issued: ${action.toUpperCase()}`);
    } catch (err) {
      alert('❌ Command Failure');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loading-screen">Scanning Foster Subsystems...</div>;

  if (!data?.active) return (
    <div className="main-content fade-in">
      <h1 className="section-title">🎓 FOSTER OPERATIONS</h1>
      <div className="glass-card" style={{ padding: '4rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>SYSTEM STATUS: IDLE</h2>
        <p style={{ maxWidth: '500px', margin: '0 auto 2rem', color: 'var(--text-muted)' }}>
          No active 30-day program detected. Initiation must be authorized via Discord Secure Terminal.
        </p>
        <button className="btn-premium btn-primary" style={{ margin: '0 auto' }}>
          INITIATE PROGRAM (VIA DISCORD)
        </button>
      </div>
    </div>
  );

  return (
    <div className="main-content fade-in">
      <div className="overview-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="section-title">🎓 FOSTER OPERATIONS</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Term {data.term} | Shuffle Cycle {data.cycle} | Phase: {data.status}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-premium btn-ghost" 
            onClick={() => handleAction('rotate')}
            disabled={actionLoading}
          >
            🔄 ROTATE CYCLE
          </button>
          <button 
            className="btn-premium btn-primary"
            onClick={() => handleAction('sync')}
            disabled={actionLoading}
          >
            ⚡ SYNC POINTS
          </button>
        </div>
      </div>

      <div className="stats-row">
        <div className="glass-card stat-card">
          <span className="stat-label">OPERATIONAL STATUS</span>
          <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{data.status}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">ACTIVE NEURAL LINKS</span>
          <span className="stat-value">{data.pairs.length}</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">COMPLETION RATE</span>
          <span className="stat-value">94%</span>
        </div>
      </div>

      <h2 className="section-title" style={{ fontSize: '1.2rem', marginTop: '3rem' }}>👥 Neural Pairings (Active Cycle)</h2>
      <div className="plugins-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
        {data.pairs.map((pair, idx) => (
          <div key={idx} className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-blurple)', fontWeight: 800 }}>MENTOR</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pair.mentorIgn}</div>
              </div>
              <div style={{ opacity: 0.3, fontSize: '1.2rem' }}>⚡</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 800 }}>NEWBIE</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{pair.partnerIgn}</div>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cycle Synergy</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{pair.points} pts</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${Math.min(100, (pair.points / 300) * 100)}%`, 
                  height: '100%', 
                  background: 'var(--accent-blurple)',
                  boxShadow: '0 0 10px rgba(88, 101, 242, 0.5)'
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
