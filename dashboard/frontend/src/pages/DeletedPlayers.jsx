import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api/client';

const DeletedPlayers = ({ user }) => {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(null);
  const [confirmInput, setConfirmInput] = useState('');

  const fetchDeletedPlayers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/players/deleted?page=${page}&limit=10`);
      setPlayers(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch deleted players:', err);
      setError('Failed to load trash bin.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchDeletedPlayers();
    }
  }, [page, user]);

  const handleRestore = async (discordId) => {
    if (window.confirm("Are you sure you want to restore this player? They will reappear in the main player list.")) {
      try {
        await api.post(`/player/${discordId}/restore`);
        alert("Player restored successfully!");
        fetchDeletedPlayers();
      } catch (err) {
        console.error("Restore failed:", err);
        alert(err.response?.data?.error || "Failed to restore player.");
      }
    }
  };

  const handlePermanentDelete = async () => {
    if (confirmInput !== 'DELETE') return;

    try {
      setLoading(true);
      await api.delete(`/player/${confirmingDelete.discordId}/permanent`);
      alert("Player permanently removed from database.");
      setConfirmingDelete(null);
      setConfirmInput('');
      fetchDeletedPlayers();
    } catch (err) {
      console.error("Permanent delete failed:", err);
      alert(err.response?.data?.error || "Failed to delete player.");
      setLoading(false);
    }
  };

  if (!user || user.roleLevel < 2) {
    return (
      <div className="page-container fade-in">
        <h1 className="page-title">Access Denied</h1>
        <p className="page-subtitle" style={{color: 'var(--danger)'}}>You do not have permission to view the trash bin.</p>
      </div>
    );
  }

  return (
    <div className="page-container fade-in" style={{maxWidth: '1200px'}}>
      <h1 className="page-title" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <Trash2 size={28} /> Trash Bin
      </h1>
      <p className="page-subtitle">View and restore soft-deleted players.</p>

      <div className="panel-container">
        <div className="panel-header">
          <h2 className="section-title" style={{margin: 0}}>Deleted Players ({total})</h2>
        </div>
        
        <div className="panel-content">
          {error ? (
            <div className="error-message" style={{color: 'var(--danger)', padding: '1.5rem', textAlign: 'center'}}>{error}</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>IGN</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th style={{textAlign: 'right'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && players.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>Loading trash...</td></tr>
                  ) : players.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>Trash bin is empty.</td></tr>
                  ) : (
                    players.map((player) => (
                      <tr key={player.discordId}>
                        <td>
                          <div style={{fontWeight: 600}}>{player.username || 'Unknown'}</div>
                          <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace'}}>{player.discordId}</div>
                        </td>
                        <td>{player.ign || '-'}</td>
                        <td style={{fontWeight: 600, color: 'var(--accent-color)'}}>{player.synergyPoints || 0}</td>
                        <td>
                          <span className="status-badge danger">Deleted</span>
                        </td>
                        <td style={{textAlign: 'right'}}>
                          {user.roleLevel >= 2 && (
                            <button 
                              className="btn" 
                              onClick={() => handleRestore(player.discordId)}
                              style={{padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--success)', color: 'white', marginRight: '8px'}}
                            >
                              <RotateCcw size={14} /> Restore
                            </button>
                          )}
                          {user.roleLevel >= 3 && (
                            <button 
                              className="btn" 
                              onClick={() => {setConfirmingDelete(player); setConfirmInput('');}}
                              style={{padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 71, 87, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)'}}
                            >
                              <Trash2 size={14} /> Purge
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

      {/* Security Modal for Permanent Delete */}
      {confirmingDelete && (
        <div className="modal-overlay fade-in" style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px'}}>
          <div className="panel-container" style={{maxWidth: '450px', width: '100%', border: '1px solid var(--danger)'}}>
            <div className="panel-header" style={{background: 'rgba(255, 71, 87, 0.1)', borderBottom: '1px solid var(--danger)'}}>
              <h2 className="section-title" style={{color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '10px', margin: 0}}>
                <Trash2 size={24} /> Dangerous Action
              </h2>
            </div>
            <div className="panel-content" style={{padding: '1.5rem'}}>
              <p style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>
                You are about to permanently delete <strong>{confirmingDelete.username || 'Unknown'}</strong> ({confirmingDelete.discordId}) from the database.
              </p>
              <div style={{background: 'rgba(255, 71, 87, 0.05)', padding: '1rem', borderRadius: '8px', borderLeft: '3px solid var(--danger)', marginBottom: '1.5rem'}}>
                <p style={{margin: 0, fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600}}>This action is irreversible. All player data will be lost forever.</p>
              </div>
              
              <label style={{display: 'block', marginBottom: '8px', fontSize: '0.9rem'}}>Type <span style={{color: 'var(--danger)', fontWeight: 700}}>DELETE</span> to confirm:</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Type DELETE..." 
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                style={{marginBottom: '1.5rem'}}
              />
              
              <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                <button className="btn" onClick={() => setConfirmingDelete(null)} style={{background: 'rgba(255,255,255,0.05)', color: 'white'}}>Cancel</button>
                <button 
                  className="btn" 
                  disabled={confirmInput !== 'DELETE'}
                  onClick={handlePermanentDelete} 
                  style={{background: confirmInput === 'DELETE' ? 'var(--danger)' : 'rgba(255,255,255,0.05)', color: 'white'}}
                >
                  Permanently Purge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeletedPlayers;
