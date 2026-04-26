import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import { Users, Zap, Terminal, Activity, TrendingUp, Star, ShieldAlert, Cpu } from 'lucide-react'

const ServerOverview = () => {
  const { id } = useParams();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.all([
          api.get(`/guilds/${id}/stats`),
          api.get(`/guilds/${id}/analytics`)
        ]);
        setStats(statsRes.data);
        setAnalytics(analyticsRes.data);
      } catch (err) {
        console.error('Failed to fetch server data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <div className="loading-screen">Synchronizing Neural Overview...</div>;

  return (
    <div className="main-content fade-in">
      <div className="overview-header">
        <h1 className="section-title">🛡️ NEURAL OVERVIEW | Guild Control</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Live system diagnostics and tactical analytics for the current operational theater.</p>
      </div>

      {stats && (
        <div className="stats-row">
          <div className="glass-card stat-card">
            <span className="stat-label"><Users size={14} style={{ marginRight: '6px' }} /> TOTAL PERSONNEL</span>
            <span className="stat-value">{stats.memberCount}</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-label"><Zap size={14} style={{ marginRight: '6px' }} /> ACTIVE SUBSYSTEMS</span>
            <span className="stat-value" style={{ color: 'var(--accent-blurple)' }}>{stats.activePlugins}</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-label"><Terminal size={14} style={{ marginRight: '6px' }} /> COMMAND PROTOCOLS</span>
            <span className="stat-value">{stats.commandCount}</span>
          </div>
          <div className="glass-card stat-card">
            <span className="stat-label"><Cpu size={14} style={{ marginRight: '6px' }} /> ENGINE LOAD</span>
            <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>OPTIMAL</span>
          </div>
        </div>
      )}

      <div className="analytics-grid" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="glass-card panel-container" style={{ padding: '2rem' }}>
          <h2 className="section-title" style={{ marginTop: 0, fontSize: '1.25rem' }}>📡 Tactical Pulse (Today)</h2>
          {analytics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>INTERACTIONS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{analytics.commandsExecutedToday}</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>UNIQUE USERS</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{analytics.activeUsers}</div>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>TOP SECTOR</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent-gold)' }}>{analytics.mostUsedPlugin?.toUpperCase()}</div>
              </div>
            </div>
          )}
        </div>

        <div className="glass-card panel-container" style={{ padding: '1.5rem', background: 'rgba(240, 71, 71, 0.03)' }}>
          <h2 className="section-title" style={{ marginTop: 0, fontSize: '1rem', color: 'var(--accent-crimson)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={18} /> SECURITY STATUS
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            All systems report within normal parameters. No intrusion attempts detected in current window.
          </div>
          <Link to={`/server/${id}/logs`} className="btn-premium btn-ghost" style={{ fontSize: '0.8rem', width: '100%', justifyContent: 'center' }}>
            VIEW SECURITY LOGS
          </Link>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: '3rem' }}>
        <Link to={`/server/${id}/ai`} className="glass-card dashboard-card action-card">
          <div className="card-icon"><Cpu size={24} /></div>
          <div className="card-content">
            <h3 style={{ fontSize: '1.1rem' }}>Neural Link</h3>
            <p style={{ fontSize: '0.85rem' }}>Calibrate Jack's core personality and semantic memory.</p>
          </div>
        </Link>
        <Link to={`/server/${id}/foster`} className="glass-card dashboard-card action-card">
          <div className="card-icon"><TrendingUp size={24} /></div>
          <div className="card-content">
            <h3 style={{ fontSize: '1.1rem' }}>Operation Command</h3>
            <p style={{ fontSize: '0.85rem' }}>Manage mentorship cycles and synergy growth.</p>
          </div>
        </Link>
        <Link to={`/server/${id}/plugins`} className="glass-card dashboard-card action-card">
          <div className="card-icon"><Zap size={24} /></div>
          <div className="card-content">
            <h3 style={{ fontSize: '1.1rem' }}>Subsystems</h3>
            <p style={{ fontSize: '0.85rem' }}>Initialize or decommission modular neural plugins.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default ServerOverview
