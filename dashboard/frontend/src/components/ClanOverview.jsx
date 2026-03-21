import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, Percent } from 'lucide-react';
import api from '../api/client';

const ClanOverview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.get('/clan/stats');
        if (isMounted) {
          setStats(res.data);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch clan stats:', err);
        if (isMounted) setError('Failed to load clan statistics.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchStats();
    
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) return <div className="loading-container" style={{height: '100px'}}>Loading clan stats...</div>;
  if (error) return <div className="error-message" style={{color: 'var(--danger)', padding: '1rem', background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)'}}>{error}</div>;
  if (!stats) return null;

  return (
    <div className="stats-row">
      <div className="stat-card">
        <span className="stat-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Users size={16} /> Total Members</span>
        <span className="stat-value">{stats.totalMembers ?? 0}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}><UserPlus size={16} /> Registered</span>
        <span className="stat-value">{stats.registeredMembers ?? 0}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}><UserMinus size={16} /> Unregistered</span>
        <span className="stat-value">{stats.unregisteredMembers ?? 0}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label" style={{display: 'flex', alignItems: 'center', gap: '6px'}}><Percent size={16} /> Registration Rate</span>
        <span className="stat-value">{stats.registrationPercentage ?? 0}%</span>
      </div>
    </div>
  );
};

export default ClanOverview;
