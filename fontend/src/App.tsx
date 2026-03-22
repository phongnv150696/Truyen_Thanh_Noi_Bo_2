import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './pages/login/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Register from './pages/register/register'
import BroadcastTerminal from './pages/terminal/BroadcastTerminal'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('openclaw_token')
      if (token) {
        try {
          const res = await fetch(`http://${window.location.hostname}:3000/auth/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          
          if (res.ok) {
            const data = await (await res).json()
            setUser(data.user)
            localStorage.setItem('openclaw_user', JSON.stringify(data.user))
            console.log('App: Token verified successfully', data.user)
          } else {
            console.warn('App: Token verification failed', res.status)
            localStorage.removeItem('openclaw_token')
            localStorage.removeItem('openclaw_user')
            setUser(null)
          }
        } catch (e) {
          console.error('App: Error verifying token', e)
          const savedUser = localStorage.getItem('openclaw_user')
          if (savedUser) {
            try {
              setUser(JSON.parse(savedUser))
            } catch (err) {
              localStorage.removeItem('openclaw_user')
            }
          }
        }
      }
      setLoading(false)
    }

    verifyToken()
    
    // Safety timeout to ensure loading screen doesn't stay forever
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 5000)
    
    return () => clearTimeout(timeout)
  }, [])

  const handleLoginSuccess = (userData: any) => {
    setUser(userData)
    localStorage.setItem('openclaw_user', JSON.stringify(userData))
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <p>Đang khởi tạo hệ thống...</p>
        <button 
          onClick={() => { localStorage.clear(); window.location.reload(); }}
          style={{ marginTop: '1.5rem', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '8px', cursor: 'pointer' }}
        >
          Xóa cache & Tải lại
        </button>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/register" element={<Register onLoginSuccess={handleLoginSuccess} />} />
      <Route
        path="/login"
        element={!user ? <Login onLoginSuccess={handleLoginSuccess} /> : <Navigate to="/dashboard" />}
      />
      <Route
        path="/dashboard"
        element={user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Navigate to="/login" />}
      />
      <Route path="/terminal" element={<BroadcastTerminal />} />
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App
