import { useState, useEffect } from 'react'
import { API_URL } from '../../config'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Mail, Radio, Loader2, Award, Briefcase } from 'lucide-react'
import axios from 'axios'
import '../login/loginCSS.css'

const API_BASE_URL = API_URL;

const RANK_OPTIONS = [
  'Thiếu úy', 'Trung úy', 'Thượng úy', 'Đại úy',
  'Thiếu tá', 'Trung tá', 'Thượng tá', 'Đại tá'
];

export default function Register({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        rank: '',
        position: '',
        phone: '',
        identity_card: '',
        home_address: '',
        unit_address: '',
        unit_id: ''
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register`, formData)
            const { token, user } = response.data
            
            // Lưu token và user
            localStorage.setItem('openclaw_token', token)
            onLoginSuccess(user)
            
            // Sang dashboard
            navigate('/dashboard')
        } catch (err: any) {
            setError(err.response?.data?.error || 'Lỗi khi đăng ký tài khoản')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <div className="glass-card" style={{ width: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex',
                        padding: '1rem',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(168,85,247,0.2))',
                        marginBottom: '1rem'
                    }}>
                        <Radio size={40} className="text-primary" color="#6366f1" />
                    </div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>Đăng Ký</h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>Tham gia hệ thống OpenClaw</p>
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

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Tên đăng nhập</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Nhập username..."
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Họ và tên</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Nguyễn Văn A..."
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
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
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Cấp bậc</label>
                        <div style={{ position: 'relative' }}>
                            <Award size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }} />
                            <select
                                required
                                value={formData.rank}
                                onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem 0.8rem 2.5rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    outline: 'none',
                                    appearance: 'none',
                                    boxSizing: 'border-box',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="" disabled style={{ background: '#1e293b' }}>Chọn cấp bậc...</option>
                                {RANK_OPTIONS.map(rank => (
                                    <option key={rank} value={rank} style={{ background: '#1e293b' }}>{rank}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Chức vụ</label>
                        <div style={{ position: 'relative' }}>
                            <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="text"
                                placeholder="Đại đội trưởng, Kỹ thuật viên..."
                                required
                                value={formData.position}
                                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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


                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Số điện thoại</label>
                            <input 
                                type="text"
                                placeholder="09xx..."
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    color: 'white',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>CMND/CCCD</label>
                            <input
                                type="text"
                                placeholder="Số định danh..."
                                value={formData.identity_card}
                                onChange={(e) => setFormData({ ...formData, identity_card: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem',
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Quê quán</label>
                        <input
                            type="text"
                            placeholder="Địa chỉ thường trú..."
                            value={formData.home_address}
                            onChange={(e) => setFormData({ ...formData, home_address: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Đơn vị công tác (Tên đơn vị)</label>
                        <input
                            type="text"
                            placeholder="VD: Đại đội 1, Tiểu đoàn 2..."
                            required
                            value={formData.unit_id}
                            onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem',
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                color: 'white',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="email"
                                placeholder="email@example.com"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Mật khẩu</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                type="password"
                                placeholder="••••••••"
                                required
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} disabled={loading}>
                        {loading ? <Loader2 size={20} className="animate-spin" /> : 'Đăng Ký Ngay'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Đã có tài khoản? <Link to="/login" className="register-link">Đăng Nhập</Link>
                </div>
            </div>
        </div>
    )
}