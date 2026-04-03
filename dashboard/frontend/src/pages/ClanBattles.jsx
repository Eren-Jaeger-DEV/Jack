import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Swords, Trophy, Users, History } from 'lucide-react';

const ClanBattles = () => {
  const [activeBattle, setActiveBattle] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [activeRes, historyRes] = await Promise.all([
          api.get('/battles/active'),
          api.get('/battles/history')
        ]);
        setActiveBattle(activeRes.data.active ? activeRes.data.data : null);
        setHistory(historyRes.data.data || []);
      } catch (err) {
        console.error('Failed to fetch battle data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-screen">Intercepting Battle Comm-links...</div>;

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">⚔️ Clan Battle Command Center</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live War Room & Historical Record</p>
      </div>

      {activeBattle ? (
        <div className="analytics-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
          <div className="glass-card panel-container">
            <div className="panel-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Swords size={20} color="var(--accent-color)" />
              LIVE PARTICIPATION LEADERBOARD
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>IGN</th>
                    <th>Today</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {activeBattle.players.map((player, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{player.ign}</td>
                      <td><span className="status-badge success">+{player.todayPoints}</span></td>
                      <td>{player.totalPoints} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-card panel-container" style={{ padding: '1.5rem' }}>
            <div className="panel-header" style={{ marginBottom: '1.5rem' }}>📊 Strategic Briefing</div>
            <div className="stat-card" style={{ background: 'transparent', border: 'none' }}>
              <span className="stat-label">ACTIVE PLAYERS</span>
              <span className="stat-value">{activeBattle.players.length}</span>
            </div>
            <div className="stat-card" style={{ background: 'transparent', border: 'none', marginTop: '1.5rem' }}>
              <span className="stat-label">BATTLE STATUS</span>
              <span className="stat-value" style={{ color: 'var(--success)' }}>IN PROGRESS</span>
            </div>
            <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0, 242, 254, 0.05)', borderRadius: '12px', border: '1px solid rgba(0, 242, 254, 0.1)' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Jack is monitoring real-time point submissions. Ensure all members update their totals by 23:59 UTC.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ color: 'var(--text-secondary)' }}>Status: IDLE</h2>
          <p style={{ marginTop: '1rem' }}>No active clan battle detected. Start a new war from Discord.</p>
        </div>
      )}

      <div className="overview-header" style={{ marginTop: '3rem' }}>
        <h2 className="section-title">🕒 Battle History</h2>
      </div>
      <div className="plugins-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {history.map((battle, idx) => (
          <div key={idx} className="glass-card plugin-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={18} opacity={0.6} />
                <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>{new Date(battle.createdAt).toLocaleDateString()}</span>
              </div>
              <span className="status-badge">ARCHIVED</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem' }}>Match #{idx + 1}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{battle.players.length} Participants</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClanBattles;
