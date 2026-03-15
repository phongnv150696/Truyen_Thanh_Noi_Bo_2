import { useNavigate } from 'react-router-dom'

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('openclaw_token')
    onLogout()
    navigate('/login')
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '1rem'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Hệ Thống Điều Khiển V2</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Chào mừng, {user?.full_name} ({user?.rank})</p>
          </div>
          <button className="btn-primary" onClick={handleLogout} style={{ padding: '0.5rem 1rem' }}>
            Đăng Xuất
          </button>
        </header>

        <main style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Thiết bị</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>24</p>
            <p style={{ color: '#10b981', fontSize: '0.8rem' }}>● Đang hoạt động</p>
          </div>
          
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Phát thanh</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>Đang tắt</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Không có lịch trình</p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Bản tin</h3>
            <p style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>12</p>
            <p style={{ color: 'var(--primary)', fontSize: '0.8rem' }}>Hôm nay</p>
          </div>
        </main>
      </div>
    </div>
  )
}
