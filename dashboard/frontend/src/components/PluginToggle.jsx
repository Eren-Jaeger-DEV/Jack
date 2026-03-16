import React from 'react';
import { Check, X } from 'lucide-react';

const PluginToggle = ({ name, isEnabled, onToggle }) => {
  return (
    <div className={`plugin-card ${isEnabled ? 'enabled' : 'disabled'}`}>
      <div className="plugin-info" onClick={() => (window.location.href += `/${name}`)}>
        <div className="plugin-icon">
          {isEnabled ? <Check size={24} color="var(--success)" /> : <X size={24} color="var(--danger)" />}
        </div>
        <div className="plugin-details">
          <h3>{name.charAt(0).toUpperCase() + name.slice(1)}</h3>
          <p>{isEnabled ? 'Active and Running' : 'Disabled for this server'}</p>
        </div>
      </div>
      
      <div className="plugin-toggle">
        <label className="switch">
          <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={onToggle} 
          />
          <span className="slider round"></span>
        </label>
      </div>
    </div>
  );
};

export default PluginToggle;
