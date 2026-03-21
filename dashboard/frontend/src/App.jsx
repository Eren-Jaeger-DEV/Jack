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
import Sidebar from './components/Sidebar'
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
          {user && <Sidebar />}
          <main className="main-content">
            <Routes>
              <Route path="/" element={user ? <Navigate to="/servers" /> : <Navigate to="/login" />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/servers" />} />
              <Route path="/servers" element={user ? <Servers user={user} /> : <Navigate to="/login" />} />
              <Route path="/server/:id" element={user ? <ServerOverview /> : <Navigate to="/login" />} />
              <Route path="/server/:id/plugins" element={user ? <Plugins /> : <Navigate to="/login" />} />
              <Route path="/server/:id/plugins/leveling" element={user ? <LevelingSettings /> : <Navigate to="/login" />} />
              <Route path="/server/:id/plugins/:pluginName" element={user ? <PluginSettings /> : <Navigate to="/login" />} />
              <Route path="/server/:id/clan" element={user ? <ClanManagement /> : <Navigate to="/login" />} />
              <Route path="/server/:id/players" element={user ? <Players user={user} /> : <Navigate to="/login" />} />
              <Route path="/server/:id/logs" element={user ? <AdminLogs user={user} /> : <Navigate to="/login" />} />
              <Route path="/server/:id/trash" element={user ? <DeletedPlayers user={user} /> : <Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  )
}

export default App
