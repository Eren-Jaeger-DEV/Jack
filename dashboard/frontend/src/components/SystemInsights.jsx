import React, { useState, useEffect } from 'react';
import { BarChart3, Users, UserPlus, UserMinus, FileText, Trash, RotateCcw, AlertTriangle } from 'lucide-react';
import api from '../api/client';

const SystemInsights = () => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true);
        const res = await api.get('/insights');
        setInsights(res.data);
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError('Failed to load system analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) return <div className="panel-container" style={{padding: '2rem', textAlign: 'center'}}>Loading insights...</div>;
  if (error) return <div className="panel-container" style={{padding: '2rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;
  if (!insights) return null;

  const cards = [
    { title: 'Total Players', value: insights.totalPlayers, icon: <Users size={20} />, color: 'var(--accent-color)' },
    { title: 'Active Players', value: insights.activePlayers, icon: <UserPlus size={20} />, color: 'var(--success)' },
    { title: 'In Trash', value: insights.deletedPlayers, icon: <Trash size={20} />, color: 'var(--warning)' },
    { title: 'Total Logs', value: insights.totalLogs, icon: <FileText size={20} />, color: 'var(--text-secondary)' },
    { title: 'Soft Deletes', value: insights.totalDeletes, icon: <UserMinus size={20} />, color: 'var(--danger)' },
    { title: 'Restores', value: insights.totalRestores, icon: <RotateCcw size={20} />, color: 'var(--success)' },
    { title: 'Permanent Purges', value: insights.totalPermanentDeletes, icon: <AlertTriangle size={20} />, color: 'var(--danger)' },
  ];

  return (
    <div className="insights-grid" style={{
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
      gap: '1.5rem', 
      marginBottom: '2rem'
    }}>
      {cards.map((card, index) => (
        <div key={index} className="panel-container" style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px', borderLeft: `4px solid ${card.color}`}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 600}}>{card.title}</span>
            <span style={{color: card.color}}>{card.icon}</span>
          </div>
          <div style={{fontSize: '1.8rem', fontWeight: 700, color: 'white'}}>{card.value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
};

export default SystemInsights;
