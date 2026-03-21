import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, Shield } from 'lucide-react';
import api from '../api/client';
import ClanOverview from '../components/ClanOverview';

const ClanManagement = () => {
  const [unregistered, setUnregistered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchUnregistered = async () => {
      try {
        setLoading(true);
        const res = await api.get('/clan/unregistered');
        
        if (isMounted) {
          const data = res.data?.unregistered || res.data || [];
          setUnregistered(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to fetch unregistered members:', err);
        if (isMounted) setError('Failed to load unregistered members.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchUnregistered();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="page-container fade-in">
      <h1 className="page-title" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
        <Shield size={28} /> Clan Management
      </h1>
      <p className="page-subtitle">Overview of your clan's registration status.</p>

      {/* Reusable Clan Overview Component */}
      <div className="overview-header" style={{ marginBottom: '2.5rem' }}>
        <ClanOverview />
      </div>

      <div className="panel-container">
        <div className="panel-header">
          <h2 className="section-title" style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            Unregistered Members
            {!loading && !error && unregistered.length > 0 && (
              <span className="status-badge danger" style={{marginLeft: 'auto', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <AlertCircle size={16} /> 
                {unregistered.length} Action Required
              </span>
            )}
          </h2>
        </div>
        
        <div className="panel-content">
          {loading ? (
            <div className="loading-container">Loading unregistered...</div>
          ) : error ? (
            <div className="error-message" style={{color: 'var(--danger)', padding: '1.5rem', textAlign: 'center'}}>{error}</div>
          ) : unregistered.length === 0 ? (
            <div className="empty-state" style={{padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
              <Users size={48} style={{opacity: 0.5, margin: '0 auto 1rem'}} />
              <h3>All caught up!</h3>
              <p>All members of your clan are properly registered in the database.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th width="80">#</th>
                    <th>Member ID</th>
                    <th width="150">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {unregistered.map((memberData, index) => {
                    // Extract ID whether it's a string, or an object with discordId/id
                    const discordId = typeof memberData === 'string' ? memberData : memberData.discordId || memberData.id || JSON.stringify(memberData);
                    
                    return (
                      <tr key={index}>
                        <td style={{color: 'var(--text-secondary)'}}>{index + 1}</td>
                        <td style={{fontFamily: 'monospace', letterSpacing: '0.5px'}}>{discordId}</td>
                        <td><span className="status-badge warning">Unregistered</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClanManagement;
