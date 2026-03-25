import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import ServerCard from '../components/ServerCard'

const Servers = ({ user }) => {
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/guilds')
      .then(res => {
        console.log('Fetched servers:', res.data);
        setServers(res.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading-container">Loading Servers...</div>

  return (
    <div className="page-container fade-in">
      <h1 className="page-title">Your Servers</h1>
      <p className="page-subtitle">Select a server to configure Jack Bot.</p>

      {servers.length === 0 ? (
        <div className="no-servers">
          You don't have MANAGE_GUILD permissions in any server where Jack is present.
        </div>
      ) : (
        <div className="servers-grid">
          {servers.map(server => (
            <ServerCard
              key={server.id}
              id={server.id}
              name={server.name}
              iconUrl={server.iconUrl}
              memberCount={server.memberCount}
              onClick={() => navigate(`/server/${server.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default Servers
