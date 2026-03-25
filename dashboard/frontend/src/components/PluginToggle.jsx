import React from 'react';
import { 
  Shield, Activity, Gavel, UserCheck, Wrench, UserPlus, 
  Smile, Image, Mic, Hash, Zap, TrendingUp, BarChart, 
  Users, Sword, Gamepad, ShoppingCart, Package, Heart, Target,
  Settings, ChevronRight
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

const ICON_MAP = {
  Shield: Shield,
  Activity: Activity,
  Gavel: Gavel,
  UserCheck: UserCheck,
  Wrench: Wrench,
  UserPlus: UserPlus,
  Smile: Smile,
  Image: Image,
  Mic: Mic,
  Hash: Hash,
  Zap: Zap,
  TrendingUp: TrendingUp,
  BarChart: BarChart,
  Users: Users,
  Sword: Sword,
  Gamepad: Gamepad,
  ShoppingCart: ShoppingCart,
  Package: Package,
  Heart: Heart,
  Target: Target
};

const PluginToggle = ({ id, name, description, category, icon, isEnabled, hasSettings, onToggle }) => {
  const navigate = useNavigate();
  const { id: guildId } = useParams();
  const IconComponent = ICON_MAP[icon] || Package;

  const handleSettingsClick = () => {
    if (hasSettings) {
      // Specialized routing for some plugins
      if (id === 'triggers') navigate(`/server/${guildId}/triggers`);
      else if (id === 'clan') navigate(`/server/${guildId}/clan`);
      else if (id === 'leveling') navigate(`/server/${guildId}/plugins/leveling`);
      else navigate(`/server/${guildId}/plugins/${id}`);
    }
  };

  return (
    <div className={`plugin-card ${isEnabled ? 'enabled' : 'disabled'} ${hasSettings ? 'has-settings' : ''}`}>
      <div className="plugin-info">
        <div className="plugin-icon-wrapper">
          <IconComponent size={28} color={isEnabled ? 'var(--primary)' : 'var(--text-secondary)'} />
        </div>
        <div className="plugin-details">
          <div className="plugin-header">
            <h3>{name}</h3>
            <span className="plugin-category-badge">{category}</span>
          </div>
          <p className="plugin-description">{description}</p>
          <div className="plugin-footer">
            <span className={`status-dot ${isEnabled ? 'online' : 'offline'}`}></span>
            <span className="status-text">{isEnabled ? 'Active' : 'Disabled'}</span>
          </div>
        </div>
      </div>
      
      <div className="plugin-actions">
        <label className="switch">
          <input 
            type="checkbox" 
            checked={isEnabled} 
            onChange={onToggle} 
          />
          <span className="slider round"></span>
        </label>
        {hasSettings && (
          <button className="settings-btn" onClick={handleSettingsClick} title="Configure Settings">
            <Settings size={18} />
          </button>
        )}
      </div>
    </div>
  );
};

export default PluginToggle;
