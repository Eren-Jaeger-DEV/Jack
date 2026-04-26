import React, { useState, useEffect } from 'react';
import { Activity, Search, ChevronLeft, ChevronRight, FileJson, RotateCcw } from 'lucide-react';
import api from '../api/client';

const AdminLogs = ({ user }) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/logs?page=${page}&limit=15&action=${actionFilter}&adminId=${adminFilter}`);
      setLogs(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async (logId) => {
    if (!window.confirm("Are you sure you want to revert this action? This will restore the player's previous attributes.")) {
      return;
    }

    try {
      setLoading(true);
      await api.post(`/logs/undo/${logId}`);
      alert("Action undone successfully!");
      fetchLogs();
    } catch (err) {
      console.error("Undo failed:", err);
      alert(err.response?.data?.error || "Failed to perform undo action.");
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1); // Reset to first page when filters change
  }, [actionFilter, adminFilter]);

  useEffect(() => {
    if (user && user.roleLevel >= 2) {
      fetchLogs();
    }
  }, [page, actionFilter, adminFilter, user]);

  if (!user || user.roleLevel < 2) {
    return (
      <div className="page-container fade-in">
        <h1 className="page-title">Access Denied</h1>
        <p className="page-subtitle" style={{color: 'var(--danger)'}}>You do not have permission to view activity logs.</p>
      </div>
    );
  }

  const formatChanges = (changes, action) => {
    if (action === 'UNDO_ACTION' || action === 'UNDO_DELETE') {
      return (
        <div style={{fontSize: '0.85rem', color: 'var(--success)'}}>
          {action === 'UNDO_DELETE' ? 'Restored player from Log ID: ' : 'Reverted changes from Log ID: '} 
          <span style={{fontFamily: 'monospace'}}>{changes.undoneLogId || changes.restoredLogId}</span>
          {action === 'UNDO_ACTION' && <><br/>Fields: {changes.revertedFields?.join(', ')}</>}
        </div>
      );
    }
    if (!changes || Object.keys(changes).length === 0) return '-';
    if (changes.deleted) return <span style={{color: 'var(--danger)', fontWeight: 600}}>Deleted</span>;

    return (
      <div style={{display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.85rem'}}>
        {Object.entries(changes).map(([key, value]) => (
          <div key={key}>
            <span style={{color: 'var(--text-secondary)'}}>{key}:</span>{' '}
            <span style={{textDecoration: 'line-through', opacity: 0.6}}>{String(value?.from ?? 'null')}</span> 
            {' → '} 
            <span style={{color: 'var(--success)'}}>{String(value?.to ?? 'null')}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderUser = (id, username, avatar) => {
    const avatarUrl = avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png` : null;
    return (
      <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" style={{width: '24px', height: '24px', borderRadius: '50%'}} />
        ) : (
          <div style={{width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyItems: 'center', fontSize: '10px'}}>{username?.[0]?.toUpperCase() || '?'}</div>
        )}
        <div>
          <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{username || 'Unknown'}</div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace'}}>{id}</div>
        </div>
      </div>
    );
  };

  const getTagColor = (action) => {
    if (action.includes('DELETE')) return 'var(--accent-crimson)';
    if (action.includes('UPDATE')) return 'var(--accent-blurple)';
    if (action.includes('UNDO')) return 'var(--accent-emerald)';
    return 'var(--text-secondary)';
  };

  return (
    <div className="main-content fade-in" style={{ maxWidth: '1200px' }}>
      <div className="overview-header">
        <h1 className="section-title">📜 SYSTEM AUDIT | Operation Logs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Centralized audit trail of all administrative override and synchronization events.</p>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>STRATEGIC TAG</label>
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)}
              className="form-input"
              style={{ background: 'rgba(0,0,0,0.2)' }}
            >
              <option value="">ALL_SYSTEM_EVENTS</option>
              <option value="PLAYER_UPDATE">PLAYER_SYNCHRONIZATION</option>
              <option value="PLAYER_DELETE">DATA_PURGE_EVENTS</option>
            </select>
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>ADMIN_IDENTIFIER</label>
            <input 
              type="text" 
              placeholder="Search by ID..." 
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              className="form-input"
              style={{ background: 'rgba(0,0,0,0.2)' }}
            />
          </div>
          <button 
            className="btn-premium btn-ghost" 
            onClick={() => {setActionFilter(''); setAdminFilter('');}}
          >
            RESET_FILTERS
          </button>
        </div>
      </div>

      <div className="glass-card panel-container" style={{ background: '#050505', border: '1px solid #1a1a1a' }}>
        <div className="panel-header" style={{ borderBottom: '1px solid #1a1a1a', background: '#0a0a0a', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>[root@jack-system logs]# tail -f /var/log/audit.log</span>
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{total} ENTRIES LOADED</span>
        </div>
        
        <div className="panel-content" style={{ padding: '0' }}>
          {error ? (
            <div style={{ color: 'var(--accent-crimson)', padding: '2rem', textAlign: 'center', fontFamily: 'monospace' }}>!! CRITICAL_ERROR: {error} !!</div>
          ) : (
            <div className="terminal-log-view" style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
              {loading && logs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>INITIALIZING_READ_SEQUENCE...</div>
              ) : logs.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.3 }}>NO_LOG_DATA_IN_CURRENT_BUFFER</div>
              ) : (
                logs.map((log) => (
                  <div key={log._id} style={{ 
                    padding: '12px 20px', 
                    borderBottom: '1px solid #111',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '15px',
                    transition: 'background 0.2s'
                  }} className="terminal-entry">
                    <span style={{ color: 'var(--text-muted)', minWidth: '80px' }}>{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}</span>
                    <span style={{ color: getTagColor(log.action), fontWeight: 700, minWidth: '120px' }}>[{log.action}]</span>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ color: 'var(--accent-gold)' }}>@{log.adminUsername}</span>
                        <span style={{ margin: '0 8px', opacity: 0.3 }}>{'-&gt;'}</span>
                        <span style={{ color: 'var(--text-primary)' }}>@{log.targetUsername}</span>
                      </div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>
                        {formatChanges(log.changes, log.action)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                       {user?.roleLevel >= 2 && (log.action === 'PLAYER_UPDATE' || log.action === 'PLAYER_DELETE') && (
                          <button 
                            className="btn-premium btn-ghost"
                            onClick={() => handleUndo(log._id)}
                            style={{ padding: '4px 8px', fontSize: '0.65rem', borderColor: '#222' }}
                          >
                            UNDO
                          </button>
                       )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: '#080808', borderTop: '1px solid #1a1a1a' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'monospace' }}>PAGE_{page}_OF_{totalPages}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn-premium btn-ghost" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '4px 12px', fontSize: '0.7rem' }}
                >
                  PREV
                </button>
                <button 
                  className="btn-premium btn-ghost" 
                  disabled={page === totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '4px 12px', fontSize: '0.7rem' }}
                >
                  NEXT
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
