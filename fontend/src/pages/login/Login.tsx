import { useState } from 'react'
import { Lock, User, Radio, Loader2 } from 'lucide-react'
import axios from 'axios'
import { useNavigate, Link } from 'react-router-dom'
import './loginCSS.css'

import { API_BASE_URL } from '../../config'

export default function Login({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        username,
        password
      })

      const { token, user: userData } = response.data
      localStorage.setItem('openclaw_token', token)
      onLoginSuccess(userData)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không thể kết nối tới máy chủ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="glass-card" style={{ width: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="Logo" style={{ 
            width: '100px', 
            height: '100px', 
            objectFit: 'contain',
            marginBottom: '1rem'
          }} className="ani-pulse" />
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>TRUYỀN THANH NỘI BỘ</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontWeight: 600 }}>Hệ thống Quản lý & Điều hành Phát thanh</p>
        </div>

        {error && (
          <div style={{
            padding: '0.8rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tên đăng nhập</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem 0.8rem 2.5rem',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem 0.8rem 2.5rem',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  borderRadius: '10px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={loading}>
            {loading ? <Loader2 size={20} className="animate-spin" /> : 'Đăng Nhập'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Bạn chưa có tài khoản ? | <Link to="/register" className="register-link">Đăng Ký</Link>
        </div>
      </div>
    </div>
  )
}
