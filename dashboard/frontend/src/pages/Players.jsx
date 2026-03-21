import React, { useState, useEffect } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import api from '../api/client';
import PlayerEditModal from '../components/PlayerEditModal';

const Players = ({ user }) => {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [editingPlayer, setEditingPlayer] = useState(null);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/players?page=${page}&limit=10&search=${search}`);
      setPlayers(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch players:', err);
      setError('Failed to load players.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPlayers();
    }, search ? 500 : 0);

    return () => clearTimeout(delayDebounceFn);
  }, [page, search]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1); // Reset to page 1 on new search
  };

  const handleEditSave = (updatedPlayer) => {
    setPlayers(prev => prev.map(p => p.discordId === updatedPlayer.discordId ? updatedPlayer : p));
  };

  const handleDelete = async (discordId) => {
    if (window.confirm("Are you sure you want to soft-delete this player? They will be hidden from the table but can be restored from the Activity Logs.")) {
      try {
         await api.delete(`/player/${discordId}`);
         fetchPlayers();
      } catch (err) {
         alert("Failed to delete player");
      }
    }
  };

  return (
    <div className="page-container fade-in" style={{maxWidth: '1200px'}}>
      <h1 className="page-title" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <Users size={28} /> Player Management
      </h1>
      <p className="page-subtitle">View and manage all registered players.</p>

      <div className="panel-container">
        <div className="panel-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
          <h2 className="section-title" style={{margin: 0}}>All Players ({total})</h2>
          
          <div className="search-box" style={{position: 'relative', width: '300px'}}>
            <Search size={18} style={{position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)'}} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search by ID, Name or IGN..." 
              value={search}
              onChange={handleSearchChange}
              style={{paddingLeft: '38px', margin: 0}}
            />
          </div>
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
                    <th>Registered</th>
                    <th>Clan</th>
                    {user?.roleLevel >= 2 && <th style={{textAlign: 'right'}}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && players.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>Loading...</td></tr>
                  ) : players.length === 0 ? (
                    <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>No players found.</td></tr>
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
                          <span className={`status-badge ${player.registered ? 'success' : 'danger'}`}>
                            {player.registered ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${player.isClanMember ? 'success' : 'warning'}`}>
                            {player.isClanMember ? 'Yes' : 'No'}
                          </span>
                        </td>
                        {user?.roleLevel >= 2 && (
                          <td style={{textAlign: 'right'}}>
                            {user.roleLevel >= 2 && (
                              <button 
                                className="icon-btn" 
                                onClick={() => setEditingPlayer(player)}
                                style={{background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginRight: '16px', display: 'inline-flex'}}
                              >
                                <Edit2 size={18} />
                              </button>
                            )}
                            {user.roleLevel >= 3 && (
                              <button 
                                className="icon-btn" 
                                onClick={() => handleDelete(player.discordId)}
                                style={{background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'inline-flex'}}
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </td>
                        )}
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

      {editingPlayer && (
        <PlayerEditModal 
          player={editingPlayer} 
          onClose={() => setEditingPlayer(null)} 
          onSave={handleEditSave} 
        />
      )}
    </div>
  );
};

export default Players;
