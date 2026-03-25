import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import api from './api/client'
import Login from './pages/Login'
import Servers from './pages/Servers'
import ServerOverview from './pages/ServerOverview'
import Plugins from './pages/Plugins'
import PluginSettings from './pages/PluginSettings'
import LevelingSettings from './pages/LevelingSettings'
import ClanManagement from './pages/ClanManagement'
import Players from './pages/Players'
import AdminLogs from './pages/AdminLogs'
import DeletedPlayers from './pages/DeletedPlayers'
import GeneralSettings from './pages/GeneralSettings'
import RoleMapping from './pages/RoleMapping'
import Triggers from './pages/Triggers'
import Sidebar from './components/Sidebar'
import ServerLayout from './layouts/ServerLayout'
import './index.css'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in
    api.get('/user')
      .then(res => {
        setUser(res.data)
      })
      .catch((err) => {
        setUser(null)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="loading-screen">Loading...</div>
  }

  return (
    <Router>
      <div className="app-container">
        {user && (
          <nav className="navbar">
            <div className="navbar-brand">Jack Dashboard</div>
            <div className="navbar-user">
              <img src={`https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`} alt="Avatar" className="avatar" />
              <span>{user.username}</span>
            </div>
          </nav>
        )}

        <div className="layout-content">
          <Routes>
            <Route path="/" element={user ? <Navigate to="/servers" /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/servers" />} />
            <Route path="/servers" element={user ? <Servers user={user} /> : <Navigate to="/login" />} />
            
            {/* Server Specific Routes with Sidebar */}
            <Route path="/server/:id" element={user ? <ServerLayout /> : <Navigate to="/login" />}>
              <Route index element={<ServerOverview />} />
              <Route path="plugins" element={<Plugins />} />
              <Route path="plugins/leveling" element={<LevelingSettings />} />
              <Route path="plugins/:pluginName" element={<PluginSettings />} />
              <Route path="clan" element={<ClanManagement />} />
              <Route path="players" element={<Players user={user} />} />
              <Route path="triggers" element={<Triggers />} />
              <Route path="settings/general" element={<GeneralSettings />} />
              <Route path="settings/roles" element={<RoleMapping />} />
              <Route path="logs" element={<AdminLogs user={user} />} />
              <Route path="trash" element={<DeletedPlayers user={user} />} />
            </Route>
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
