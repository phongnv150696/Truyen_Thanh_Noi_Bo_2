import { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Clock, 
  FileText,
  Plus,
  RefreshCcw,
  Trash2,
  LogIn,
  AlertTriangle,
  History,
  Bell,
  User as UserIcon
} from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';

const API_URL = `http://${window.location.hostname}:3000`;

interface AuditLog {
  id: number;
  user_id: number;
  full_name?: string;
  username?: string;
  action: string;
  target_type?: string; 
  target_table?: string;
  target_id: number;
  details: any;
  created_at: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  sender_name?: string;
  priority?: string;
  created_at: string;
}

export default function AuditLogs({ initialTab = 'audit' }: { initialTab?: 'audit' | 'notifications' }) {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'notifications'>(initialTab);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const itemsPerPage = 7;

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/settings/audit-logs?page=${currentPage}&limit=${itemsPerPage}&action=${actionFilter}`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const json = await res.json();
        setLogs(Array.isArray(json.data) ? json.data : []);
        setTotalItems(json.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/notifications`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        const notifs = Array.isArray(data) ? data : [];
        setNotifications(notifs);
        setTotalItems(notifs.length);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'audit') {
      fetchLogs();
    } else {
      fetchNotifications();
    }
  }, [currentPage, actionFilter, activeSubTab]);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatSafeDateTime = (dateStr: string) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '--' : d.toLocaleString('vi-VN');
  };

  const parseDetails = (details: any) => {
    try {
      if (!details) return '--';
      const obj = typeof details === 'string' ? JSON.parse(details) : details;
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(details);
    }
  };

  const getActionColor = (actionStr: string) => {
    const action = actionStr.toLowerCase();
    if (action.includes('create') || action.includes('add')) return '#10b981';
    if (action.includes('delete') || action.includes('remove') || action.includes('emergency')) return '#ef4444';
    if (action.includes('update') || action.includes('edit')) return '#f59e0b';
    return '#6366f1';
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Nhật ký & Thông báo</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Theo dõi các thay đổi và thông báo hệ thống.</p>
        </div>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <button 
            onClick={() => { setActiveSubTab('audit'); setCurrentPage(1); }}
            style={{ 
              padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              background: activeSubTab === 'audit' ? '#6366f1' : 'transparent',
              color: activeSubTab === 'audit' ? 'white' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={16} /> Nhật ký hệ thống</div>
          </button>
          <button 
            onClick={() => { setActiveSubTab('notifications'); setCurrentPage(1); }}
            style={{ 
              padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
              background: activeSubTab === 'notifications' ? '#6366f1' : 'transparent',
              color: activeSubTab === 'notifications' ? 'white' : '#94a3b8',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={16} /> Thông báo người dùng</div>
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'visible' }}>
        {activeSubTab === 'audit' ? (
          <>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '280px' }}>
                <CustomSelect
                  value={actionFilter}
                  onChange={(val) => {
                    setActionFilter(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: '', label: 'Tất cả tác vụ', icon: <History size={16} /> },
                    { value: 'CREATE', label: 'Thêm mới (CREATE)', icon: <Plus size={16} color="#10b981" /> },
                    { value: 'UPDATE', label: 'Cập nhật (UPDATE)', icon: <RefreshCcw size={16} color="#6366f1" /> },
                    { value: 'DELETE', label: 'Xóa (DELETE)', icon: <Trash2 size={16} color="#ef4444" /> },
                    { value: 'LOGIN', label: 'Đăng nhập (LOGIN)', icon: <LogIn size={16} color="#a855f7" /> },
                    { value: 'ACTIVATE_EMERGENCY', label: 'Báo động (EMERGENCY)', icon: <AlertTriangle size={16} color="#f59e0b" /> },
                  ]}
                  placeholder="Lọc theo tác vụ..."
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TÁC VỤ</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>NGƯỜI THỰC HIỆN</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>ĐỐI TƯỢNG</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>THỜI GIAN</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Activity size={24} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>Đang tải dữ liệu...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy nhật ký nào phù hợp.</td></tr>
                  ) : (
                    logs.map(item => {
                      const actionColor = getActionColor(item.action);
                      return (
                        <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ padding: '6px 10px', borderRadius: '6px', background: `${actionColor}22`, color: actionColor, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                                {item.action}
                              </div>
                              {item.details && Object.keys(item.details).length > 0 && (
                                 <div title={parseDetails(item.details)} style={{ color: '#64748b', cursor: 'help' }}>
                                   <FileText size={16} />
                                 </div>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 700, fontSize: '0.8rem' }}>
                                {item.full_name?.substring(0, 1) || item.username?.substring(0, 1) || 'A'}
                              </div>
                              <div>
                                <span style={{ color: '#f8fafc', fontWeight: 500 }}>{item.full_name || item.username || 'System'}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem', color: '#cbd5e1', fontSize: '0.9rem' }}>
                            {item.target_table || item.target_type || '--'} {item.target_id ? `(#${item.target_id})` : ''}
                          </td>
                          <td style={{ padding: '1.2rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                               <Clock size={14} />
                               {formatSafeDateTime(item.created_at)}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>NỘI DUNG THÔNG BÁO</th>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>GỬI BỞI</th>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TÌNH TRẠNG</th>
                  <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>THỜI GIAN</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                      <Activity size={24} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                      <p>Đang tải thông báo...</p>
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không có thông báo nào.</td></tr>
                ) : (
                  notifications.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(item => (
                    <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ 
                            width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px',
                            background: item.priority === 'high' ? '#ef4444' : '#6366f1',
                            opacity: item.is_read ? 0.3 : 1
                          }} />
                          <div>
                            <div style={{ fontWeight: 700, color: item.is_read ? '#94a3b8' : '#f8fafc', fontSize: '0.95rem' }}>{item.title}</div>
                            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>{item.message}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                          <UserIcon size={14} color="#6366f1" />
                          {item.sender_name || 'Hệ thống'}
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem' }}>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px', borderRadius: '20px',
                          background: item.is_read ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.1)',
                          color: item.is_read ? '#64748b' : '#6366f1'
                        }}>
                          {item.is_read ? 'Đã xem' : 'Mới'}
                        </span>
                      </td>
                      <td style={{ padding: '1.2rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                        {formatSafeDateTime(item.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '2rem',
          gap: '12px'
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: currentPage === 1 ? '#475569' : '#cbd5e1',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: currentPage === page ? '#6366f1' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: currentPage === totalPages ? '#475569' : '#cbd5e1',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
