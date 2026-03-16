import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import { Users, Zap, Terminal, Activity, TrendingUp, Star } from 'lucide-react'

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

  if (loading) return <div className="loading-container">Loading overview...</div>;

  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Server Overview</h1>
      <p className="page-subtitle">Real-time statistics and analytics for your server.</p>

      {stats && (
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label"><Users size={16} /> Total Members</span>
            <span className="stat-value">{stats.memberCount}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label"><Zap size={16} /> Active Plugins</span>
            <span className="stat-value">{stats.activePlugins}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label"><Terminal size={16} /> Commands Available</span>
            <span className="stat-value">{stats.commandCount}</span>
          </div>
        </div>
      )}

      <h2 className="section-title">Today's Analytics</h2>
      {analytics && (
        <div className="analytics-grid">
          <div className="stat-card">
            <span className="stat-label"><Activity size={16} /> Commands Executed</span>
            <span className="stat-value">{analytics.commandsExecutedToday}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label"><TrendingUp size={16} /> Active Users</span>
            <span className="stat-value">{analytics.activeUsers}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label"><Star size={16} /> Top Command</span>
            <span className="stat-value" style={{ fontSize: '1.25rem', marginTop: 'auto' }}>{analytics.mostUsedPlugin}</span>
          </div>
        </div>
      )}

      <div className="dashboard-grid" style={{ marginTop: '2rem' }}>
        <Link to={`/server/${id}/plugins`} className="dashboard-card action-card">
          <div className="card-icon"><Zap size={32} /></div>
          <div className="card-content">
            <h3>Plugins</h3>
            <p>Enable or disable Jack's features.</p>
          </div>
        </Link>
        <Link to={`/server/${id}/plugins/leveling`} className="dashboard-card action-card">
          <div className="card-icon"><TrendingUp size={32} /></div>
          <div className="card-content">
            <h3>Leveling Settings</h3>
            <p>Configure XP and multipliers.</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default ServerOverview
