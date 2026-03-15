import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radio,
  Settings,
  Users,
  Mic,
  LogOut,
  Calendar,
  Database,
  Bell,
  Cpu,
  Activity,
  Home,
  User,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  HardDrive,
  UserPlus
} from 'lucide-react'
import './dashboardCSS.css'
import MediaLibrary from './media/MediaLibrary'
import DeviceManagement from './devices/DeviceManagement'
import UserManagement from './users/UserManagement'
import ScheduleManagement from './schedules/ScheduleManagement'
import SystemSettings from './settings/SystemSettings'

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

interface DashboardStats {
  devices: { total: number; online: number };
  media: { total: number; totalSize: number };
  users: { total: number; pending: number };
  history: any[];
  proposals: number;
}

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('overview')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        fetch('http://localhost:3000/notifications'),
        fetch('http://localhost:3000/notifications/unread-count')
      ]);
      if (!notifsRes.ok || !countRes.ok) return;
      const notifsData = await notifsRes.json();
      const countData = await countRes.json();
      setNotifications(notifsData || []);
      setUnreadCount(countData?.count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('http://localhost:3000/dashboard/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    const interval = setInterval(() => {
        fetchNotifications();
        if (activeTab === 'overview') fetchStats();
    }, 30000); 
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await fetch(`http://localhost:3000/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch('http://localhost:3000/notifications/read-all', { method: 'PATCH' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('openclaw_token')
    onLogout()
    navigate('/login')
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="#10b981" />;
      case 'warning': return <AlertTriangle size={18} color="#f59e0b" />;
      case 'error': return <XCircle size={18} color="#ef4444" />;
      default: return <Info size={18} color="#6366f1" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="dashboard-container animate-fade-in">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '8px', borderRadius: '10px' }}>
            <Radio size={28} color="#6366f1" />
          </div>
          <div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.5px', display: 'block', lineHeight: 1 }}>OpenClaw</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Hệ thống V2</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <div style={{ position: 'relative' }} ref={notificationRef}>
            <div style={{ cursor: 'pointer' }} onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
              <Bell size={24} color={unreadCount > 0 ? "#818cf8" : "#94a3b8"} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '-5px', right: '-5px', width: '18px', height: '18px',
                  background: '#f87171', borderRadius: '50%', border: '2px solid #000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 800, color: 'white'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>

            {isNotificationOpen && (
              <div className="profile-dropdown animate-scale-in" style={{ width: '380px', right: '0', top: '45px' }}>
                <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Thông báo</h3>
                  <button onClick={handleMarkAllAsRead} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Đánh dấu đã đọc</button>
                </div>
                <div className="dropdown-divider" />
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      <Bell size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p>Không có thông báo mới</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="dropdown-item" 
                        style={{ padding: '1.2rem 1.5rem', flexDirection: 'column', alignItems: 'flex-start', background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)' }}
                        onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}>
                        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '4px' }}>
                          <div style={{ marginTop: '2px' }}>{getNotifIcon(notif.type)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: notif.is_read ? '#94a3b8' : '#f8fafc' }}>{notif.title}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>{notif.message}</div>
                          </div>
                          {!notif.is_read && <div style={{ width: '8px', height: '8px', background: '#6366f1', borderRadius: '50%', marginTop: '6px' }} />}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginLeft: '30px' }}>
                          {notif.created_at ? new Date(notif.created_at).toLocaleTimeString() : '--:--'} • {notif.created_at ? new Date(notif.created_at).toLocaleDateString() : '--/--/--'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="dropdown-divider" />
                <div className="dropdown-item" style={{ justifyContent: 'center', color: '#6366f1', fontWeight: 700 }}>Xem tất cả hoạt động</div>
              </div>
            )}
          </div>

          <div className="user-profile-container" ref={dropdownRef}>
            <div className="user-profile-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{user?.full_name || 'Admin'}</p>
                <p style={{ margin: 0, color: '#6366f1', fontSize: '0.75rem', fontWeight: 700 }}>{user?.rank || 'Operator'}</p>
              </div>
              <div className="user-avatar">{user?.username?.substring(0, 1)?.toUpperCase() || 'A'}</div>
            </div>

            {isDropdownOpen && (
              <div className="profile-dropdown animate-scale-in">
                <div className="dropdown-header">
                  <p className="dropdown-name">{user?.full_name || 'Admin'}</p>
                  <p className="dropdown-email">{user?.email || 'admin@openclaw.com'}</p>
                </div>
                <div className="dropdown-divider" />
                <div className="dropdown-item"><User size={18} /><span>Thông tin cá nhân</span></div>
                <div className="dropdown-item"><Shield size={18} /><span>Quyền hạn: {user?.rank || 'Admin'}</span></div>
                <div className="dropdown-item"><Key size={18} /><span>Đổi mật khẩu</span></div>
                <div className="dropdown-divider" />
                <div className="dropdown-item logout" onClick={handleLogout}><LogOut size={18} /><span>Đăng xuất</span></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className="sidebar">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><Home size={20} /><span>Tổng quan hệ thống</span></div>
            <div className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}><Calendar size={20} /><span>Quản Lý Lịch phát thanh</span></div>
            <div className={`nav-item ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}><Database size={20} /><span>Quản Lý Thư viện Media</span></div>
            <div className={`nav-item ${activeTab === 'devices' ? 'active' : ''}`} onClick={() => setActiveTab('devices')}><Cpu size={20} /><span>Quản lý thiết bị</span></div>
            <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}><Users size={20} /><span>Quản lý nhân sự</span></div>
            <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}><Settings size={20} /><span>Cấu hình hệ thống</span></div>
          </nav>
          <div className="nav-item" onClick={handleLogout} style={{ color: '#f87171', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.5rem' }}><LogOut size={20} /><span>Đăng xuất</span></div>
        </aside>

        <main className="main-content">
          {(() => {
            switch (activeTab) {
              case 'overview':
                return (
                  <>
                    <div style={{ marginBottom: '2.5rem' }}>
                      <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Chào buổi chiều, {user?.full_name?.split(' ').pop() || 'bạn'}!</h1>
                      <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.5rem' }}>Hệ thống đang sẵn sàng cho các lượt truyền tin tiếp theo.</p>
                    </div>

                    <section className="section-container">
                      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('devices')}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ width: '45px', height: '45px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={24} color="#10b981" /></div>
                            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>● Trực tuyến</span>
                          </div>
                          <p style={{ color: '#94a3b8', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>Cụm loa Online</p>
                          <div className="stat-value">{stats?.devices?.online || 0} / {stats?.devices?.total || 0}</div>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Thiết bị đang hoạt động</p>
                        </div>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('media')}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ width: '45px', height: '45px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HardDrive size={24} color="#6366f1" /></div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{stats ? formatBytes(stats.media.totalSize) : '--'}</span>
                          </div>
                          <p style={{ color: '#94a3b8', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>Kho bản tin</p>
                          <div className="stat-value">{stats?.media?.total || 0}</div>
                          <div style={{ width: '100%', height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '0.8rem' }}><div style={{ width: '35%', height: '100%', background: '#6366f1', borderRadius: '10px' }} /></div>
                        </div>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('users')}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ width: '45px', height: '45px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={24} color="#f59e0b" /></div>
                            {stats?.users?.pending ? <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 700 }}>{stats.users.pending} Chờ duyệt</span> : null}
                          </div>
                          <p style={{ color: '#94a3b8', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>Nhân sự hệ thống</p>
                          <div className="stat-value">{stats?.users?.total || 0}</div>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Tổng quản trị viên & Vận hành</p>
                        </div>
                        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('schedule')}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ width: '45px', height: '45px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={24} color="#ec4899" /></div>
                          </div>
                          <p style={{ color: '#94a3b8', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 500 }}>Đề xuất Lịch phát</p>
                          <div className="stat-value">{stats?.proposals || 0}</div>
                          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Cần AI xử lý & Phê duyệt</p>
                        </div>
                      </div>
                    </section>

                    <section className="section-container">
                      <div className="action-card" style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                        <div className="mic-pulse"><Mic size={30} color="white" /></div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Phát thanh Trực tiếp</h3>
                          <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '4px' }}>Nhấn nút bên phải để kích hoạt Microphone thông báo khẩn ngay lập tức.</p>
                        </div>
                        <button className="btn-primary" style={{ padding: '12px 28px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' }}>Kích HOẠT MIC</button>
                      </div>
                    </section>

                    <section className="section-container">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Lịch sử phát gần đây</h2>
                        <button onClick={() => setActiveTab('schedule')} style={{ color: '#6366f1', background: 'none', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Xem tất cả</button>
                      </div>
                      <div className="glass-card" style={{ overflow: 'hidden' }}>
                        {!stats?.history?.length ? (
                          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Chưa có dữ liệu phát sóng.</div>
                        ) : (
                          stats.history.map((record: any) => (
                            <div key={record.id} style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Radio size={20} color="#6366f1" /></div>
                              <div style={{ flex: 1 }}>
                                <p style={{ margin: 0, fontWeight: 600 }}>{record.content_title}</p>
                                <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>Kênh: {record.channel_name} • {record.start_time ? new Date(record.start_time).toLocaleString() : '--'}</p>
                              </div>
                              <div style={{ textAlign: 'right' }}><span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px' }}>Đã hoàn thành</span></div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </>
                );
              case 'schedule': return <ScheduleManagement />;
              case 'media': return <MediaLibrary />;
              case 'devices': return <DeviceManagement />;
              case 'users': return <UserManagement />;
              case 'settings': return <SystemSettings />;
              default: return null;
            }
          })()}

          <footer className="dashboard-footer">
            <p style={{ margin: 0 }}>© 2024 OpenClaw System • Phiên bản 2.1.0 High-Performance</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#475569' }}>Hệ thống quản lý phát thanh nội bộ thế hệ mới</p>
          </footer>
        </main>
      </div>
    </div>
  )
}
