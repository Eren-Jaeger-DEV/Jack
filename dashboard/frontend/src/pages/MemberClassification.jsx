import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client';

const MemberClassification = () => {
  const { guildId } = useParams();
  const [stats, setStats] = useState({ adepts: 0, neophytes: 0, veterans: 0 });
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, playersRes] = await Promise.all([
          api.get('/insights/classification'),
          api.get('/players')
        ]);
        setStats(statsRes.data);
        setPlayers(playersRes.data.filter(p => !p.isDeleted).slice(0, 50));
      } catch (err) {
        console.error('Failed to fetch classification data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [guildId]);

  if (loading) return <div className="loading-screen">Analyzing Server Demographics...</div>;

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">📊 STRATEGIC DEMOGRAPHICS</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Neural classification of active combatants and community members.</p>
      </div>

      <div className="stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
          <span className="stat-label">ADEPT (MENTORS)</span>
          <span className="stat-value">{stats.adepts}</span>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--accent-blurple)' }}>
          <span className="stat-label">NEOPHYTE (NEWBIES)</span>
          <span className="stat-value">{stats.neophytes}</span>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: '4px solid var(--text-secondary)' }}>
          <span className="stat-label">VETERAN (STABLE)</span>
          <span className="stat-value">{stats.veterans}</span>
        </div>
      </div>

      {/* 🔥 Activity Heatmap */}
      <h2 className="section-title" style={{ fontSize: '1.2rem', marginTop: '3rem' }}>🔥 Neural Activity Heatmap (24h Buffer)</h2>
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: '4px', height: '100px' }}>
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {Array.from({ length: 7 }).map((_, d) => {
                const active = Math.random() > 0.6;
                return (
                  <div key={d} style={{ 
                    flex: 1, 
                    background: active ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.03)', 
                    borderRadius: '2px',
                    opacity: active ? (0.3 + Math.random() * 0.7) : 1
                  }} title={`${d}d ${h}h`}></div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          <span>00:00 (PST)</span>
          <span>12:00</span>
          <span>23:59</span>
        </div>
      </div>

      <div className="glass-card panel-container" style={{ marginTop: '2rem' }}>
        <div className="panel-header">🎯 Classification Manifest (Sample)</div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Identifier</th>
                <th>IGN</th>
                <th>Synergy</th>
                <th>Classification</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map(player => {
                const isAdept = player.roles?.includes('1484354630140821705');
                const isNeo = player.roles?.includes('1484348917079478454');
                const isVet = player.roles?.includes('1486183048247509123');

                return (
                  <tr key={player._id}>
                    <td style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <img src={player.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} alt="" style={{ width: '100%' }} />
                      </div>
                      {player.username}
                    </td>
                    <td>{player.ign || '---'}</td>
                    <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{player.seasonSynergy}</td>
                    <td>
                      {isAdept && <span className="status-badge success">ADEPT</span>}
                      {isNeo && <span className="status-badge warning">NEOPHYTE</span>}
                      {isVet && <span className="status-badge" style={{ background: 'rgba(88,101,242,0.2)', color: 'var(--accent-blurple)' }}>VETERAN</span>}
                      {!isAdept && !isNeo && !isVet && <span className="status-badge" style={{ opacity: 0.3 }}>UNCLASSIFIED</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn-premium btn-ghost" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>OVERRIDE</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemberClassification;
