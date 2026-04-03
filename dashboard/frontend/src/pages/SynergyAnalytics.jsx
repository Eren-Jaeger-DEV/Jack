import React, { useState, useEffect } from 'react';
import api from '../api/client';

const SynergyAnalytics = () => {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSynergy = async () => {
      try {
        const res = await api.get('/synergy/rankings');
        setRankings(res.data.data);
      } catch (err) {
        console.error('Failed to fetch synergy rankings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSynergy();
  }, []);

  if (loading) return <div className="loading-screen">Compiling Synergy Data...</div>;

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">📊 Seasonal Synergy Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live Leaderboard & Performance Metrics</p>
      </div>

      <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <div className="glass-card panel-container">
          <div className="panel-header">🚀 Top Performance Leaderboard</div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>IGN</th>
                  <th>Synergy Points</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((player, idx) => (
                  <tr key={idx}>
                    <td style={{ color: idx < 3 ? 'var(--accent-color)' : '#fff' }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{player.ign}</td>
                    <td><span className="status-badge success">{player.seasonSynergy} XP</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-card panel-container" style={{ padding: '1.5rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem' }}>📈 Strategic Insights</div>
          <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Based on recent synergy growth, Jack recommends pairing **〜KennY** with **TomPlayzzYT** for tonight's tournament.</p>
          </div>
          <div style={{ marginTop: '1.5rem', opacity: 0.6 }}>
            <p style={{ fontSize: '0.8rem' }}>Next Season Trigger: Automated at 30 days.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynergyAnalytics;
