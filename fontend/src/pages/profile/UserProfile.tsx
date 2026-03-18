import { useState, useEffect } from 'react';
import { 
  User, 
  Key, 
  History, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Shield,
  Mail,
  Award,
  Clock,
  ChevronRight
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:3000';

interface UserData {
  id: number;
  username: string;
  full_name: string;
  rank: string;
  email: string;
  role_name: string;
  unit_name: string;
  created_at: string;
}

interface AuditLog {
  id: number;
  action: string;
  target_table: string;
  details: any;
  created_at: string;
}

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'activity'>('info');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form States
  const [profileForm, setProfileForm] = useState({ full_name: '', rank: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/profile/me`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        setProfileForm({
          full_name: data.full_name || '',
          rank: data.rank || '',
          email: data.email || ''
        });
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_URL}/profile/me/logs`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchProfile(), fetchLogs()]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/profile/me`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        const updated = await res.json();
        setUserData(prev => prev ? { ...prev, ...updated } : null);
        setMessage({ type: 'success', text: 'Cập nhật thông tin thành công!' });
      } else {
        setMessage({ type: 'error', text: 'Cập nhật thất bại. Vui lòng thử lại.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/profile/me/change-password`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        const err = await res.json();
        setMessage({ type: 'error', text: err.error || 'Đổi mật khẩu thất bại.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid rgba(99, 102, 241, 0.1)', borderTopColor: '#6366f1', borderRadius: '50%', margin: '0 auto 1.5rem' }} />
        <p>Đang tải thông tin tài khoản...</p>
      </div>
    );
  }

  const getActionLabel = (action: string) => {
    switch(action) {
      case 'LOGIN': return 'Đăng nhập hệ thống';
      case 'PROFILE_UPDATED': return 'Cập nhật hồ sơ';
      case 'PASSWORD_CHANGED': return 'Thay đổi mật khẩu';
      case 'EMERGENCY_TRIGGERED': return 'KÍCH HOẠT PHÁT BÁO ĐỘNG';
      case 'EMERGENCY_STOPPED': return 'Dừng phát báo động';
      default: return action;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('EMERGENCY')) return '#ef4444';
    if (action.includes('PASSWORD') || action.includes('LOGIN')) return '#6366f1';
    return '#94a3b8';
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Cài đặt Tài khoản</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Quản lý thông tin cá nhân, bảo mật và xem lịch sử hoạt động.</p>
      </header>

      {message && (
        <div className="animate-scale-in" style={{ 
          padding: '1rem 1.5rem', 
          borderRadius: '16px', 
          marginBottom: '2rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: message.type === 'success' ? '#10b981' : '#f87171',
          fontWeight: 600
        }}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Sidebar Tabs */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', background: '#6366f1', 
              margin: '0 auto 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 800, color: 'white', border: '4px solid rgba(255,255,255,0.05)'
            }}>
              {userData?.username?.substring(0, 1).toUpperCase()}
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>{userData?.full_name}</h3>
            <p style={{ margin: '4px 0 0 0', color: '#6366f1', fontWeight: 600, fontSize: '0.85rem' }}>{userData?.rank}</p>
          </div>

          <button 
            onClick={() => setActiveTab('info')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px', border: 'none',
              background: activeTab === 'info' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: activeTab === 'info' ? '#818cf8' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, textAlign: 'left'
            }}
          >
            <User size={18} /> <span>Thông tin cá nhân</span>
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px', border: 'none',
              background: activeTab === 'security' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: activeTab === 'security' ? '#818cf8' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, textAlign: 'left'
            }}
          >
            <Key size={18} /> <span>Bảo mật & Mật khẩu</span>
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px', borderRadius: '12px', border: 'none',
              background: activeTab === 'activity' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: activeTab === 'activity' ? '#818cf8' : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s', fontWeight: 600, textAlign: 'left'
            }}
          >
            <History size={18} /> <span>Nhật ký hoạt động</span>
          </button>
        </aside>

        {/* Tab Content */}
        <main className="glass-card" style={{ padding: '2.5rem' }}>
          {activeTab === 'info' && (
            <div className="animate-fade-in">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                <User color="#6366f1" size={24} /> Hồ sơ cá nhân
              </h2>
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Tên đăng nhập (ID)</label>
                    <input className="premium-input" disabled value={userData?.username} style={{ opacity: 0.6 }} />
                  </div>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Vai trò hệ thống</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: '#818cf8', fontWeight: 700 }}>
                      <Shield size={16} /> {userData?.role_name?.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="premium-form-group">
                  <label className="premium-label">Họ và tên</label>
                  <input 
                    className="premium-input" 
                    value={profileForm.full_name} 
                    onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Cấp bậc / Chức vụ</label>
                    <div style={{ position: 'relative' }}>
                      <Award size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input 
                        className="premium-input" 
                        style={{ paddingLeft: '45px' }}
                        value={profileForm.rank} 
                        onChange={e => setProfileForm({ ...profileForm, rank: e.target.value })}
                        placeholder="VD: Thượng tá"
                      />
                    </div>
                  </div>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Địa chỉ Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input 
                        className="premium-input" 
                        style={{ paddingLeft: '45px' }}
                        type="email"
                        value={profileForm.email} 
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="premium-form-group">
                  <label className="premium-label">Đơn vị công tác</label>
                  <input className="premium-input" disabled value={userData?.unit_name} style={{ opacity: 0.6 }} />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: 'fit-content', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Save size={18} /> {submitting ? 'Đang lưu...' : 'Cập nhật hồ sơ'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                <Key color="#6366f1" size={24} /> Đổi mật khẩu
              </h2>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div className="premium-form-group">
                  <label className="premium-label">Mật khẩu hiện tại</label>
                  <input 
                    type="password" 
                    required
                    className="premium-input" 
                    value={passwordForm.current_password}
                    onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                  />
                </div>
                <div className="dropdown-divider" style={{ margin: '0.5rem 0' }} />
                <div className="premium-form-group">
                  <label className="premium-label">Mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    className="premium-input" 
                    value={passwordForm.new_password}
                    onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>Mật khẩu nên có ít nhất 6 ký tự bao gồm chữ và số.</p>
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password" 
                    required
                    className="premium-input" 
                    value={passwordForm.confirm_password}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                </div>

                <button type="submit" disabled={submitting} className="btn-primary" style={{ width: 'fit-content', padding: '12px 32px' }}>
                  {submitting ? 'Đang xử lý...' : 'Đổi mật khẩu ngay'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="animate-fade-in">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem', fontWeight: 700, marginBottom: '2rem' }}>
                <History color="#6366f1" size={24} /> Hoạt động gần đây
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                {logs.length === 0 ? (
                  <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Chưa có lịch sử hoạt động.</div>
                ) : (
                  logs.map(log => (
                    <div key={log.id} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock size={18} color={getActionColor(log.action)} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>{getActionLabel(log.action)}</p>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>Thực thực hiện vào {new Date(log.created_at).toLocaleString('vi-VN')}</p>
                      </div>
                      <ChevronRight size={18} color="#1e293b" />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
