import { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  Shield,
  MapPin,
  Check,
  X,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface StaffUser {
  id: number;
  username: string;
  full_name: string;
  rank: string;
  email: string;
  role_name: string;
  unit_name: string;
  created_at: string;
}

interface Registration {
  id: number;
  username: string;
  full_name: string;
  rank: string;
  email: string;
  unit_id: number;
  unit_name: string;
  status: string;
  created_at: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'pending'>('list');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, regRes] = await Promise.all([
        fetch('http://localhost:3000/users'),
        fetch('http://localhost:3000/users/registrations')
      ]);
      
      const usersData = await usersRes.json();
      const regData = await regRes.json();
      
      setUsers(usersData);
      setRegistrations(regData);
    } catch (error) {
      console.error('Error fetching staff data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (id: number, roleId: number = 5) => {
    try {
      const response = await fetch(`http://localhost:3000/users/registrations/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: roleId })
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn từ chối yêu cầu đăng ký này?')) return;
    try {
      const response = await fetch(`http://localhost:3000/users/registrations/${id}/reject`, {
        method: 'POST'
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi hệ thống?')) return;
    try {
      const response = await fetch(`http://localhost:3000/users/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.unit_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRegistrations = registrations.filter(r => 
    r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.unit_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const activeData = view === 'list' ? filteredUsers : filteredRegistrations;
  const totalPages = Math.ceil(activeData.length / itemsPerPage);
  const paginatedData = activeData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const setViewAndResetPage = (newView: 'list' | 'pending') => {
    setView(newView);
    setCurrentPage(1);
    setSearchTerm('');
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Quản lý Nhân sự</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Hệ thống quản lý quân số, cấp bậc và phân quyền truy cập.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={() => setViewAndResetPage('list')}
            className={view === 'list' ? 'btn-primary' : 'btn-secondary'}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px' }}
          >
            <Users size={18} />
            <span>Danh sách</span>
          </button>
          <button 
            onClick={() => setViewAndResetPage('pending')}
            className={view === 'pending' ? 'btn-primary' : 'btn-secondary'}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 20px', 
              borderRadius: '10px',
              position: 'relative'
            }}
          >
            <UserCheck size={18} />
            <span>Chờ phê duyệt</span>
            {registrations.length > 0 && (
              <span style={{ 
                position: 'absolute', 
                top: '-5px', 
                right: '-5px', 
                background: '#ef4444', 
                color: 'white', 
                fontSize: '0.7rem', 
                padding: '2px 6px', 
                borderRadius: '10px',
                fontWeight: 700,
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)'
              }}>
                {registrations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#6366f1" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>Tổng quân số</p>
          <div className="stat-value">{users.length}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="#10b981" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>Quản trị viên</p>
          <div className="stat-value">{users.filter(u => u.role_name === 'admin').length}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserPlus size={24} color="#f97316" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>Yêu cầu mới</p>
          <div className="stat-value" style={{ color: registrations.length > 0 ? '#f97316' : 'white' }}>{registrations.length}</div>
        </div>
      </section>

      {/* Toolbar */}
      <section className="section-container animate-fade-in" style={{ marginBottom: '1.5rem', width: '100%' }}>
        <div className="glass-card" style={{
          padding: '0 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          height: '50px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
            <Search size={18} style={{ marginLeft: '16px', color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              placeholder={view === 'list' ? "Tìm kiếm nhân sự theo tên, số hiệu hoặc đơn vị..." : "Tìm kiếm yêu cầu phê duyệt..."}
              value={searchTerm}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '0 16px',
                color: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                height: '100%'
              }}
            />
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

          <button 
            onClick={fetchData}
            style={{
              padding: '0 20px',
              height: '34px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontWeight: 600,
              whiteSpace: 'nowrap'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </section>

      <section className="section-container animate-fade-in" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            {view === 'list' ? 'Danh sách nhân sự' : 'Yêu cầu chờ phê duyệt'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{activeData.length} mục</span>
        </div>

        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            padding: '0.6rem 1.2rem',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            color: '#475569',
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(255,255,255,0.03)'
          }}>
            <span style={{ flex: 2 }}>{view === 'list' ? 'Họ tên & Cấp bậc' : 'Thông tin đăng ký'}</span>
            <span style={{ flex: 1.5 }}>Đơn vị</span>
            <span style={{ flex: 1 }}>{view === 'list' ? 'Chức vụ (Vai trò)' : 'Trạng thái'}</span>
            <span style={{ flex: 1 }}>{view === 'list' ? 'Ngày tham gia' : 'Ngày yêu cầu'}</span>
            <span style={{ width: '120px', textAlign: 'right' }}>Thao tác</span>
          </div>

          {loading && activeData.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : activeData.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              {view === 'list' ? <Users size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} /> : <UserCheck size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />}
              <p>{view === 'list' ? 'Không tìm thấy nhân sự phù hợp.' : 'Hiện tại không có yêu cầu nào.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(paginatedData as any[]).map(item => (
                <div key={item.id} className="table-row-hover" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.8rem 1.2rem',
                  borderBottom: '1px solid rgba(255,255,255,0.02)',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      background: view === 'list' ? 'rgba(255,255,255,0.03)' : 'rgba(249, 115, 22, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      {view === 'list' ? <User size={20} color="#94a3b8" /> : <UserPlus size={20} color="#f97316" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9' }}>{item.full_name}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>{item.rank} • @{item.username}</p>
                    </div>
                  </div>
                  
                  <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                    <MapPin size={14} color="#64748b" />
                    {item.unit_name || 'Chưa xác định'}
                  </div>

                  <div style={{ flex: 1 }}>
                    {view === 'list' ? (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        background: item.role_name === 'admin' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.05)',
                        color: item.role_name === 'admin' ? '#818cf8' : '#94a3b8',
                        fontWeight: 700,
                        textTransform: 'uppercase'
                      }}>
                        {item.role_name}
                      </span>
                    ) : (
                      <span style={{ color: '#f97316', fontSize: '0.8rem', fontWeight: 600 }}>Chờ duyệt</span>
                    )}
                  </div>

                  <div style={{ flex: 1, color: '#64748b', fontSize: '0.85rem' }}>
                    {new Date(item.created_at).toLocaleDateString('vi-VN')}
                  </div>

                  <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {view === 'list' ? (
                      <>
                        <button className="icon-btn-hover" style={{ background: 'none', border: 'none', color: '#64748b', padding: '8px', cursor: 'pointer', borderRadius: '8px' }}>
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="icon-btn-hover" 
                          style={{ background: 'none', border: 'none', color: '#ef4444', padding: '8px', cursor: 'pointer', borderRadius: '8px' }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleApprove(item.id)}
                          title="Phê duyệt"
                          className="icon-btn-hover"
                          style={{ 
                            background: 'rgba(16, 185, 129, 0.1)', 
                            border: 'none', 
                            color: '#10b981', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Check size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(item.id)}
                          title="Từ chối"
                          className="icon-btn-hover"
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            border: 'none', 
                            color: '#ef4444', 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
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
              onMouseOver={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
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
                  onMouseOver={(e) => {
                    if (currentPage !== page) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentPage !== page) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
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
              onMouseOver={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
