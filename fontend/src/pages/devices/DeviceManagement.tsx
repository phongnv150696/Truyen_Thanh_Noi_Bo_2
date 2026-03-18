import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  Edit3, 
  MoreHorizontal, 
  Smartphone, 
  Speaker, 
  Activity,
  XCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle
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
}

interface Unit {
  id: number;
  name: string;
}

const API_URL = 'http://127.0.0.1:3000';

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

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

  useEffect(() => {
    fetchDevices();
    fetchUnits();
    setSelectedIds([]);

    // Initialize WebSocket
    const socket = new WebSocket('ws://127.0.0.1:3000/ws');
    
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

  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm]);

  const filteredDevices = devices.filter(dev => 
    dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.ip_address?.includes(searchTerm)
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const paginatedDevices = filteredDevices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when searching
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
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
    setFormData({ name: '', type: 'speaker', ip_address: '', unit_id: '' });
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
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({
          ...formData,
          unit_id: formData.unit_id ? parseInt(formData.unit_id) : null
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

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedDevices.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedDevices.map(d => d.id));
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
                checked={paginatedDevices.length > 0 && selectedIds.length === paginatedDevices.length}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </div>
            <span style={{ flex: 2 }}>Tên thiết bị</span>
            <span style={{ flex: 1 }}>Loại</span>
            <span style={{ flex: 1 }}>Địa chỉ IP</span>
            <span style={{ flex: 1 }}>Trạng thái</span>
            <span style={{ width: '120px', textAlign: 'right' }}>Thao tác</span>
          </div>

          {loading && devices.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={30} className="animate-spin" style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <Smartphone size={40} style={{ opacity: 0.2, marginBottom: '0.8rem' }} />
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Không tìm thấy thiết bị nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {paginatedDevices.map((device) => (
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
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '10px', 
                      background: 'rgba(255,255,255,0.03)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      {device.type === 'terminal' ? <Smartphone size={20} color="#6366f1" /> : <Speaker size={20} color="#94a3b8" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9' }}>{device.name}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Hệ thống: {device.unit_name || 'Mặc định'}</p>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '4px 10px', 
                      borderRadius: '20px',
                      color: '#cbd5e1'
                    }}>
                      {device.type === 'terminal' ? 'Trung tâm' : 'Đầu cuối (Loa)'}
                    </span>
                  </div>

                  <div style={{ flex: 1, fontFamily: 'monospace', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {device.ip_address || '---.---.---.---'}
                  </div>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStatusColor(device.status) }} />
                    <span style={{ fontSize: '0.9rem', color: '#cbd5e1', textTransform: 'capitalize' }}>{device.status}</span>
                  </div>

                  <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      onClick={() => openEditModal(device)}
                      className="btn-icon-hover" 
                      title="Chỉnh sửa" 
                      style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => openDeleteModal(device)}
                      className="btn-icon-hover" 
                      title="Xóa" 
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
                    >
                      <Trash2 size={18} />
                    </button>
                    <button className="btn-icon-hover" title="Xem thêm" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                      <MoreHorizontal size={18} />
                    </button>
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
