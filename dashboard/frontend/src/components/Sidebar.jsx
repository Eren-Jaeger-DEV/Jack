import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { LayoutDashboard, Zap, Shield, TrendingUp, Settings } from 'lucide-react';

const Sidebar = () => {
  const { id } = useParams();

  const navItems = [
    { name: 'Overview', path: `/server/${id}`, icon: <LayoutDashboard size={20} /> },
    { name: 'Plugins', path: `/server/${id}/plugins`, icon: <Zap size={20} /> },
    { name: 'Moderation', path: `/server/${id}/moderation`, icon: <Shield size={20} />, disabled: true },
    { name: 'Leveling', path: `/server/${id}/plugins/leveling`, icon: <TrendingUp size={20} /> },
    { name: 'Settings', path: `/server/${id}/settings`, icon: <Settings size={20} />, disabled: true },
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
