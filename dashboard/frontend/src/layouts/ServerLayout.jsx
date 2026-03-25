import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const ServerLayout = () => {
  const { id } = useParams();
  console.log('ServerLayout ID:', id);

  return (
    <div className="server-layout" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 60px)' }}>
      <Sidebar id={id} />
      <main className="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ServerLayout;
