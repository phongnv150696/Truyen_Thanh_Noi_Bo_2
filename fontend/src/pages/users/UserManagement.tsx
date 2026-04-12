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
  MoreVertical,
  Briefcase,
  Eye,
  Phone,
  CreditCard,
  Home
} from 'lucide-react';
import { useNotification } from '../../components/NotificationProvider';

import { API_URL } from '../../config'

const RANK_OPTIONS = [
  'Thiếu úy', 'Trung úy', 'Thượng úy', 'Đại úy',
  'Thiếu tá', 'Trung tá', 'Thượng tá', 'Đại tá'
];

interface StaffUser {
  id: number;
  username: string;
  full_name: string;
  rank: string;
  position: string;
  email: string;
  phone: string;
  identity_card: string;
  home_address: string;
  unit_address: string;
  role_name: string;
  unit_name: string;
  unit_id: number;
  role_id: number;
  created_at: string;
}

interface Registration {
  id: number;
  username: string;
  full_name: string;
  rank: string;
  position: string;
  email: string;
  phone: string;
  identity_card: string;
  home_address: string;
  unit_address: string;
  unit_id: number;
  unit_name: string;
  status: string;
  created_at: string;
}

interface Unit {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
}

interface Role {
  id: number;
  name: string;
  description: string;
}

