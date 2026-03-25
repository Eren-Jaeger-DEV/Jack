import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import PluginToggle from '../components/PluginToggle';
import { LayoutGrid, Shield, Wrench, TrendingUp, Gamepad } from 'lucide-react';

const Plugins = () => {
  const { id: paramId } = useParams();
  let id = paramId;

  // Last resort failsafe: parse from URL
  if (!id || id === 'undefined') {
    const parts = window.location.pathname.split('/');
    const serverIdx = parts.indexOf('server');
    if (serverIdx !== -1 && parts[serverIdx + 1]) {
      id = parts[serverIdx + 1];
    }
  }

  const [plugins, setPlugins] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', 'Moderation', 'Utility', 'Engagement', 'Fun'];
  const categoryIcons = {
    'All': <LayoutGrid size={18} />,
    'Moderation': <Shield size={18} />,
    'Utility': <Wrench size={18} />,
    'Engagement': <TrendingUp size={18} />,
    'Fun': <Gamepad size={18} />
  };

  useEffect(() => {
    const fetchData = async () => {
      // First fetch plugins (always work)
      try {
        const pluginsRes = await api.get('/plugins');
        setPlugins(pluginsRes.data);
      } catch (err) {
        console.error("Failed to fetch plugins list:", err);
      }

      // Then fetch specific guild config
      if (id && id !== 'undefined') {
        try {
          const configRes = await api.get(`/guilds/${id}/config`);
          setConfig(configRes.data.plugins || {});
        } catch (err) {
          console.error(`Failed to fetch config for guild ${id}:`, err);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [id]);

  const togglePlugin = async (pluginName, currentStatus) => {
    const newStatus = !currentStatus;
    setConfig(prev => ({ ...prev, [pluginName]: newStatus }));

    try {
      await api.post('/plugins/toggle', {
        guildId: id,
        plugin: pluginName,
        enabled: newStatus
      });
    } catch (err) {
      console.error("Failed to toggle plugin", err);
      setConfig(prev => ({ ...prev, [pluginName]: currentStatus }));
    }
  };

  const filteredPlugins = activeCategory === 'All' 
    ? plugins 
    : plugins.filter(p => p.category === activeCategory);

  if (loading) return <div className="loading-container">Loading Plugins...</div>;

  return (
    <div className="page-container fade-in">
      <div className="overview-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Plugin Control Panel</h1>
          <p className="page-subtitle">Manage all 22 features and automation modules.</p>
        </div>
        <div className="category-filters">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {categoryIcons[cat]}
              <span>{cat}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="plugins-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
        gap: '1.5rem' 
      }}>
        {filteredPlugins.map((plugin) => (
          <PluginToggle
            key={plugin.id}
            id={plugin.id}
            name={plugin.name}
            description={plugin.description}
            category={plugin.category}
            icon={plugin.icon}
            hasSettings={plugin.hasSettings}
            isEnabled={config[plugin.id] !== false}
            onToggle={() => togglePlugin(plugin.id, config[plugin.id] !== false)}
          />
        ))}
      </div>
    </div>
  );
};

export default Plugins;
