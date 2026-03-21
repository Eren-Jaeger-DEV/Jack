import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '../api/client';

const PlayerEditModal = ({ player, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    ign: player.ign || '',
    synergyPoints: player.synergyPoints || 0,
    registered: player.registered || false,
    isClanMember: player.isClanMember || false,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        synergyPoints: Number(formData.synergyPoints)
      };
      
      const res = await api.patch(`/player/${player.discordId}`, payload);
      onSave(res.data);
      onClose();
    } catch (err) {
      console.error('Failed to update player:', err);
      setError(err.response?.data?.error || 'Failed to update player');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container fade-in">
        <div className="modal-header">
          <h3>Edit Player</h3>
          <button type="button" className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message" style={{color: 'var(--danger)', marginBottom: '1rem'}}>{error}</div>}
          
          <div className="form-group" style={{marginBottom: '1rem'}}>
            <label className="form-label">Discord ID</label>
            <input type="text" className="form-input" value={player.discordId} disabled style={{opacity: 0.6}} />
          </div>
          
          <div className="form-group" style={{marginBottom: '1rem'}}>
            <label className="form-label">IGN</label>
            <input type="text" name="ign" className="form-input" value={formData.ign} onChange={handleChange} />
          </div>
          
          <div className="form-group" style={{marginBottom: '1rem'}}>
            <label className="form-label">Synergy Points</label>
            <input type="number" name="synergyPoints" className="form-input" value={formData.synergyPoints} onChange={handleChange} />
          </div>
          
          <div className="form-group toggle-group" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
            <label className="form-label" style={{marginBottom: 0}}>Registered</label>
            <label className="switch">
              <input type="checkbox" name="registered" checked={formData.registered} onChange={handleChange} />
              <span className="slider round"></span>
            </label>
          </div>
          
          <div className="form-group toggle-group" style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
            <label className="form-label" style={{marginBottom: 0}}>Clan Member</label>
            <label className="switch">
              <input type="checkbox" name="isClanMember" checked={formData.isClanMember} onChange={handleChange} />
              <span className="slider round"></span>
            </label>
          </div>
          
          <div className="modal-footer" style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem'}}>
            <button type="button" className="btn" onClick={onClose} style={{background: 'rgba(255,255,255,0.1)', color: 'white'}}>Cancel</button>
            <button type="submit" className="btn btn-discord" disabled={loading} style={{width: 'auto'}}>
              {loading ? 'Saving...' : <><Save size={16} style={{marginRight: '8px'}} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerEditModal;
