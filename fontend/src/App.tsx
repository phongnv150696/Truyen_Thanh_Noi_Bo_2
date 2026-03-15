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
        setUser(JSON.parse(savedUser))
      }
    }
    setLoading(false)
  }, [])

  const handleLoginSuccess = (userData: any) => {
    setUser(userData)
    localStorage.setItem('openclaw_user', JSON.stringify(userData))
  }

  if (loading) return null

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
