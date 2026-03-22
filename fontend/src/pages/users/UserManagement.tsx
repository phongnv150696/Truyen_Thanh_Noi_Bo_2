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
  ChevronRight,
  ShieldCheck,
  Lock,
  Mail,
  AlertTriangle,
  MoreVertical
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000`;

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

interface Unit {
  id: number;
  name: string;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'pending'>('list');
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  // CRUD States
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    rank: 'Cán bộ',
    email: '',
    role_id: '5',
    unit_id: ''
  });

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = getHeaders();
      const [usersRes, regRes, unitsRes, rolesRes] = await Promise.all([
        fetch(`${API_URL}/users`, { headers }),
        fetch(`${API_URL}/users/registrations`, { headers }),
        fetch(`${API_URL}/users/units`, { headers }),
        fetch(`${API_URL}/users/roles`, { headers })
      ]);
      
      if (usersRes.status === 401 || usersRes.status === 403) {
        throw new Error('Bạn không có quyền truy cập dữ liệu này hoặc phiên làm việc đã hết hạn.');
      }

      const usersData = await usersRes.json();
      const regData = await regRes.json();
      const unitsData = await unitsRes.json();
      const rolesData = await rolesRes.json();
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
      
      if (!Array.isArray(usersData) && usersData.error) {
        setError(usersData.error);
      }
    } catch (err: any) {
      console.error('Error fetching staff data:', err);
      setError(err.message || 'Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.');
      setUsers([]);
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when searching or switching views
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, view]);

  // Handle outside click for action menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-container')) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleApprove = async (id: number, roleId: number = 5) => {
    try {
      const response = await fetch(`${API_URL}/users/registrations/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
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
      const response = await fetch(`${API_URL}/users/registrations/${id}/reject`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi hệ thống?')) return;
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (response.ok) {
        fetchData();
        setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} nhân sự đã chọn?`)) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/users/bulk-delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ ids: selectedIds })
      });
      
      if (response.ok) {
        fetchData();
        setSelectedIds([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Xóa hàng loạt thất bại.');
      }
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      setError('Lỗi kết nối khi xóa hàng loạt.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedData.map(item => item.id));
    }
  };

  const toggleItemSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const url = showModal === 'edit' 
      ? `${API_URL}/users/${selectedUser?.id}` 
      : `${API_URL}/users`;
    
    const method = showModal === 'edit' ? 'PATCH' : 'POST';

    try {
      const payload = {
        ...formData,
        unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
        role_id: formData.role_id ? parseInt(formData.role_id) : null,
      };

      // In edit mode, only send password if it's not empty
      if (showModal === 'edit' && !formData.password) {
        delete (payload as any).password;
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchData();
        setShowModal(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Lối hệ thống (${response.status}).`);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(`Lỗi kết nối đến máy chủ: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      username: '',
      password: '',
      full_name: '',
      rank: 'Cán bộ',
      email: '',
      role_id: '5',
      unit_id: units[0]?.id?.toString() || ''
    });
    setError(null);
    setShowModal('add');
  };

  const openEditModal = (user: StaffUser) => {
    setSelectedUser(user);
    // Find unit and role ids from names? No, backend should return IDs. 
    // Looking at StaffUser, it lacks IDs for unit and role.
    // I should ideally update StaffUser interface and backend GET route.
    // For now, I'll assume I'll update backend or find by name.
    
    setFormData({
      username: user.username,
      password: '', // Don't show password hash
      full_name: user.full_name,
      rank: user.rank,
      email: user.email,
      role_id: roles.find(r => r.name === user.role_name)?.id?.toString() || '5',
      unit_id: units.find(u => u.name === user.unit_name)?.id?.toString() || ''
    });
    setError(null);
    setShowModal('edit');
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.unit_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatSafeDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--/--/----';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('vi-VN');
  };

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
    setSelectedIds([]);
  };

  const setViewAndResetPage = (newView: 'list' | 'pending') => {
    setView(newView);
    setCurrentPage(1);
    setSearchTerm('');
    setSelectedIds([]);
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
            onClick={openAddModal}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            <UserPlus size={18} />
            <span>Thêm nhân sự</span>
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

      {selectedIds.length > 0 && (
        <div className="animate-fade-in" style={{ 
          marginBottom: '1.5rem', 
          padding: '1rem 1.5rem', 
          background: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.2)', 
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171', fontWeight: 600 }}>
            <Trash2 size={20} />
            <span>Đã chọn {selectedIds.length} nhân sự</span>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={() => setSelectedIds([])}
              className="btn-secondary" 
              style={{ padding: '6px 16px', fontSize: '0.9rem' }}
            >
              Hủy
            </button>
            <button 
              onClick={handleBulkDelete}
              className="btn-primary" 
              style={{ background: '#ef4444', padding: '6px 16px', fontSize: '0.9rem', border: 'none' }}
            >
              Xóa tất cả đã chọn
            </button>
          </div>
        </div>
      )}

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
            fontSize: '0.75rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(255,255,255,0.03)'
          }}>
            <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <input 
                type="checkbox" 
                checked={paginatedData.length > 0 && selectedIds.length === paginatedData.length}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </div>
            <span style={{ width: '60px' }}>ID</span>
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
          ) : error ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <AlertTriangle size={48} color="#ef4444" style={{ opacity: 0.5, marginBottom: '1rem' }} />
              <p style={{ color: '#ef4444', fontWeight: 600 }}>{error}</p>
              <button onClick={fetchData} className="btn-secondary" style={{ marginTop: '1rem' }}>Thử lại</button>
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
                  transition: 'all 0.2s ease',
                  background: selectedIds.includes(item.id) ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                }}>
                  <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleItemSelect(item.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </div>
                  <div style={{ width: '60px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                    #{item.id}
                  </div>
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
                    {formatSafeDate(item.created_at)}
                  </div>

                  <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    {view === 'list' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="btn-icon-hover" 
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '8px', cursor: 'pointer', borderRadius: '8px' }}
                        >
                          <Trash2 size={18} />
                        </button>
                        
                        <div className="action-menu-container" style={{ position: 'relative' }}>
                          <button 
                            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                            className="btn-icon-hover" 
                            style={{ 
                              background: menuOpenId === item.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', 
                              border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer', borderRadius: '8px' 
                            }}
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {menuOpenId === item.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              zIndex: 100,
                              minWidth: '150px',
                              background: '#1e293b',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              padding: '6px',
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                              marginTop: '8px'
                            }}>
                              <button
                                style={{ 
                                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', 
                                  display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8', 
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                                onClick={() => { openEditModal(item); setMenuOpenId(null); }}
                              >
                                <Edit3 size={16} /> Chỉnh sửa
                              </button>
                              <button
                                style={{ 
                                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', 
                                  display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', 
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                                onClick={() => { setMenuOpenId(null); }}
                              >
                                <Lock size={16} /> Đổi mật khẩu
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <select 
                          id={`role-select-${item.id}`}
                          defaultValue="5"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            outline: 'none'
                          }}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.id} style={{ background: '#1e293b' }}>{r.name}</option>
                          ))}
                        </select>
                        <button 
                          onClick={() => {
                            const select = document.getElementById(`role-select-${item.id}`) as HTMLSelectElement;
                            handleApprove(item.id, parseInt(select.value));
                          }}
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
                      </div>
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {showModal === 'add' ? 'Thêm nhân sự mới' : 'Cập nhật thông tin'}
              </h2>
              <button 
                onClick={() => setShowModal(null)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.1)', 
                border: '1px solid rgba(239, 68, 68, 0.2)', 
                color: '#f87171', 
                padding: '12px 16px', 
                borderRadius: '12px', 
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="premium-form-group">
                  <label className="premium-label"><User size={14} /> Họ và tên</label>
                  <input
                    type="text"
                    required
                    className="premium-input"
                    placeholder="VD: Nguyễn Văn A"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label"><ShieldCheck size={14} /> Cấp bậc</label>
                  <input
                    type="text"
                    required
                    className="premium-input"
                    placeholder="VD: Đại úy"
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="premium-form-group">
                  <label className="premium-label"><Mail size={14} /> Email</label>
                  <input
                    type="email"
                    required
                    className="premium-input"
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label"><User size={14} /> Tên đăng nhập</label>
                  <input
                    type="text"
                    required
                    className="premium-input"
                    placeholder="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>

              <div className="premium-form-group">
                <label className="premium-label"><Lock size={14} /> {showModal === 'edit' ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
                <input
                  type="password"
                  required={showModal === 'add'}
                  className="premium-input"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="premium-form-group">
                  <label className="premium-label"><MapPin size={14} /> Đơn vị</label>
                  <select
                    className="premium-select"
                    required
                    value={formData.unit_id}
                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                  >
                    <option value="">Chọn đơn vị...</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>{unit.name}</option>
                    ))}
                  </select>
                </div>
                <div className="premium-form-group">
                  <label className="premium-label"><Shield size={14} /> Vai trò</label>
                  <select
                    className="premium-select"
                    required
                    value={formData.role_id}
                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id}>{role.description || role.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(null)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  {submitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                  <span>{showModal === 'add' ? 'Xác nhận thêm' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
