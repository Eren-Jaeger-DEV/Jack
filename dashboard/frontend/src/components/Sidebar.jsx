import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, Zap, Shield, TrendingUp, Settings, 
  Users, User, Activity, Trash2, GraduationCap, 
  Brain, BarChart3, Swords, Mic, PieChart 
} from 'lucide-react';

const Sidebar = ({ id: propId }) => {
  const { id: paramId } = useParams();
  let id = propId || paramId;
  
  if (!id || id === 'undefined') {
    const parts = window.location.pathname.split('/');
    const serverIdx = parts.indexOf('server');
    if (serverIdx !== -1 && parts[serverIdx + 1]) {
      id = parts[serverIdx + 1];
    }
  }

  const navGroups = [
    {
      title: 'STRATEGIC OVERWATCH',
      items: [
        { name: 'Neural Overview', path: `/server/${id}`, icon: <LayoutDashboard size={18} /> },
        { name: 'Neural Link (AI)', path: `/server/${id}/ai`, icon: <Brain size={18} /> },
      ]
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Clan Strategy', path: `/server/${id}/clan`, icon: <Users size={18} /> },
        { name: 'Combat Battles', path: `/server/${id}/battles`, icon: <Swords size={18} /> },
        { name: 'Foster Program', path: `/server/${id}/foster`, icon: <GraduationCap size={18} /> },
        { name: 'Demographics', path: `/server/${id}/classification`, icon: <PieChart size={18} /> },
        { name: 'Synergy Matrix', path: `/server/${id}/synergy`, icon: <BarChart3 size={18} /> },
      ]
    },
    {
      title: 'PERSONNEL',
      items: [
        { name: 'Combatants', path: `/server/${id}/players`, icon: <User size={18} /> },
        { name: 'Data Trash', path: `/server/${id}/trash`, icon: <Trash2 size={18} /> },
      ]
    },
    {
      title: 'INFRASTRUCTURE',
      items: [
        { name: 'Neural Plugins', path: `/server/${id}/plugins`, icon: <Zap size={18} /> },
        { name: 'Auto-Triggers', path: `/server/${id}/triggers`, icon: <Zap size={18} /> },
        { name: 'System Settings', path: `/server/${id}/settings/general`, icon: <Settings size={18} /> },
        { name: 'Role Protocol', path: `/server/${id}/settings/roles`, icon: <Shield size={18} /> },
      ]
    },
    {
      title: 'SYSTEM LOGS',
      items: [
        { name: 'Operation Logs', path: `/server/${id}/logs`, icon: <Activity size={18} /> },
        { name: 'Audio Records', path: `/server/${id}/recordings`, icon: <Mic size={18} /> },
      ]
    }
  ];

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
        <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-gold)' }}>JACK v4.2</h1>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700 }}>STRATEGIC SYSTEM MANAGER</div>
      </div>
      <nav className="sidebar-nav">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              fontSize: '0.65rem', 
              fontWeight: 800, 
              color: 'var(--text-muted)', 
              marginBottom: '10px', 
              padding: '0 1.25rem',
              letterSpacing: '0.05em'
            }}>
              {group.title}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.disabled ? '#' : item.path}
                className={({ isActive }) => 
                  `nav-item ${isActive ? 'active' : ''} ${item.disabled ? 'disabled' : ''}`
                }
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text" style={{ fontSize: '0.9rem' }}>{item.name}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
