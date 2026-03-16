import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'
import PluginToggle from '../components/PluginToggle'

const Plugins = () => {
  const { id } = useParams()
  const [plugins, setPlugins] = useState([])
  const [config, setConfig] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch both all available plugins, and the guild's config
    Promise.all([
      api.get('/plugins'),
      api.get(`/guilds/${id}/config`)
    ]).then(([pluginsRes, configRes]) => {
      setPlugins(pluginsRes.data)
      // Map config.plugins or default to true
      setConfig(configRes.data.plugins || {})
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [id])

  const togglePlugin = async (pluginName, currentStatus) => {
    // Optimistic UI update
    const newStatus = !currentStatus
    setConfig(prev => ({ ...prev, [pluginName]: newStatus }))

    try {
      await api.post('/plugins/toggle', {
        guildId: id,
        plugin: pluginName,
        enabled: newStatus
      })
    } catch (err) {
      console.error("Failed to toggle plugin", err)
      // Revert on failure
      setConfig(prev => ({ ...prev, [pluginName]: currentStatus }))
    }
  }

  if (loading) return <div className="loading-container">Loading Plugins...</div>

  return (
    <div className="page-container fade-in">
      <div className="overview-header">
        <Link to={`/server/${id}`} className="back-link">← Back to Overview</Link>
        <h1 className="page-title">Manage Plugins</h1>
        <p className="page-subtitle">Turn Jack's features on or off for your server.</p>
      </div>

      <div className="plugins-grid">
        {plugins.map((plugin) => (
          <PluginToggle
            key={plugin.name}
            name={plugin.name}
            isEnabled={config[plugin.name] !== false}
            onToggle={() => togglePlugin(plugin.name, config[plugin.name] !== false)}
          />
        ))}
      </div>
    </div>
  )
}

export default Plugins
