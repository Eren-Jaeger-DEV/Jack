import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PluginSettings = () => {
  const { id, pluginName } = useParams();
  const navigate = useNavigate();

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <button onClick={() => navigate(-1)} className="back-link" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <ArrowLeft size={16} /> Back
        </button>
        <h1 className="page-title">{pluginName.charAt(0).toUpperCase() + pluginName.slice(1)} Settings</h1>
        <p className="page-subtitle">Settings for this plugin are coming soon.</p>
      </div>

      <div className="glass-card action-card" style={{ padding: '3rem', textAlign: 'center' }}>
        <p>This plugin does not have any configurable settings yet.</p>
      </div>
    </div>
  );
};

export default PluginSettings;
