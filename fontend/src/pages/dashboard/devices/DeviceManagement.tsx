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
  ChevronRight
} from 'lucide-react';

interface Device {
  id: number;
  name: string;
  type: string;
  ip_address: string;
  status: 'online' | 'offline' | 'maintenance';
  unit_name?: string;
  last_seen: string;
}

export default function DeviceManagement() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, maintenance: 0 });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:3000/devices');
      const data = await response.json();
      setDevices(data);
      
      const newStats = data.reduce((acc: any, dev: Device) => {
        acc.total++;
        acc[dev.status]++;
        return acc;
      }, { total: 0, online: 0, offline: 0, maintenance: 0 });
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

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
        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 28px', borderRadius: '12px', fontWeight: 700 }}>
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
                    transition: 'all 0.2s ease'
                  }}
                >
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
                    <button className="icon-btn-hover" title="Chỉnh sửa" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                      <Edit3 size={18} />
                    </button>
                    <button className="icon-btn-hover" title="Xóa" style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
                      <Trash2 size={18} />
                    </button>
                    <button className="icon-btn-hover" title="Thêm nữa" style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}>
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
    </div>
  );
}
