import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { LayoutDashboard, Zap, Shield, TrendingUp, Settings, Users, User, Activity, Trash2, GraduationCap, Brain, BarChart3, Swords, Mic } from 'lucide-react';

const Sidebar = ({ id: propId }) => {
  const { id: paramId } = useParams();
  let id = propId || paramId;
  
  // Last resort failsafe: parse from URL
  if (!id || id === 'undefined') {
    const parts = window.location.pathname.split('/');
    const serverIdx = parts.indexOf('server');
    if (serverIdx !== -1 && parts[serverIdx + 1]) {
      id = parts[serverIdx + 1];
    }
  }
  
  console.log('Sidebar ID:', id);

  const navItems = [
    { name: 'Overview', path: `/server/${id}`, icon: <LayoutDashboard size={20} /> },
    { name: 'Plugins', path: `/server/${id}/plugins`, icon: <Zap size={20} /> },
    { name: 'Moderation', path: `/server/${id}/moderation`, icon: <Shield size={20} />, disabled: true },
    { name: 'Leveling', path: `/server/${id}/plugins/leveling`, icon: <TrendingUp size={20} /> },
    { name: 'Clan', path: `/server/${id}/clan`, icon: <Users size={20} /> },
    { name: 'Clan Battles', path: `/server/${id}/battles`, icon: <Swords size={20} /> },
    { name: 'Foster Program', path: `/server/${id}/foster`, icon: <GraduationCap size={20} /> },
    { name: 'Synergy Stats', path: `/server/${id}/synergy`, icon: <BarChart3 size={20} /> },
    { name: 'AI Brain', path: `/server/${id}/ai`, icon: <Brain size={20} /> },
    { name: 'Players', path: `/server/${id}/players`, icon: <User size={20} /> },
    { name: 'General Settings', path: `/server/${id}/settings/general`, icon: <Settings size={20} /> },
    { name: 'Role Mapping', path: `/server/${id}/settings/roles`, icon: <Shield size={20} /> },
    { name: 'Auto Triggers', path: `/server/${id}/triggers`, icon: <Zap size={20} /> },
    { name: 'Recordings', path: `/server/${id}/recordings`, icon: <Mic size={20} /> },
    { name: 'Logs', path: `/server/${id}/logs`, icon: <Activity size={20} /> },
    { name: 'Trash', path: `/server/${id}/trash`, icon: <Trash2 size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.disabled ? '#' : item.path}
            className={({ isActive }) => 
              `nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`
            }
            onClick={(e) => item.disabled && e.preventDefault()}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
