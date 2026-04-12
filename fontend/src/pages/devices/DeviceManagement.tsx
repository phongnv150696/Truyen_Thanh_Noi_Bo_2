import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  MoreVertical, 
  Smartphone, 
  Speaker, 
  X,
  Check,
  AlertCircle,
  LayoutGrid,
  Building2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Zap,
  Volume2,
  Settings2,
  ShieldAlert,
  Signal,
  History
} from 'lucide-react';

interface Device {
  id: number;
  name: string;
  type: string;
  ip_address: string;
  status: 'online' | 'offline' | 'maintenance';
  unit_id?: number;
  unit_name?: string;
  last_seen: string;
  volume: number;
  signal_strength: number;
  firmware_version: string;
  last_maintenance?: string;
  maintenance_notes?: string;
}

interface Unit {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
}

import { API_URL, WEBSOCKET_URL } from '../../config'

export default function DeviceManagement({ user, onLogout }: { user: any, onLogout?: () => void }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'unit' | 'channel'>('none');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  

  // CRUD States
  const [units, setUnits] = useState<Unit[]>([]);
  const [showModal, setShowModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'speaker',
    ip_address: '',
    unit_id: ''
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentUserUnitName, setCurrentUserUnitName] = useState<string>(user?.unit_name || '');
  
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
  
  const [showCommandModal, setShowCommandModal] = useState<Device | null>(null);
  const [commandLoading, setCommandLoading] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/devices`, {
        headers: getHeaders()
      });
      if (response.status === 401) {
        onLogout?.();
        return;
      }
      const data = await response.json();
      
      const devicesArray = Array.isArray(data) ? data : [];
      setDevices(devicesArray);
      
      const newStats = devicesArray.reduce((acc: any, dev: Device) => {
        acc.total++;
        if (acc[dev.status] !== undefined) {
          acc[dev.status]++;
        }
        return acc;
      }, { total: 0, online: 0, offline: 0, maintenance: 0 });
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching devices:', error);
      setDevices([]);
      setStats({ total: 0, online: 0, offline: 0, maintenance: 0 });
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const response = await fetch(`${API_URL}/users/units?scope=all_visible`, {
        headers: getHeaders()
      });
      const data = await response.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchUnits();
    setSelectedIds([]);


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

    // Initialize WebSocket
    const socket = new WebSocket(WEBSOCKET_URL);
    
    socket.onopen = () => {
      console.log('Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WS Message received:', data);
        
        if (data.type === 'device_status_update' && data.device) {
          setDevices(prev => prev.map(dev => 
            dev.id === data.device.id ? { ...dev, ...data.device } : dev
          ));
          
          // Re-calculate stats
          setStats(() => {
            const updatedDevices = devices.map(dev => 
              dev.id === data.device.id ? { ...dev, ...data.device } : dev
            );
            return updatedDevices.reduce((acc: any, dev: Device) => {
              acc.total++;
              if (acc[dev.status] !== undefined) {
                acc[dev.status]++;
              }
              return acc;
            }, { total: 0, online: 0, offline: 0, maintenance: 0 });
          });
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      socket.close();
    };
  }, []);

  // Sync selectedLevels whenever modal state or units list changes
  useEffect(() => {
    if (!showModal || units.length === 0) return;

    const levels: { [key: number]: string | number } = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };
    let startUnitId: number | null | undefined = null;

    if (showModal === 'add') {
      startUnitId = user?.unit_id;
    } else if (showModal === 'edit' && selectedDevice) {
      startUnitId = selectedDevice.unit_id;
    }

    if (startUnitId) {
      let currentId: number | null | undefined = startUnitId;
      while (currentId) {
        const u = units.find(unit => unit.id === currentId);
        if (u) {
          levels[u.level] = u.id;
          currentId = u.parent_id;
        } else break;
      }
      setSelectedLevels(levels);
    }
  }, [showModal, units, selectedDevice, user]);

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

  useEffect(() => {
    setSelectedIds([]);
  }, [searchTerm]);

  const filteredDevices = devices.filter(dev => 
    dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.ip_address?.includes(searchTerm)
  );

  // Grouping Logic
  type GroupedDevices = { [key: string]: Device[] };
  
  const getGroupedData = (): GroupedDevices => {
    if (groupBy === 'none') return { "Tất cả thiết bị": filteredDevices };
    
    return filteredDevices.reduce((acc: GroupedDevices, dev: Device) => {
      let key = "Không xác định";
      if (groupBy === 'unit') key = dev.unit_name || "Chưa phân đơn vị";
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(dev);
      return acc;
    }, {});
  };

  const groupedData = getGroupedData();

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]
    );
  };

  // Initialize all groups as expanded when group mode changes
  useEffect(() => {
    setExpandedGroups(Object.keys(groupedData));
  }, [groupBy]);


  // Reset page when searching
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'offline': return '#f87171';
      case 'maintenance': return '#fbbf24';
      default: return '#94a3b8';
    }
  };

  const openAddModal = () => {
    setFormData({ name: '', type: 'speaker', ip_address: '', unit_id: currentUserUnitName || user.unit_name || '' });
    setError(null);
    setShowModal('add');
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      name: device.name,
      type: device.type,
      ip_address: device.ip_address || '',
      unit_id: device.unit_id?.toString() || ''
    });

    setError(null);
    setShowModal('edit');
  };

  const openDeleteModal = (device: Device) => {
    setSelectedDevice(device);
    setError(null);
    setShowModal('delete');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const url = showModal === 'edit' 
      ? `${API_URL}/devices/${selectedDevice?.id}` 
      : `${API_URL}/devices`;
    
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
        parent_unit_id: parentUnitId
      };

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await fetchDevices();
        setShowModal(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Lỗi hệ thống (${response.status}).`);
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(`Lỗi kết nối đến máy chủ: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/devices/${selectedDevice.id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (response.ok) {
        await fetchDevices();
        setSelectedIds(prev => prev.filter(sid => sid !== selectedDevice.id));
        setShowModal(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Không thể xóa thiết bị (${response.status}).`);
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(`Lỗi kết nối đến máy chủ: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} thiết bị đã chọn?`)) return;

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/devices/bulk-delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (response.ok) {
        await fetchDevices();
        setSelectedIds([]);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Xóa hàng loạt thất bại.');
      }
    } catch (err: any) {
      console.error('Bulk delete error:', err);
      setError('Lỗi kết nối khi xóa hàng loạt.');
    } finally {
      setSubmitting(false);
    }
  };


  const handleDeviceCommand = async (deviceId: number, command: string, payload: any = {}) => {
    setCommandLoading(true);
    try {
      const response = await fetch(`${API_URL}/devices/${deviceId}/command`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ command, payload })
      });

      if (response.ok) {
        // Success notification or sound could go here
        if (command === 'REBOOT') {
            setShowCommandModal(null);
        }
        await fetchDevices();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Lệnh thực thi thất bại.');
      }
    } catch (err) {
      console.error('Command error:', err);
      alert('Lỗi kết nối khi gửi lệnh.');
    } finally {
      setCommandLoading(false);
    }
  };

  const toggleItemSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* 1. Header & Actions */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2.5rem',
        width: '100%'
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Quản lý Thiết bị</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Theo dõi và điều khiển các đầu phát, cụm loa toàn hệ thống.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', fontWeight: 700 }}
        >
          <Plus size={20} />
          <span>Thêm thiết bị mới</span>
        </button>
      </div>

      {/* 2. Stats Grid */}
      <section className="section-container animate-fade-in" style={{ width: '100%', marginBottom: '2.5rem' }}>
        <div className="stats-grid">
          <div className="stat-card" style={{ padding: '1.8rem', borderTop: '4px solid #6366f1' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={28} color="#6366f1" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Tổng trạm</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Các điểm phát/loa toàn hệ thống</p>
            <div className="stat-value" style={{ fontSize: '2.8rem' }}>{stats.total}</div>
          </div>

          <div className="stat-card" style={{ padding: '1.8rem', borderTop: '4px solid #10b981' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={28} color="#10b981" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Phát sóng</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Trạng thái trực tuyến (Online)</p>
            <div className="stat-value" style={{ fontSize: '2.8rem', color: '#10b981' }}>{stats.online}</div>
          </div>

          <div className="stat-card" style={{ padding: '1.8rem', borderTop: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Signal size={28} color="#f59e0b" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Sóng yếu</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Tín hiệu dưới ngưỡng 40%</p>
            <div className="stat-value" style={{ fontSize: '2.8rem', color: '#f59e0b' }}>
              {devices.filter(d => d.status === 'online' && d.signal_strength < 40).length}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Toolbar Section (Horizontal Search matching Media) */}
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
              placeholder="Tìm kiếm thiết bị theo tên hoặc địa chỉ IP..."
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
            onClick={fetchDevices}
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

        {/* 3b. Grouping Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '10px', 
          marginTop: '1rem',
          padding: '4px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          width: 'fit-content',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <button 
            onClick={() => setGroupBy('none')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: groupBy === 'none' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: groupBy === 'none' ? '#818cf8' : '#64748b',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <LayoutGrid size={16} />
            <span>Danh sách phẳng</span>
          </button>
          
          <button 
            onClick={() => setGroupBy('unit')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: groupBy === 'unit' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: groupBy === 'unit' ? '#818cf8' : '#64748b',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Building2 size={16} />
            <span>Theo Đơn vị</span>
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="animate-fade-in" style={{ 
            marginTop: '1.5rem', 
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
               <span>Đã chọn {selectedIds.length} thiết bị</span>
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
      </section>

      {/* 4. Device Table Section */}
      <section className="section-container animate-fade-in" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Danh sách thiết bị</h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{filteredDevices.length} thiết bị</span>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden', background: 'transparent', border: 'none' }}>
           {loading && devices.length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={30} className="animate-spin" style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : Object.keys(groupedData).length === 0 ? (
            <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <Smartphone size={40} style={{ opacity: 0.2, marginBottom: '0.8rem' }} />
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Không tìm thấy thiết bị nào.</p>
            </div>
          ) : (
            Object.entries(groupedData).map(([groupName, groupDevices]) => (
              <div key={groupName} className="animate-fade-in" style={{ marginBottom: '2rem' }}>
                {/* Group Header */}
                <div 
                  onClick={() => toggleGroup(groupName)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px 20px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                >
                  {expandedGroups.includes(groupName) ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronUp size={18} color="#94a3b8" />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {groupBy === 'unit' && <Building2 size={18} color="#818cf8" />}
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f1f5f9' }}>{groupName}</span>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: 'rgba(99, 102, 241, 0.15)', 
                      padding: '2px 8px', 
                      borderRadius: '10px', 
                      color: '#818cf8',
                      fontWeight: 700
                    }}>
                      {groupDevices.length} thiết bị
                    </span>
                  </div>
                </div>

                {expandedGroups.includes(groupName) && (
                  <div className="glass-card" style={{ overflow: 'hidden' }}>
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
                      <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={groupDevices.every(d => selectedIds.includes(d.id))}
                          onChange={() => {
                            const allSelected = groupDevices.every(d => selectedIds.includes(d.id));
                            if (allSelected) {
                              setSelectedIds(prev => prev.filter(id => !groupDevices.some(gd => gd.id === id)));
                            } else {
                              setSelectedIds(prev => [...new Set([...prev, ...groupDevices.map(gd => gd.id)])]);
                            }
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </div>
                      <span style={{ width: '60px' }}>ID</span>
                      <span style={{ flex: 1.5 }}>Tên thiết bị</span>
                      <span style={{ flex: 1 }}>Đơn vị quản lý</span>
                      <span style={{ flex: 1.2 }}>Chỉ số Tín hiệu & Âm lượng</span>
                      <span style={{ flex: 0.6 }}>Trạng thái</span>
                      <span style={{ width: '120px', textAlign: 'right' }}>Điều khiển</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {groupDevices.map((device) => (
                        <div 
                          key={device.id}
                          className="table-row-hover"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0.8rem 1.2rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                            transition: 'all 0.2s ease',
                            background: selectedIds.includes(device.id) ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                          }}
                        >
                          <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(device.id)}
                              onChange={() => toggleItemSelect(device.id)}
                              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                            />
                          </div>
                          <div style={{ width: '60px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                             #{device.id}
                           </div>
                          <div style={{ flex: 1.5, display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ 
                              width: '36px', 
                              height: '36px', 
                              borderRadius: '8px', 
                              background: 'rgba(255,255,255,0.03)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              border: '1px solid rgba(255,255,255,0.05)',
                              boxShadow: selectedIds.includes(device.id) ? '0 0 15px rgba(99, 102, 241, 0.3)' : 'none'
                            }}>
                              {device.type === 'terminal' ? <Smartphone size={18} color="#6366f1" /> : 
                               device.type === 'esp32-speaker' || device.type === 'xiaozhi-speaker' ? <Cpu size={18} color="#10b981" /> : 
                               <Speaker size={18} color="#94a3b8" />}
                            </div>
                            <div>
                               <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '0.9rem' }}>
                                 {device.name}
                               </p>
                               <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>IP: {device.ip_address || '---'}</p>
                            </div>
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ padding: '4px', background: 'rgba(129, 140, 248, 0.1)', borderRadius: '6px' }}>
                                <Building2 size={12} color="#818cf8" />
                              </div>
                              <span style={{ 
                                fontSize: '0.8rem', 
                                color: '#cbd5e1',
                                fontWeight: 700
                              }}>
                                {device.unit_name || 'Chưa gán'}
                              </span>
                            </div>
                          </div>

                          <div style={{ flex: 1.2, display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Signal size={10} /> Sóng</span>
                                 <span style={{ fontWeight: 800, color: device.signal_strength < 40 ? '#f59e0b' : '#10b981' }}>{device.signal_strength || 0}%</span>
                               </div>
                               <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ 
                                    height: '100%', 
                                    width: `${device.signal_strength || 0}%`, 
                                    background: device.signal_strength < 40 ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 'linear-gradient(90deg, #10b981, #34d399)',
                                    boxShadow: '0 0 5px rgba(16, 185, 129, 0.3)'
                                  }} />
                               </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8' }}>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Volume2 size={10} /> Loa</span>
                                 <span style={{ fontWeight: 800, color: '#6366f1' }}>{device.volume || 0}%</span>
                               </div>
                               <div style={{ height: '4px', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${device.volume || 0}%`, background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
                               </div>
                            </div>
                          </div>

                          <div style={{ flex: 0.6, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className={device.status === 'online' ? 'animate-pulse' : ''} style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(device.status), boxShadow: `0 0 10px ${getStatusColor(device.status)}` }} />
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{device.status}</span>
                          </div>

                          <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                            <button 
                              onClick={() => setShowCommandModal(device)}
                              className="btn-icon-hover" 
                              title="Điều khiển C2" 
                              style={{ 
                                background: 'rgba(99, 102, 241, 0.1)', 
                                border: '1px solid rgba(99, 102, 241, 0.2)', 
                                color: '#818cf8', 
                                cursor: 'pointer', 
                                padding: '8px', 
                                borderRadius: '8px'
                              }}
                            >
                              <Settings2 size={16} />
                            </button>

                            <div className="action-menu-container" style={{ position: 'relative' }}>
                              <button 
                                onClick={() => setMenuOpenId(menuOpenId === device.id ? null : device.id)}
                                className="btn-icon-hover" 
                                style={{ 
                                  background: 'rgba(255,255,255,0.05)', 
                                  border: 'none', 
                                  color: '#cbd5e1', 
                                  cursor: 'pointer', 
                                  padding: '8px', 
                                  borderRadius: '8px' 
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                                {menuOpenId === device.id && (
                                <div className="glass-card animate-fade-in" style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  width: '180px',
                                  zIndex: 100,
                                  padding: '8px',
                                  marginTop: '8px',
                                  background: 'rgba(15, 23, 42, 0.95)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                }}>
                                  <button onClick={() => { openEditModal(device); setMenuOpenId(null); }} className="glass-btn-sidebar" style={{ justifyContent: 'flex-start', border: 'none', padding: '10px' }}>
                                    <Edit3 size={14} /> Cấu hình
                                  </button>
                                  <button onClick={() => { openDeleteModal(device); setMenuOpenId(null); }} className="glass-btn-sidebar" style={{ justifyContent: 'flex-start', border: 'none', padding: '10px', color: '#ef4444' }}>
                                    <Trash2 size={14} /> Gỡ bỏ
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* C2 Command & Control Modal */}
      {showCommandModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="animate-scale-up glass-card" style={{
              width: '100%',
              maxWidth: '600px',
              padding: '2.5rem',
              position: 'relative',
              border: '1px solid rgba(255,255,255,0.1)'
          }}>
             <button 
                onClick={() => setShowCommandModal(null)}
                style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
             >
                <X size={24} />
             </button>

             <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ 
                  width: '70px', height: '70px', borderRadius: '20px', 
                  background: 'rgba(99, 102, 241, 0.1)', border: '2px solid rgba(99, 102, 241, 0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                   <Settings2 size={35} color="#6366f1" />
                </div>
                <div>
                   <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#f1f5f9' }}>{showCommandModal.name}</h2>
                   <p style={{ margin: '5px 0 0 0', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(showCommandModal.status) }} />
                      Control Center (C2) - IP: {showCommandModal.ip_address}
                   </p>
                </div>
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                {/* Health & Status */}
                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Tín hiệu hiện tại</span>
                      <ShieldAlert size={16} color="#10b981" />
                   </div>
                   <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', marginBottom: '0.5rem' }}>{showCommandModal.signal_strength}%</div>
                   <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Phiên bản: {showCommandModal.firmware_version}</div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Âm lượng (Master)</span>
                      <Volume2 size={16} color="#6366f1" />
                   </div>
                   <div style={{ fontSize: '2rem', fontWeight: 800, color: '#6366f1', marginBottom: '1rem' }}>{showCommandModal.volume}%</div>
                   <input 
                      type="range" min="0" max="100" 
                      value={showCommandModal.volume} 
                      onChange={(e) => handleDeviceCommand(showCommandModal.id, 'SET_VOLUME', { volume: parseInt(e.target.value) })}
                      style={{ width: '100%', cursor: 'pointer' }}
                   />
                </div>
             </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, color: '#cbd5e1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <Zap size={14} /> Lệnh chiến thuật
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                   <button 
                      onClick={() => handleDeviceCommand(showCommandModal.id, 'REBOOT')}
                      disabled={commandLoading}
                      className="btn-secondary" 
                      style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                   >
                      <RefreshCw size={16} className={commandLoading ? 'animate-spin' : ''} />
                      {commandLoading ? 'Đang thực thi...' : 'Khởi động lại'}
                   </button>
                   <button 
                      onClick={() => {
                        const notes = prompt('Nhập nội dung bảo trì:', showCommandModal.maintenance_notes || '');
                        if (notes !== null) handleDeviceCommand(showCommandModal.id, 'MAINTENANCE_LOG', { notes });
                      }}
                      className="btn-secondary" 
                      style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.9rem' }}
                   >
                      <History size={16} />
                      Nhật ký bảo trì
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* CRUD Modals */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)'
        }}>
          <div 
            className="animate-scale-up"
            style={{
              width: '100%',
              maxWidth: showModal === 'delete' ? '400px' : '500px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '24px',
              maxHeight: '90vh',
              overflowY: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}
          >
            {showModal === 'delete' ? (
              <div style={{ padding: '2rem' }}>
                <div style={{ width: '60px', height: '60px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem', margin: '0 auto 1.5rem' }}>
                  <Trash2 size={30} color="#ef4444" />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '1rem' }}>Xác nhận xóa</h3>
                <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '2rem' }}>
                  Bạn có chắc chắn muốn xóa thiết bị <strong>{selectedDevice?.name}</strong>? Hành động này không thể hoàn tác.
                </p>
                {error && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => setShowModal(null)}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button 
                    onClick={handleDelete}
                    disabled={submitting}
                    style={{ flex: 1, padding: '12px', borderRadius: '12px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {submitting ? 'Đang xóa...' : 'Xác nhận xóa'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                    {showModal === 'add' ? 'Thêm thiết bị mới' : 'Cập nhật thiết bị'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setShowModal(null)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <X size={24} />
                  </button>
                </div>

                <div style={{ padding: '2rem' }}>
                  {error && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem' }}>
                      <AlertCircle size={18} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.6rem' }}>Tên thiết bị</label>
                      <input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nhập tên thiết bị..."
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.6rem' }}>Loại thiết bị</label>
                        <select 
                          value={formData.type}
                          onChange={e => setFormData({ ...formData, type: e.target.value })}
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                        >
                          <option value="speaker">Loa (Đầu cuối)</option>
                          <option value="esp32-speaker">Cụm loa ESP32 (OpenClaw)</option>
                          <option value="terminal">Trung tâm (Terminal)</option>
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.6rem' }}>Địa chỉ IP</label>
                        <input 
                          value={formData.ip_address}
                          onChange={e => setFormData({ ...formData, ip_address: e.target.value })}
                          placeholder="0.0.0.0"
                          style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.6rem' }}>ĐƠN VỊ QUẢN LÝ</label>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
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

                            // Lock logic: level is locked if it's < user's level (unless global admin)
                            // Level 1 users can edit level 1. Level 4 users can edit level 4, 5, 6.
                            const isLocked = !isSystemAdmin && levelInfo.l < userLevel;

                            return (
                              <div key={levelInfo.l} style={{ position: 'relative' }}>
                                <label style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '4px', display: 'block' }}>{levelInfo.n}</label>
                                <input 
                                  type="text"
                                  className="premium-input"
                                  style={{ 
                                    width: '100%', 
                                    padding: '10px 12px', 
                                    borderRadius: '8px', 
                                    background: isLocked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)', 
                                    border: isLocked ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.1)', 
                                    color: isLocked ? '#64748b' : 'white', 
                                    outline: 'none', 
                                    fontSize: '0.8rem',
                                    opacity: isLocked ? 0.7 : 1,
                                    cursor: isLocked ? 'not-allowed' : 'text',
                                    fontWeight: isLocked ? 600 : 400
                                  }}
                                  placeholder={isLocked ? '' : `Tìm/thêm ${levelInfo.n}...`}
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

                      <p style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '6px' }}>
                        {user.role_name === 'admin' && user.unit_id === 1 
                          ? '* Quản trị viên có thể gán thiết bị ở mọi cấp.'
                          : `* Thiết bị sẽ được gán cho đơn vị cuối cùng được chọn.`}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.5rem 2rem', background: 'rgba(255,255,255,0.02)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button"
                    onClick={() => setShowModal(null)}
                    style={{ padding: '10px 24px', borderRadius: '10px', background: 'none', color: '#94a3b8', border: 'none', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    style={{ 
                      padding: '10px 32px', 
                      borderRadius: '10px', 
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)', 
                      color: 'white', 
                      border: 'none', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    {submitting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : <Check size={18} />}
                    <span>{showModal === 'add' ? 'Lưu thiết bị' : 'Cập nhật'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
