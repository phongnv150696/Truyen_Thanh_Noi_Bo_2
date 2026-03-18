import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Login from './pages/login/Login'
import Dashboard from './pages/dashboard/Dashboard'
import Register from './pages/register/register'

function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Kiểm tra token cũ trong localStorage khi app khởi động
    const token = localStorage.getItem('openclaw_token')
    if (token) {
      // Trong thực tế sẽ gọi API verify token ở đây
      // Tạm thời mockup để test flow
      const savedUser = localStorage.getItem('openclaw_user')
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser))
          console.log('App: Loaded user from localStorage', savedUser)
        } catch (e) {
          console.error('App: Failed to parse saved user', e)
          localStorage.removeItem('openclaw_user')
        }
      }
    }
    console.log('App: Finished loading state', { hasToken: !!token })
    setLoading(false)
    
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
      <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
    </Routes>
  )
}

export default App
