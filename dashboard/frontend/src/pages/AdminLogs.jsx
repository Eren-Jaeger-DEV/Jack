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

  return (
    <div className="page-container fade-in" style={{maxWidth: '1200px'}}>
      <h1 className="page-title" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <Activity size={28} /> Activity Logs
      </h1>
      <p className="page-subtitle">Track admin modifications across the dashboard.</p>

      <div className="panel-container" style={{marginBottom: '2rem'}}>
        <div className="panel-content" style={{padding: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
          <div style={{flex: '1', minWidth: '200px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Action Type</label>
            <select 
              value={actionFilter} 
              onChange={(e) => setActionFilter(e.target.value)}
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white'}}
            >
              <option value="">All Actions</option>
              <option value="PLAYER_UPDATE">Player Update</option>
              <option value="PLAYER_DELETE">Player Delete</option>
            </select>
          </div>
          <div style={{flex: '1', minWidth: '200px'}}>
            <label style={{display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Admin Discord ID</label>
            <input 
              type="text" 
              placeholder="Filter by admin ID..." 
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              style={{width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white'}}
            />
          </div>
          <button 
            className="btn" 
            onClick={() => {setActionFilter(''); setAdminFilter('');}}
            style={{padding: '10px 20px', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '8px'}}
          >
            Reset Filters
          </button>
        </div>
      </div>

      <div className="panel-container">
        <div className="panel-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2 className="section-title" style={{margin: 0}}>Audit Trail ({total})</h2>
        </div>
        
        <div className="panel-content">
          {error ? (
            <div className="error-message" style={{color: 'var(--danger)', padding: '1.5rem', textAlign: 'center'}}>{error}</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admin</th>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Changes</th>
                    <th>Timestamp</th>
                    <th style={{textAlign: 'right'}}>Tools</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && logs.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>Loading logs...</td></tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>No logs recorded yet.</td></tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log._id}>
                        <td>{renderUser(log.adminId, log.adminUsername, log.adminAvatar)}</td>
                        <td>
                          <span className={`status-badge ${log.action === 'PLAYER_DELETE' ? 'danger' : 'warning'}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>{renderUser(log.targetId, log.targetUsername, log.targetAvatar)}</td>
                        <td>{formatChanges(log.changes, log.action)}</td>
                        <td style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td style={{textAlign: 'right'}}>
                          {user?.roleLevel >= 2 && (log.action === 'PLAYER_UPDATE' || log.action === 'PLAYER_DELETE') && (
                            <button 
                              className="icon-btn" 
                              onClick={() => handleUndo(log._id)}
                              title={log.action === 'PLAYER_DELETE' ? "Restore Player" : "Undo Action"}
                              style={{background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', borderRadius: '6px', display: 'inline-flex', transition: 'all 0.2s'}}
                              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            >
                              <RotateCcw size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 0 && (
            <div className="pagination" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderTop: '1px solid var(--border-color)'}}>
              <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Showing Page {page} of {totalPages}</span>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <button 
                  className="btn" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', color: 'white'}}
                >
                  <ChevronLeft size={18} /> Prev
                </button>
                <button 
                  className="btn" 
                  disabled={page === totalPages} 
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', color: 'white'}}
                >
                  Next <ChevronRight size={18} />
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
