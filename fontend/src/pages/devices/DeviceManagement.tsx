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
  Activity,
  XCircle,
  X,
  Check,
  AlertCircle,
  LayoutGrid,
  Building2,
  Radio as RadioIcon,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';

interface Device {
  id: number;
  name: string;
  type: string;
  ip_address: string;
  status: 'online' | 'offline' | 'maintenance';
  unit_id?: number;
  unit_name?: string;
  channel_id?: number;
  channel_name?: string;
  last_seen: string;
}

interface Channel {
  id: number;
  name: string;
}

interface Unit {
  id: number;
  name: string;
}

const API_URL = `http://${window.location.hostname}:3000`;

export default function DeviceManagement({ onLogout }: { onLogout?: () => void }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<'none' | 'unit' | 'channel'>('none');
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  

  // CRUD States
  const [units, setUnits] = useState<Unit[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showModal, setShowModal] = useState<'add' | 'edit' | 'delete' | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'speaker',
    ip_address: '',
    unit_id: '',
    channel_id: ''
  });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
      const response = await fetch(`${API_URL}/users/units`, {
        headers: getHeaders()
      });
      const data = await response.json();
      setUnits(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching units:', error);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch(`${API_URL}/channels`, {
        headers: getHeaders()
      });
      const data = await response.json();
      setChannels(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  useEffect(() => {
    fetchDevices();
    fetchUnits();
    fetchChannels();
    setSelectedIds([]);

    // Initialize WebSocket
    const host = window.location.hostname || 'localhost';
    const socket = new WebSocket(`ws://${host}:3000/ws`);
    
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
      if (groupBy === 'channel') key = dev.channel_name || "Chưa gán kênh";
      
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
    setFormData({ name: '', type: 'speaker', ip_address: '', unit_id: '', channel_id: '' });
    setError(null);
    setShowModal('add');
  };

  const openEditModal = (device: Device) => {
    setSelectedDevice(device);
    setFormData({
      name: device.name,
      type: device.type,
      ip_address: device.ip_address || '',
      unit_id: device.unit_id?.toString() || '',
      channel_id: device.channel_id?.toString() || ''
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
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({
          ...formData,
          unit_id: formData.unit_id ? parseInt(formData.unit_id) : null,
          channel_id: formData.channel_id ? parseInt(formData.channel_id) : null
        })
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
          <div className="stat-card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Smartphone size={28} color="#6366f1" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Tổng thiết bị</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Số lượng phần cứng quản lý</p>
            <div className="stat-value" style={{ fontSize: '2.8rem' }}>{stats.total}</div>
          </div>

          <div className="stat-card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Activity size={28} color="#10b981" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Hoạt động</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Đang trực tuyến (Online)</p>
            <div className="stat-value" style={{ fontSize: '2.8rem', color: '#10b981' }}>{stats.online}</div>
          </div>

          <div className="stat-card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <XCircle size={28} color="#ef4444" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Ngoại tuyến</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Mất kết nối / Bảo trì</p>
            <div className="stat-value" style={{ fontSize: '2.8rem', color: '#ef4444' }}>{stats.offline + stats.maintenance}</div>
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

          <button 
            onClick={() => setGroupBy('channel')}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: groupBy === 'channel' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              color: groupBy === 'channel' ? '#818cf8' : '#64748b',
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
            <RadioIcon size={16} />
            <span>Theo Kênh</span>
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
                    {groupBy === 'channel' && <RadioIcon size={18} color="#818cf8" />}
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
                    {/* Sub-header for Table labels (optional, show only if expanded) */}
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
                      <span style={{ flex: 1 }}>Kênh</span>
                      <span style={{ flex: 0.8 }}>Địa chỉ IP</span>
                      <span style={{ flex: 0.8 }}>Trạng thái</span>
                      <span style={{ width: '120px', textAlign: 'right' }}>Thao tác</span>
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
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                              {device.type === 'terminal' ? <Smartphone size={18} color="#6366f1" /> : 
                               device.type === 'esp32-speaker' ? <Cpu size={18} color="#10b981" /> : 
                               <Speaker size={18} color="#94a3b8" />}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>
                                {device.name}
                                {device.type === 'esp32-speaker' && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 6px', borderRadius: '4px' }}>ESP32</span>}
                              </p>
                              {groupBy !== 'unit' && <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', color: '#64748b' }}>{device.unit_name || 'Đơn vị mặc định'}</p>}
                            </div>
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <RadioIcon size={12} color={device.channel_id ? "#818cf8" : "#475569"} />
                              <span style={{ 
                                fontSize: '0.8rem', 
                                color: device.channel_id ? '#818cf8' : '#475569',
                                fontWeight: device.channel_id ? 700 : 400
                              }}>
                                {device.channel_name || 'Chưa gán'}
                              </span>
                            </div>
                          </div>

                          <div style={{ flex: 0.8, fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.8rem' }}>
                            {device.ip_address || '---.---.---.---'}
                          </div>

                          <div style={{ flex: 0.8, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: getStatusColor(device.status) }} />
                            <span style={{ fontSize: '0.8rem', color: '#cbd5e1', textTransform: 'capitalize' }}>{device.status}</span>
                          </div>

                          <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                            <button 
                              onClick={() => openDeleteModal(device)}
                              className="btn-icon-hover" 
                              title="Xóa" 
                              style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                            
                            <div className="action-menu-container" style={{ position: 'relative' }}>
                              <button 
                                onClick={() => setMenuOpenId(menuOpenId === device.id ? null : device.id)}
                                className="btn-icon-hover" 
                                title="Thao tác khác" 
                                style={{ 
                                  background: menuOpenId === device.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', 
                                  border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px', borderRadius: '6px' 
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              
                              {menuOpenId === device.id && (
                                <div style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '100%',
                                  zIndex: 100,
                                  minWidth: '140px',
                                  background: '#0f172a',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '10px',
                                  padding: '4px',
                                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                                  marginTop: '6px'
                                }}>
                                  <button
                                    style={{ 
                                      width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', 
                                      display: 'flex', alignItems: 'center', gap: '8px', color: '#818cf8', 
                                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                    }}
                                    onClick={() => { openEditModal(device); setMenuOpenId(null); }}
                                  >
                                    <Edit3 size={14} /> Chỉnh sửa
                                  </button>
                                  <button
                                    style={{ 
                                      width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', 
                                      display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', 
                                      background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem'
                                    }}
                                    onClick={() => { setMenuOpenId(null); }}
                                  >
                                    <Activity size={14} /> Kiểm tra
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
              overflow: 'hidden',
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
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.6rem' }}>Đơn vị quản lý</label>
                      <select 
                        required
                        value={formData.unit_id}
                        onChange={e => setFormData({ ...formData, unit_id: e.target.value })}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }}
                      >
                        <option value="">-- Chọn đơn vị --</option>
                        {units.map(unit => (
                          <option key={unit.id} value={unit.id}>{unit.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '0.6rem' }}>Kênh kết nối (Phát sóng)</label>
                      <select 
                        required
                        value={formData.channel_id}
                        onChange={e => setFormData({ ...formData, channel_id: e.target.value })}
                        style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#818cf8', fontWeight: 700, outline: 'none' }}
                      >
                        <option value="" style={{ color: '#94a3b8' }}>-- Chọn kênh phát --</option>
                        {channels.map(ch => (
                          <option key={ch.id} value={ch.id} style={{ color: 'black' }}>{ch.name}</option>
                        ))}
                      </select>
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
