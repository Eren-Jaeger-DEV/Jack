import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const ServerLayout = () => {
  const { id } = useParams();
  const pathParts = window.location.pathname.split('/').filter(p => p && p !== 'server' && p !== id);
  const currentPath = pathParts.length > 0 ? pathParts[0].toUpperCase().replace(/-/g, '_') : 'OVERVIEW';

  return (
    <div className="server-layout" style={{ display: 'flex', width: '100%', height: '100vh' }}>
      <Sidebar id={id} />
      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="system-breadcrumb" style={{ 
          marginBottom: '2rem', 
          fontSize: '0.7rem', 
          fontFamily: 'monospace', 
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '10px',
          alignItems: 'center'
        }}>
          <span style={{ color: 'var(--accent-gold)' }}>[SYSTEM_ROOT]</span>
          <span>/</span>
          <span>SERVER_{id}</span>
          <span>/</span>
          <span style={{ color: 'white' }}>{currentPath}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default ServerLayout;
