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
  ChevronRight,
  Lock,
  ShieldCheck,
  CheckSquare,
  Briefcase
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000`;

interface UserData {
  id: number;
  username: string;
  full_name: string;
  rank: string;
  position: string;
  email: string;
  role_name: string;
  unit_name: string;
  created_at: string;
}

const getRoleDisplayName = (roleName: string) => {
  const mapping: Record<string, string> = {
    'admin': 'Quản trị viên',
    'technician': 'Kỹ thuật viên',
    'commander': 'Ban chỉ huy',
    'editor': 'Biên tập viên',
    'broadcaster': 'Phát thanh viên',
    'listener': 'Thành viên'
  };
  return mapping[roleName?.toLowerCase()] || roleName;
};

interface AuditLog {
  id: number;
  action: string;
  target_table: string;
  details: any;
  created_at: string;
}

export default function UserProfile({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'activity'>('info');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Form States
  const [profileForm, setProfileForm] = useState({ full_name: '', rank: '', position: '', email: '' });
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
      if (res.status === 401) {
        onLogout?.();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
        setProfileForm({
          full_name: data.full_name || '',
          rank: data.rank || '',
          position: data.position || '',
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
    <div className="animate-fade-in" style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 900, margin: 0, letterSpacing: '-1.5px', background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Cấu hình Tài khoản
        </h1>
        <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.6rem', fontWeight: 500 }}>Quản lý thông tin cá nhân, bảo mật và xem lại lịch sử hoạt động của bạn.</p>
      </header>

      {message && (
        <div className="animate-scale-in" style={{ 
          padding: '1.2rem 1.8rem', 
          borderRadius: '20px', 
          marginBottom: '2.5rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '14px',
          background: message.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
          border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          color: message.type === 'success' ? '#10b981' : '#f87171',
          fontWeight: 700,
          boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
        }}>
          {message.type === 'success' ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2.5rem', alignItems: 'start' }}>
        {/* Sidebar Tabs */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'sticky', top: '20px' }}>
          <div className="glass-card" style={{ padding: '2.5rem 2rem', textAlign: 'center', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.3)' }}>
            <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 1.5rem' }}>
              <div style={{ 
                width: '100%', height: '100%', borderRadius: '32px', 
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.5rem', fontWeight: 900, color: 'white', 
                boxShadow: '0 15px 35px rgba(99, 102, 241, 0.4)',
                border: '2px solid rgba(255,255,255,0.2)',
                transform: 'rotate(-5deg)'
              }}>
                {userData?.username?.substring(0, 1).toUpperCase()}
              </div>
              <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '32px', height: '32px', background: '#10b981', borderRadius: '10px', border: '3px solid #0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} color="white" />
              </div>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>{userData?.full_name}</h3>
            <div style={{ 
              marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', 
              padding: '4px 12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '20px',
              color: '#818cf8', fontWeight: 800, fontSize: '0.75rem', letterSpacing: '1px', textTransform: 'uppercase'
            }}>
              <Award size={14} /> {userData?.rank}
            </div>
            
            {userData && (
              <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Chức vụ', value: userData.position, icon: <Briefcase size={18} /> },
                  { label: 'Email', value: userData.email, icon: <Mail size={18} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: '#6366f1' }}>{icon}</div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ margin: 0, fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500, color: '#f1f5f9' }}>{value || 'Chưa cập nhật'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {[
            { id: 'info', label: 'Thông tin cá nhân', icon: User },
            { id: 'security', label: 'Bảo mật & Mật khẩu', icon: Key },
            { id: 'activity', label: 'Nhật ký hoạt động', icon: History }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 24px', borderRadius: '20px', border: '1px solid transparent',
                background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))' : 'transparent',
                borderColor: activeTab === tab.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : '#64748b',
                cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                fontWeight: 700, textAlign: 'left',
                boxShadow: activeTab === tab.id ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
              }}
              className={activeTab === tab.id ? '' : 'nav-item-hover-fix'}
            >
              <tab.icon size={20} color={activeTab === tab.id ? '#818cf8' : 'currentColor'} /> 
              <span style={{ flex: 1 }}>{tab.label}</span>
              {activeTab === tab.id && <ChevronRight size={16} opacity={0.5} />}
            </button>
          ))}
        </aside>

        {/* Tab Content */}
        <main className="glass-card" style={{ padding: '3rem', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(15, 23, 42, 0.2)' }}>
          {activeTab === 'info' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px' }}>
                  <User color="#818cf8" size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>Hồ sơ cá nhân</h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Cập nhật các thông tin định danh và liên hệ của bạn.</p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Tên đăng nhập (ID)</label>
                    <div style={{ position: 'relative' }}>
                      <User size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#334155' }} />
                      <input className="premium-input" disabled value={userData?.username} style={{ paddingLeft: '48px', opacity: 0.5, cursor: 'not-allowed', background: 'rgba(0,0,0,0.2)' }} />
                    </div>
                  </div>
                  <div className="premium-form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column' }}>
                    <label className="premium-label">Vai trò hệ thống</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: '16px', color: '#818cf8', fontWeight: 800, fontSize: '0.9rem', height: '52px' }}>
                      <Shield size={18} /> {getRoleDisplayName(userData?.role_name || 'user')}
                    </div>
                  </div>
                </div>

                <div className="premium-form-group" style={{ marginBottom: 0 }}>
                  <label className="premium-label">Họ và tên đầy đủ</label>
                  <input 
                    className="premium-input" 
                    value={profileForm.full_name} 
                    onChange={e => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    placeholder="VD: Nguyễn Văn A"
                    style={{ fontSize: '1.05rem', fontWeight: 600 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Vai trò & Cấp bậc</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Cấp bậc</label>
                        <input 
                          className="premium-input" 
                          value={profileForm.rank} 
                          onChange={e => setProfileForm({ ...profileForm, rank: e.target.value })}
                          placeholder="VD: Thượng tá"
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '8px' }}>Chức vụ</label>
                        <input 
                          className="premium-input" 
                          value={profileForm.position} 
                          onChange={e => setProfileForm({ ...profileForm, position: e.target.value })}
                          placeholder="VD: Trưởng phòng"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="premium-form-group" style={{ marginBottom: 0 }}>
                    <label className="premium-label">Địa chỉ Email</label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input 
                        className="premium-input" 
                        style={{ paddingLeft: '48px' }}
                        type="email"
                        value={profileForm.email} 
                        onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="premium-form-group" style={{ marginBottom: 0 }}>
                  <label className="premium-label">Đơn vị công tác</label>
                  <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#94a3b8', fontSize: '0.95rem', height: '52px', display: 'flex', alignItems: 'center' }}>
                    {userData?.unit_name || 'Đang cập nhật...'}
                  </div>
                </div>

                <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '16px 40px', borderRadius: '16px', fontSize: '1rem' }}>
                    <Save size={20} /> {submitting ? 'ĐANG LƯU...' : 'CẬP NHẬT THÔNG TIN'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
                <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '16px' }}>
                  <Key color="#f59e0b" size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>Bảo mật tài khoản</h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Thay đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn.</p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem', maxWidth: '550px' }}>
                <div className="premium-form-group">
                  <label className="premium-label">Mật khẩu hiện tại</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#ef4444', opacity: 0.6 }} />
                    <input 
                      type="password" 
                      required
                      className="premium-input" 
                      value={passwordForm.current_password}
                      onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      style={{ background: 'rgba(239, 68, 68, 0.02)', paddingLeft: '48px' }}
                    />
                  </div>
                </div>
                
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.5rem 0' }} />
                
                <div className="premium-form-group">
                  <label className="premium-label">Mật khẩu mới</label>
                  <div style={{ position: 'relative' }}>
                    <ShieldCheck size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', opacity: 0.8 }} />
                    <input 
                      type="password" 
                      required
                      className="premium-input" 
                      value={passwordForm.new_password}
                      onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      style={{ paddingLeft: '48px' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} /> Mật khẩu phải từ 6 ký tự, nên bao gồm chữ hoa, chữ thường và số.
                  </p>
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Xác nhận mật khẩu mới</label>
                  <div style={{ position: 'relative' }}>
                    <CheckSquare size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1', opacity: 0.8 }} />
                    <input 
                      type="password" 
                      required
                      className="premium-input" 
                      value={passwordForm.confirm_password}
                      onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      style={{ paddingLeft: '48px' }}
                    />
                  </div>
                </div>

                <div style={{ paddingTop: '1rem' }}>
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ padding: '16px 40px', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                    {submitting ? 'ĐANG XỬ LÝ...' : 'XÁC NHẬN ĐỔI MẬT KHẨU'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="animate-fade-in">
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '2.5rem' }}>
                <div style={{ padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px' }}>
                  <History color="#818cf8" size={28} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, margin: 0 }}>Nhật ký hoạt động</h2>
                  <p style={{ color: '#64748b', margin: 0, fontSize: '0.9rem' }}>Theo dõi các thao tác quan trọng bạn đã thực hiện trên hệ thống.</p>
                </div>
              </div>

              <div style={{ position: 'relative', paddingLeft: '2rem' }}>
                <div style={{ position: 'absolute', left: '7px', top: 0, bottom: 0, width: '2px', background: 'linear-gradient(180deg, #6366f1 0%, transparent 100%)', opacity: 0.3 }} />
                
                {logs.length === 0 ? (
                  <div style={{ padding: '4rem 0', textAlign: 'center', color: '#64748b' }}>
                    <Clock size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                    <p>Chưa ghi nhận hoạt động nào gần đây.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {logs.map((log) => (
                      <div key={log.id} style={{ position: 'relative' }}>
                        <div style={{ 
                          position: 'absolute', left: '-2.45rem', top: '10px', 
                          width: '12px', height: '12px', borderRadius: '50%', 
                          background: getActionColor(log.action),
                          boxShadow: `0 0 10px ${getActionColor(log.action)}`,
                          zIndex: 2
                        }} />
                        <div className="glass-card" style={{ 
                          padding: '1.2rem 1.8rem', background: 'rgba(255,255,255,0.02)', 
                          border: '1px solid rgba(255,255,255,0.05)', borderRadius: '18px',
                          display: 'flex', alignItems: 'center', gap: '1.5rem',
                          transition: 'all 0.3s'
                        }}>
                          <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Clock size={20} color={getActionColor(log.action)} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: '#f8fafc' }}>{getActionLabel(log.action)}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                              <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                              <span style={{ fontSize: '0.8rem', color: '#334155' }}>•</span>
                              <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>ID: {log.id}</span>
                            </div>
                          </div>
                          <ChevronRight size={18} color="#1e293b" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