export default function UserManagement({ user, onLogout }: { user: any, onLogout?: () => void }) {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const { showNotification, confirm } = useNotification();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'list' | 'pending'>('list');
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  // CRUD States
  const [showModal, setShowModal] = useState<'add' | 'edit' | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUserForView, setSelectedUserForView] = useState<any>(null);

  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUserUnitName, setCurrentUserUnitName] = useState<string>(user?.unit_name || '');
  
  // Hierarchical view states
  const [currentViewUnitId, setCurrentViewUnitId] = useState<number | null>(null);
  const [navigationPath, setNavigationPath] = useState<{ id: number, name: string }[]>([]);
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    rank: '',
    position: '',
    email: '',
    phone: '',
    identity_card: '',
    home_address: '',
    unit_address: '',
    role_id: '5',
    unit_id: ''
  });

  // 6-Level Hierarchy State
  const [selectedLevels, setSelectedLevels] = useState<{ [key: number]: string | number }>({
    1: '', 2: '', 3: '', 4: '', 5: '', 6: ''
  });

  const getUnitsByLevel = (level: number, parentId?: string | number) => {
    return units.filter(u => u.level === level && (!parentId || u.parent_id === Number(parentId)));
  };

  const handleLevelChange = (level: number, val: string) => {
    const newLevels = { ...selectedLevels, [level]: val };
    // Reset lower levels
    for (let i = level + 1; i <= 6; i++) newLevels[i] = '';
    setSelectedLevels(newLevels);
    
    // Update main unit_id (use the lowest selected non-empty level)
    let finalUnit = val;
    if (!val) {
      for (let i = level - 1; i >= 1; i--) {
        if (newLevels[i]) {
          finalUnit = String(newLevels[i]);
          break;
        }
      }
    }
    setFormData(prev => ({ ...prev, unit_id: finalUnit }));
  };

  const generateUsername = (name: string) => {
    if (!name) return '';
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '.')
      .trim();
    return slug;
  };

  const handleFullNameChange = (name: string) => {
    const username = generateUsername(name);
    setFormData(prev => ({ 
      ...prev, 
      full_name: name,
      username: showModal === 'add' ? username : prev.username 
    }));
  };

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
      
      if (usersRes.status === 401) {
        onLogout?.();
        return;
      }
      if (usersRes.status === 403) {
        throw new Error('Bạn không có quyền truy cập dữ liệu này.');
      }

      const usersData = await usersRes.json();
      const regData = await regRes.json();
      const unitsData = await unitsRes.json();
      const rolesData = await rolesRes.json();
      
      setUsers(Array.isArray(usersData) ? usersData : []);
      setRegistrations(Array.isArray(regData) ? regData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setRoles(Array.isArray(rolesRes.ok ? rolesData : []) ? rolesData : []);
      
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
    
    // Resilience: Fetch unit name if missing in props
    if (!user?.unit_name) {
      const getUnitInfo = async () => {
        try {
          const res = await fetch(`${API_URL}/auth/verify`, { headers: getHeaders() });
          if (res.ok) {
            const data = await res.json();
            if (data.user?.unit_name) setCurrentUserUnitName(data.user.unit_name);
          }
        } catch (e) { console.error('Failed to fetch user unit info', e); }
      };
      getUnitInfo();
    }
  }, [user]);

  // Reactive Hierarchy Resolution: Triggers once units are loaded
  useEffect(() => {
    if (user?.unit_id && units.length > 0) {
      const fillLevels = () => {
        const levels: { [key: number]: string | number } = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
        let currentUnitId: number | null = user.unit_id;
        
        while (currentUnitId) {
          const unit = units.find(u => Number(u.id) === Number(currentUnitId));
          if (unit) {
            levels[unit.level] = unit.id;
            currentUnitId = unit.parent_id;
          } else break;
        }
        setSelectedLevels(prev => ({ ...prev, ...levels }));
        setFormData(prev => ({ ...prev, unit_id: String(user.unit_id) }));
      };
      fillLevels();
    }
  }, [user?.unit_id, units]);

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

  const handleApprove = async (id: number, roleId: number = 5, unitId?: string | number, parentUnitId?: string | number) => {
    try {
      const response = await fetch(`${API_URL}/users/registrations/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ role_id: roleId, unit_id: unitId, parent_unit_id: parentUnitId })
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (id: number) => {
    if (!(await confirm('Bạn có chắc chắn muốn từ chối yêu cầu đăng ký này?'))) return;
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
    if (!(await confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi hệ thống?'))) return;
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
    if (!(await confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} nhân sự đã chọn?`))) return;
    
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
      // Resolve Parent Context for typed unit names
      let parentUnitId = null;
      for (let i = 6; i >= 1; i--) {
        if (selectedLevels[i]) {
          parentUnitId = selectedLevels[i - 1] || null;
          break;
        }
      }

      const payload = {
        ...formData,
        unit_id: formData.unit_id || null,
        parent_unit_id: parentUnitId,
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
      rank: '',
      position: '',
      email: '',
      phone: '',
      identity_card: '',
      home_address: '',
      unit_address: '',
      role_id: '5',
      unit_id: currentUserUnitName || user.unit_name || ''
    });

    // Reset levels to user's hierarchy
    const levels: { [key: number]: string | number } = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
    let currentId = user.unit_id;
    while (currentId) {
      const u = units.find(unit => unit.id === currentId);
      if (u) { levels[u.level] = u.id; currentId = u.parent_id; }
      else break;
    }
    setSelectedLevels(levels);

    setError(null);
    setShowModal('add');
  };

  const openEditModal = (targetUser: StaffUser) => {
    setSelectedUser(targetUser);
    setFormData({
      username: targetUser.username,
      password: '',
      full_name: targetUser.full_name,
      rank: targetUser.rank,
      position: targetUser.position,
      email: targetUser.email,
      phone: targetUser.phone || '',
      identity_card: targetUser.identity_card || '',
      home_address: targetUser.home_address || '',
      unit_address: targetUser.unit_address || '',
      role_id: roles.find(r => r.name === targetUser.role_name)?.id?.toString() || '5',
      unit_id: String(targetUser.unit_id || '')
    });

    // Sync levels for edited user
    const levels: { [key: number]: string | number } = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
    let currentId: number | null = targetUser.unit_id;
    while (currentId) {
      const u = units.find(unit => unit.id === currentId);
      if (u) { 
        levels[u.level] = u.id; 
        currentId = u.parent_id; 
      }
      else break;
    }
    setSelectedLevels(levels);

    setError(null);
    setShowModal('edit');
  };

  const getRoleDisplayName = (role_name: string) => {
    if (!role_name) return 'Thành viên';
    const mapping: Record<string, string> = {
      'admin': 'Admin',
      'editor': 'Quản trị viên',
      'quản trị viên': 'Quản trị viên',
      'commander': 'Quản lý',
      'quản lý': 'Quản lý',
      'listener': 'Thành viên',
      'user': 'Thành viên',
      'thành viên': 'Thành viên'
    };
    return mapping[role_name.toLowerCase()] || role_name;
  };

  const hasSubPersonnel = (unit_id: number | string) => {
    return units.some(u => u.parent_id == unit_id);
  };

  const handleDrillDown = (unitId: number | string, unitName: string) => {
    // If unit is already the current view, ignore (prevents loops like seen in breadcrumbs)
    if (String(unitId) === String(currentViewUnitId)) return;

    setCurrentViewUnitId(unitId as number);
    setNavigationPath(prev => [...prev, { id: Number(unitId), name: unitName }]);
    setCurrentPage(1);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentViewUnitId(null);
      setNavigationPath([]);
    } else {
      const newPath = navigationPath.slice(0, index + 1);
      setCurrentViewUnitId(newPath[newPath.length - 1].id);
      setNavigationPath(newPath);
    }
    setCurrentPage(1);
  };

  const filteredUsers = (() => {
    const list = users.filter(u => 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rank?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.position?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (view === 'pending') return list;

    // IF AT ROOT: Show only Company/Platoon managers, or those whose position mentions "Đại đội"
    if (currentViewUnitId === null) {
      // At the root, ONLY show Battalion-level managers (Level 4)
      const battalionManagers = list.filter(u => {
        const roleName = u.role_name?.toLowerCase();
        if (!['admin', 'quản trị viên', 'editor', 'quản lý', 'commander'].includes(roleName)) return false;

        const unit = units.find(un => String(un.id) === String(u.unit_id));
        const level = unit ? unit.level : 0;
        const pos = u.position?.toLowerCase() || '';
        // Strict Level 4 check
        return level === 4 || pos.includes('tiểu đoàn');
      });

      // Show all managers if no specific Battalion managers are found (prevent empty state)
      const allManagers = list.filter(u => {
        const roleName = u.role_name?.toLowerCase();
        return ['admin', 'quản trị viên', 'editor', 'quản lý', 'commander'].includes(roleName);
      });
      return battalionManagers.length > 0 ? battalionManagers : allManagers;
    }

    // IF DRILLED DOWN INTO A UNIT:
    const unit = units.find(u => String(u.id) === String(currentViewUnitId));
    const subUnits = units.filter(u => String(u.parent_id) === String(currentViewUnitId));
    const subUnitIds = subUnits.map(u => u.id);
    const isLeaf = subUnits.length === 0 || (unit && unit.level >= 5);

    if (isLeaf) {
      // At lower levels (Company and below), show EVERYONE in this unit
      return list.filter(u => String(u.unit_id) === String(currentViewUnitId));
    } else {
      // At higher levels (Battalion and up), show only MANAGERS to keep the list merged/clean
      // Show managers directly in the unit AND managers in its direct sub-units
      return list.filter(u => 
        (subUnitIds.some(sid => String(sid) === String(u.unit_id)) || String(u.unit_id) === String(currentViewUnitId)) &&
        ['admin', 'quản trị viên', 'editor', 'quản lý', 'commander'].includes(u.role_name?.toLowerCase())
      );
    }
  })();

  const filteredRegistrations = registrations.filter(r => 
    r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.unit_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.rank?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.position?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAvailableRoles = () => {
    const isAdmin = user.role_name?.toLowerCase() === 'admin' || user.id === 1;
    const isQuânTriVien = user.role_name?.toLowerCase() === 'editor' || user.role_name?.toLowerCase() === 'quản trị viên';
    const isQuanLy = user.role_name?.toLowerCase() === 'commander' || user.role_name?.toLowerCase() === 'quản lý';

    let available = roles;

    if (isAdmin) {
      // Global Admin can assign everything except other 'Admin' (only 1 exists)
      available = roles.filter(r => r.name?.toLowerCase() !== 'admin');
    } else if (isQuânTriVien) {
      // Quản trị viên can assign Quản lý and Thành viên
      available = roles.filter(r => 
        ['quản lý', 'thành viên', 'listener', 'user'].includes(r.name?.toLowerCase())
      );
    } else if (isQuanLy) {
      // Quản lý can only assign Thành viên
      available = roles.filter(r => 
        ['thành viên', 'listener', 'user'].includes(r.name?.toLowerCase())
      );
    } else {
      return [];
    }

    // Deduplicate by display name to avoid "Thành viên" appearing twice
    const seen = new Set();
    return available.filter(r => {
      const display = getRoleDisplayName(r.name);
      if (seen.has(display)) return false;
      seen.add(display);
      return true;
    });
  };

  const formatSafeDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--/--/----';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('vi-VN');
  };

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

      {/* Breadcrumb Navigation - Moved and Styled */}
      {view === 'list' && (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          marginBottom: '2rem',
          background: 'rgba(255,255,255,0.05)',
          padding: '12px 20px',
          borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          fontSize: '0.9rem'
        }}>
          <button 
            onClick={() => handleBreadcrumbClick(-1)}
            style={{ 
              background: 'none', border: 'none', 
              color: currentViewUnitId === null ? '#818cf8' : '#94a3b8', 
              cursor: 'pointer', 
              fontWeight: currentViewUnitId === null ? 800 : 600,
              display: 'flex', alignItems: 'center', gap: '8px',
              transition: 'all 0.2s ease'
            }}
            className="hover-bright"
          >
            <Home size={18} /> 
            <span style={{ borderBottom: currentViewUnitId === null ? '2px solid #818cf8' : 'none', paddingBottom: '2px' }}>TỔNG CỤC HỆ THỐNG</span>
          </button>
          
          {navigationPath.map((node, i) => (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ChevronRight size={16} color="#475569" strokeWidth={3} />
              <button 
                onClick={() => handleBreadcrumbClick(i)}
                style={{ 
                  background: 'none', border: 'none', 
                  color: i === navigationPath.length - 1 ? '#818cf8' : '#94a3b8', 
                  cursor: 'pointer', 
                  fontWeight: i === navigationPath.length - 1 ? 800 : 600,
                  transition: 'all 0.2s ease',
                  paddingBottom: '2px',
                  borderBottom: i === navigationPath.length - 1 ? '2px solid #818cf8' : 'none'
                }}
                className="hover-bright"
              >
                {node.name.toUpperCase()}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <section className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={24} color="#6366f1" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>Tổng quân số</p>
          <div className="stat-value">{activeData.length}</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ width: '50px', height: '50px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={24} color="#10b981" />
            </div>
          </div>
          <p style={{ color: '#94a3b8', marginTop: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>Quản trị viên</p>
          <div className="stat-value">
            {view === 'list' 
              ? filteredUsers.filter(u => u.role_name?.toLowerCase() === 'admin' || u.role_name?.toLowerCase() === 'quản trị viên').length 
              : 0
            }
          </div>
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
              placeholder={view === 'list' ? "Tìm kiếm nhân sự theo tên, số hiệu, cấp bậc, chức vụ hoặc đơn vị..." : "Tìm kiếm yêu cầu phê duyệt..."}
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

        <div className="glass-card" style={{ padding: '0', overflow: 'visible' }}>
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
            <span style={{ flex: 1.5 }}>Thành viên</span>
            <span style={{ flex: 1 }}>Cấp bậc / Chức vụ</span>
            <span style={{ flex: 1.5 }}>Đơn vị công tác</span>
            <span style={{ flex: 1.2 }}>{view === 'list' ? 'Vai trò' : 'Gán Vai trò'}</span>
            <span style={{ flex: 0.8 }}>{view === 'list' ? 'Ngày tham gia' : 'Ngày yêu cầu'}</span>
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
              {(paginatedData as any[]).map((item, index) => {
                const isNearBottom = index >= paginatedData.length - 2;
                return (
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
                  <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>@{item.username}</p>
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontWeight: 500, color: '#e2e8f0', fontSize: '0.9rem' }}>{item.rank || 'N/A'}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.position || 'N/A'}</span>
                  </div>

                  <div style={{ flex: 1.5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      <MapPin size={14} color="#64748b" />
                      {(units.find(un => String(un.id) === String(item.unit_id))?.level === 4 && item.position?.toLowerCase().includes('đại đội')) 
                         ? 'Đại đội' 
                         : (item.unit_name || 'Chưa xác định')}
                    </div>
                  </div>

                  <div style={{ flex: 1.2 }}>
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
                        {getRoleDisplayName(item.role_name)}
                      </span>
                    ) : (
                      <select 
                        id={`list-role-select-${item.id}`}
                        defaultValue="5"
                        style={{
                          width: '95%',
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '6px',
                          color: '#cbd5e1',
                          fontSize: '0.8rem',
                          padding: '4px 6px',
                          outline: 'none'
                        }}
                      >
                        {getAvailableRoles().map(r => (
                          <option key={r.id} value={r.id} style={{ background: '#1e293b' }}>{getRoleDisplayName(r.name)}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div style={{ flex: 0.8, color: '#64748b', fontSize: '0.8rem' }}>
                    {formatSafeDate(item.created_at)}
                  </div>

                  <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                    <button 
                      onClick={() => { setSelectedUserForView(item); setShowViewModal(true); }}
                      title="Xem chi tiết"
                      className="btn-icon-hover"
                      style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none', color: '#818cf8', padding: '6px', cursor: 'pointer', borderRadius: '6px' }}
                    >
                      <Eye size={16} />
                    </button>

                    {view === 'list' && hasSubPersonnel(item.unit_id) && String(item.unit_id) !== String(currentViewUnitId) && (
                      <button 
                        onClick={() => handleDrillDown(item.unit_id, item.unit_name)}
                        title="Xem nhân sự con"
                        className="btn-icon-hover"
                        style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981', padding: '6px', cursor: 'pointer', borderRadius: '6px' }}
                      >
                        <Users size={16} />
                      </button>
                    )}

                    {view === 'list' ? (
                      <div className="action-menu-container" style={{ position: 'relative', display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="btn-icon-hover" 
                          style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px', cursor: 'pointer', borderRadius: '6px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                        <button 
                          onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                          className="btn-icon-hover" 
                          style={{ 
                            background: menuOpenId === item.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', 
                            border: 'none', color: '#94a3b8', padding: '6px', cursor: 'pointer', borderRadius: '6px' 
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        
                        {menuOpenId === item.id && (
                          <div style={{
                            position: 'absolute',
                            right: 0,
                            top: isNearBottom ? 'auto' : '100%',
                            bottom: isNearBottom ? '100%' : 'auto',
                            zIndex: 100,
                            minWidth: '150px',
                            background: '#1e293b',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            padding: '6px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                            marginTop: isNearBottom ? 0 : '8px',
                            marginBottom: isNearBottom ? '8px' : 0
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
                              <Lock size={16} /> Đợi mật khẩu
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button 
                          onClick={() => {
                            const roleSelect = document.getElementById(`list-role-select-${item.id}`) as HTMLSelectElement;
                            handleApprove(item.id, parseInt(roleSelect?.value || '5'), ""); 
                          }}
                          title="Phê duyệt"
                          className="icon-btn-hover"
                          style={{ 
                            background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981', 
                            width: '30px', height: '30px', borderRadius: '6px', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                          }}
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => handleReject(item.id)}
                          title="Từ chối"
                          className="icon-btn-hover"
                          style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', 
                            width: '30px', height: '30px', borderRadius: '6px', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                          }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
      </section>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(null)}>
          <div className="modal-content animate-scale-in" style={{ 
            maxWidth: '700px', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {showModal === 'add' ? 'Thêm nhân sự mới' : 'Cập nhật thông tin'}
              </h2>
              <button onClick={() => setShowModal(null)} className="btn-icon-hover" style={{ padding: '8px', borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* SECTION 1: MILITARY PROFILE */}
              <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Shield size={18} /> Hồ sơ Quân sự
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="premium-form-group">
                    <label className="premium-label"><User size={14} /> Họ và tên</label>
                    <input 
                      type="text" 
                      required 
                      className="premium-input" 
                      placeholder="VD: Nguyễn Văn A" 
                      value={formData.full_name} 
                      onChange={(e) => handleFullNameChange(e.target.value)} 
                    />
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><ShieldCheck size={14} /> Cấp bậc</label>
                    <select className="premium-select" required value={formData.rank} onChange={(e) => setFormData({ ...formData, rank: e.target.value })}>
                      <option value="">-- Chọn cấp bậc --</option>
                      {RANK_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><Briefcase size={14} /> Chức vụ</label>
                    <input type="text" required className="premium-input" placeholder="VD: Đại đội trưởng" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><Shield size={14} /> Vai trò hệ thống</label>
                    <select
                      className="premium-select"
                      required
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                    >
                      {getAvailableRoles().map(role => (
                        <option key={role.id} value={role.id}>{getRoleDisplayName(role.name)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
                    <MapPin size={16} color="#6366f1" /> ĐƠN VỊ CÔNG TÁC (PHÂN CẤP 6 CẤP)
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {(() => {
                      const userUnit = units.find(u => u.id === user?.unit_id);
                      const userLevel = (userUnit?.level || 1);
                      const isSystemAdmin = user?.role_id === 1 && user?.unit_id === 1;

                      return [
                        { l: 1, n: 'Quân khu' }, { l: 2, n: 'Sư đoàn' },
                        { l: 3, n: 'Trung đoàn' }, { l: 4, n: 'Tiểu đoàn' },
                        { l: 5, n: 'Đại đội' }, { l: 6, n: 'Trung đội' }
                      ].map((levelInfo) => {
                        const currentVal = selectedLevels[levelInfo.l];
                        const existingUnit = units.find(u => u.id === Number(currentVal));
                        const displayVal = existingUnit ? existingUnit.name : String(currentVal || '');
                        const suggestions = getUnitsByLevel(levelInfo.l, selectedLevels[levelInfo.l - 1])
                          .filter(u => u.name.toLowerCase().includes(displayVal.toLowerCase()));

                        // Lock logic: level is locked if it's < user's level (cannot change parent structure)
                        // But allow editing their own level and below
                        const isLocked = !isSystemAdmin && levelInfo.l < userLevel && !!selectedLevels[levelInfo.l];

                        return (
                          <div key={levelInfo.l} className="premium-form-group" style={{ position: 'relative' }}>
                            <label style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>{levelInfo.n}</label>
                            <input 
                              type="text"
                              className="premium-input"
                              style={{ 
                                fontSize: '0.8rem', 
                                padding: '10px 12px',
                                opacity: isLocked ? 0.6 : 1,
                                cursor: isLocked ? 'not-allowed' : 'text',
                                background: isLocked ? 'rgba(255,255,255,0.03)' : undefined
                              }}
                              placeholder={isLocked ? '' : `Gõ để tìm/thêm ${levelInfo.n}...`}
                              value={displayVal}
                              disabled={isLocked || (levelInfo.l > 1 && !selectedLevels[levelInfo.l - 1])}
                              onChange={(e) => !isLocked && handleLevelChange(levelInfo.l, e.target.value)}
                            />
                            {displayVal && !existingUnit && suggestions.length > 0 && !isLocked && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', marginTop: '4px', maxHeight: '150px', overflowY: 'auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}>
                                {suggestions.map(u => (
                                  <div 
                                    key={u.id}
                                    style={{ padding: '8px 12px', fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                    onMouseDown={() => handleLevelChange(levelInfo.l, String(u.id))}
                                  >
                                    {u.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* SECTION 2: PERSONAL INFO */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <User size={18} /> Thông tin Cá nhân
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="premium-form-group">
                    <label className="premium-label"><CreditCard size={14} /> CMND / CCCD</label>
                    <input type="text" className="premium-input" placeholder="Số định danh" value={formData.identity_card} onChange={(e) => setFormData({ ...formData, identity_card: e.target.value })} />
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><Phone size={14} /> Số điện thoại</label>
                    <input type="text" className="premium-input" placeholder="Số điện thoại liên hệ" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><Home size={14} /> Quê quán</label>
                    <input type="text" className="premium-input" placeholder="Địa chỉ thường trú" value={formData.home_address} onChange={(e) => setFormData({ ...formData, home_address: e.target.value })} />
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><MapPin size={14} /> Địa chỉ đơn vị</label>
                    <input type="text" className="premium-input" placeholder="Nơi công tác hiện tại" value={formData.unit_address} onChange={(e) => setFormData({ ...formData, unit_address: e.target.value })} />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SYSTEM ACCOUNT */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1', fontSize: '1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <Lock size={18} /> Tài khoản hệ thống
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="premium-form-group">
                    <label className="premium-label"><Mail size={14} /> Email</label>
                    <input type="email" required className="premium-input" placeholder="example@gmail.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                  </div>
                  <div className="premium-form-group">
                    <label className="premium-label"><User size={14} /> Tên đăng nhập</label>
                    <input type="text" required className="premium-input" placeholder="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                  </div>
                </div>

                <div className="premium-form-group" style={{ marginTop: '1.25rem' }}>
                  <label className="premium-label"><Lock size={14} /> {showModal === 'edit' ? 'Mật khẩu mới (Để trống nếu không đổi)' : 'Mật khẩu'}</label>
                  <input type="password" required={showModal === 'add'} className="premium-input" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(null)} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Hủy bỏ</button>
                <button type="submit" disabled={submitting} className="btn-primary" style={{ flex: 2, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  {submitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={18} />}
                  <span>{showModal === 'add' ? 'Xác nhận thêm' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {showViewModal && selectedUserForView && (() => {
        // Build 6-level unit chain for the selected user
        const unitChain: { level: number; name: string; label: string }[] = [];
        const levelLabels: Record<number, string> = {
          1: 'Cấp 1: Quân khu',
          2: 'Cấp 2: Sư đoàn',
          3: 'Cấp 3: Trung đoàn',
          4: 'Cấp 4: Tiểu đoàn',
          5: 'Cấp 5: Đại đội',
          6: 'Cấp 6: Trung đội'
        };
        let currentId: string | number | null = selectedUserForView.unit_id;
        while (currentId !== null && currentId !== undefined) {
          const u = units.find(un => Number(un.id) === Number(currentId));
          if (u) {
            unitChain.unshift({ level: u.level, name: u.name, label: levelLabels[u.level] || `Cấp ${u.level}` });
            currentId = u.parent_id;
          } else {
            break;
          }
        }

        return (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content animate-scale-in" style={{ maxWidth: '780px', padding: 0, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div style={{ padding: '2rem 2.5rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(30,41,59,0.98))', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                  <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99,102,241,0.2)', border: '2px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={28} color="#818cf8" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{selectedUserForView.full_name || 'Chưa có tên'}</h2>
                    <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>@{selectedUserForView.username} &nbsp;•&nbsp; ID #{selectedUserForView.id} &nbsp;•&nbsp; {view === 'list' ? '✅ Đã kích hoạt' : '⏳ Chờ phê duyệt'}</p>
                  </div>
                </div>
                <button onClick={() => setShowViewModal(false)} className="btn-icon-hover" style={{ padding: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={22} />
                </button>
              </div>

              <div style={{ padding: '2rem 2.5rem', maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                {/* Section 1: Thông tin cá nhân */}
                <div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={14} /> Thông tin cá nhân
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem' }}>
                    <DetailItem label="Họ và tên" value={selectedUserForView.full_name || '—'} icon={<User size={15} />} />
                    <DetailItem label="Cấp bậc" value={selectedUserForView.rank || '—'} icon={<ShieldCheck size={15} />} />
                    <DetailItem label="Chức vụ" value={selectedUserForView.position || '—'} icon={<Briefcase size={15} />} />
                    <DetailItem label="Vai trò hệ thống" value={getRoleDisplayName(selectedUserForView.role_name)} icon={<Shield size={15} />} />
                    <DetailItem label="Email" value={selectedUserForView.email || 'Chưa cập nhật'} icon={<Mail size={15} />} />
                    <DetailItem label="Số điện thoại" value={selectedUserForView.phone || 'Chưa cập nhật'} icon={<Phone size={15} />} />
                    <DetailItem label="CMND / CCCD" value={selectedUserForView.identity_card || 'Chưa cập nhật'} icon={<CreditCard size={15} />} />
                    <DetailItem label="Ngày tham gia" value={formatSafeDate(selectedUserForView.created_at)} icon={<ShieldCheck size={15} />} />
                  </div>
                </div>

                {/* Section 2: Địa chỉ */}
                <div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Home size={14} /> Địa chỉ
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.2rem' }}>
                    <DetailItem label="Quê quán" value={selectedUserForView.home_address || 'Chưa cập nhật'} icon={<Home size={15} />} />
                    <DetailItem label="Địa chỉ đơn vị" value={selectedUserForView.unit_address || 'Chưa cập nhật'} icon={<MapPin size={15} />} />
                  </div>
                </div>

                {/* Section 3: Đơn vị công tác - 6 cấp */}
                <div>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.8rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={14} /> Đơn vị công tác (Phân cấp 6 cấp)
                  </h3>
                  {unitChain.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {unitChain.map((uc, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          background: idx === unitChain.length - 1
                            ? 'rgba(99,102,241,0.12)'
                            : 'rgba(255,255,255,0.03)',
                          border: idx === unitChain.length - 1
                            ? '1px solid rgba(99,102,241,0.3)'
                            : '1px solid rgba(255,255,255,0.05)',
                          marginLeft: `${idx * 16}px`
                        }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                            background: idx === unitChain.length - 1 ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.75rem', fontWeight: 900,
                            color: idx === unitChain.length - 1 ? '#818cf8' : '#475569'
                          }}>
                            {uc.level}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>{uc.label}</div>
                            <div style={{ fontWeight: 700, color: idx === unitChain.length - 1 ? '#c7d2fe' : '#e2e8f0', fontSize: '0.95rem' }}>{uc.name}</div>
                          </div>
                          {idx === unitChain.length - 1 && (
                            <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: '20px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontWeight: 700 }}>
                              ĐƠN VỊ HIỆN TẠI
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color: '#94a3b8', fontWeight: 600, margin: '0 0 4px' }}>Đơn vị: {selectedUserForView.unit_name || 'Chưa xác định'}</p>
                      <p style={{ color: '#475569', fontSize: '0.8rem', fontStyle: 'italic', margin: 0 }}>
                        (Không thể trích xuất chuỗi phân cấp 6 cấp cho nhân sự này. Vui lòng kiểm tra lại cấu tạo đơn vị trong hệ thống.)
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Footer for pending approval */}
              {view === 'pending' && (
                <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(30,41,59,0.6)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-end', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input id={`modal-unit-input-${selectedUserForView.id}`} type="text" placeholder="Nhập tên hoặc ID đơn vị..."
                      style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', padding: '8px 12px', outline: 'none', width: '200px' }} />
                    <select id={`modal-role-select-${selectedUserForView.id}`} defaultValue="5"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', fontSize: '0.9rem', padding: '8px 12px', outline: 'none' }}>
                      {getAvailableRoles().map(r => <option key={r.id} value={r.id} style={{ background: '#1e293b' }}>{getRoleDisplayName(r.name)}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => handleReject(selectedUserForView.id)} className="btn-secondary" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}><X size={18} /> Từ chối</button>
                    <button onClick={() => {
                      const roleSelect = document.getElementById(`modal-role-select-${selectedUserForView.id}`) as HTMLSelectElement;
                      const unitInput = document.getElementById(`modal-unit-input-${selectedUserForView.id}`) as HTMLInputElement;
                      if (!unitInput?.value) { showNotification('warning', 'Vui lòng nhập tên hoặc ID đơn vị trước khi phê duyệt.'); return; }
                      handleApprove(selectedUserForView.id, parseInt(roleSelect?.value || '5'), unitInput.value);
                      setShowViewModal(false);
                    }} className="btn-primary"><Check size={18} /> Phê duyệt hồ sơ</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}
    </div>
  );
}

const DetailItem = ({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9', fontWeight: 600 }}>
      {icon && <span style={{ color: '#818cf8', display: 'flex' }}>{icon}</span>}
      {value}
    </div>
  </div>
);
