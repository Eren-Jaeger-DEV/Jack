import React from 'react'

const Login = () => {
  const handleLogin = () => {
    window.location.href = '/api/auth/login'
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Jack Dashboard</h1>
        <p>Manage your servers, configure plugins, and more.</p>
        <button className="btn btn-discord" onClick={handleLogin}>
          Login with Discord
        </button>
      </div>
    </div>
  )
}

export default Login
