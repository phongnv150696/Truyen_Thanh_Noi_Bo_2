import { useState, useEffect } from 'react';
import {
  Calendar,
  Radio,
  Search,
  RefreshCw,
  Trash2,
  Edit3,
  Play,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Layers,
  Check,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:3000';

interface Schedule {
  id: number;
  scheduled_time: string;
  duration: string;
  repeat_pattern: string;
  is_active: boolean;
  channel_name: string;
  mount_point: string;
  content_title: string;
  channel_id: number;
  content_id: number;
}

interface Channel {
  id: number;
  name: string;
  mount_point: string;
  description: string;
  status: 'online' | 'offline' | 'emergency';
  unit_name?: string;
}

interface ContentItem {
  id: number;
  title: string;
}

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Partial<Schedule> | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, chanRes, contRes] = await Promise.all([
        fetch(`${API_URL}/schedules`, { headers: getHeaders() }),
        fetch(`${API_URL}/channels`, { headers: getHeaders() }),
        fetch(`${API_URL}/content`, { headers: getHeaders() })
      ]);
      const schedData = await schedRes.json();
      const chanData = await chanRes.json();
      const contData = await contRes.json();
      
      console.log('Fetched data results:', { schedData, chanData, contData });
      
      setSchedules(Array.isArray(schedData) ? schedData : []);
      setChannels(Array.isArray(chanData) ? chanData : []);
      setContents(Array.isArray(contData) ? contData : []);

      // Also fetch emergency status
      const emRes = await fetch(`${API_URL}/schedules/emergency/status`, { headers: getHeaders() });
      if (emRes.ok) {
        const emData = await emRes.json();
        setIsEmergencyActive(emData.active);
      }
    } catch (error) {
      console.error('Error fetching broadcast data:', error);
      setSchedules([]);
      setChannels([]);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Initialize WebSocket
    const socket = new WebSocket('ws://127.0.0.1:3000/ws');
    
    socket.onopen = () => {
      console.log('ScheduleManagement: Connected to WebSocket');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('ScheduleManagement: WS Message received:', data);
        
        // Handle channel status updates
        if (data.type === 'channel_status_update' && data.channel) {
          setChannels(prev => prev.map(ch => 
            ch.id === data.channel.id ? { ...ch, ...data.channel } : ch
          ));
        }

        // Handle general emergency status
        if (data.type === 'emergency_status_change') {
          setIsEmergencyActive(data.active);
        }

        // Handle broadcast progress (placeholder for future implementation)
        if (data.type === 'broadcast_progress') {
           // We could update a progress state here if the UI supported it
           console.log('Progress update:', data);
        }
      } catch (err) {
        console.error('ScheduleManagement: Error parsing WS message:', err);
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const handlePlayNow = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn phát bản tin này ngay lập tức?')) return;
    setProcessingId(id);
    try {
      const res = await fetch(`${API_URL}/schedules/${id}/play`, { 
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        alert('Đã kích hoạt phát sóng ngay lập tức!');
        fetchData();
      }
    } catch (error) {
      console.error('Error playing schedule:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleEmergencyTrigger = async () => {
    const action = isEmergencyActive ? 'dừng' : 'KÍCH HOẠT';
    const confirmMsg = isEmergencyActive 
      ? `Bạn có chắc chắn muốn ${action} trạng thái báo động khẩn cấp?` 
      : `CẢNH BÁO: Bạn đang chuẩn bị ${action} PHÁT BÁO ĐỘNG toàn hệ thống. Tiếp tục?`;

    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const url = isEmergencyActive ? `${API_URL}/schedules/emergency/stop` : `${API_URL}/schedules/emergency`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders()
      });

      if (res.ok) {
        setIsEmergencyActive(!isEmergencyActive);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Thao tác khẩn cấp thất bại');
      }
    } catch (error) {
      console.error('Emergency error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch phát này?')) return;
    try {
      const res = await fetch(`${API_URL}/schedules/${id}`, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s.id !== id));
        setSelectedIds(prev => prev.filter(sid => sid !== id));
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} lịch phát đã chọn?`)) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/schedules/bulk-delete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ ids: selectedIds })
      });

      if (res.ok) {
        setSchedules(prev => prev.filter(s => !selectedIds.includes(s.id)));
        setSelectedIds([]);
        fetchData(); // Refresh to be safe
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Xóa hàng loạt thất bại.');
      }
    } catch (error) {
      console.error('Error bulk deleting schedules:', error);
      setError('Lỗi kết nối khi xóa hàng loạt.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredSchedules.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSchedules.map(s => s.id));
    }
  };

  const toggleItemSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    );
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;

    setIsSubmitting(true);
    setError(null);

    const method = editingSchedule.id ? 'PATCH' : 'POST';
    const url = editingSchedule.id 
      ? `${API_URL}/schedules/${editingSchedule.id}`
      : `${API_URL}/schedules`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify(editingSchedule)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingSchedule(null);
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Có lỗi xảy ra khi lưu lịch phát.');
      }
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      setError('Lỗi kết nối đến máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle2 size={16} color="#10b981" />;
      case 'emergency': return <AlertTriangle size={16} color="#ef4444" className="animate-pulse" />;
      default: return <XCircle size={16} color="#64748b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#10b981';
      case 'emergency': return '#ef4444';
      default: return '#64748b';
    }
  };

  const filteredSchedules = schedules.filter(s =>
    s.content_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.channel_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm]);

  const formatSafeTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatSafeDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('vi-VN');
  };

  const formatSafeDateTimeForInput = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        // Fallback for strings that might already be in YYYY-MM-DDTHH:mm format
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(dateStr)) {
          return dateStr.slice(0, 16);
        }
        return '';
      }
      
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return '';
    }
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
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Lịch phát thanh</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Điều hành luồng phát thanh, lập lịch tiếp sóng và thông báo khẩn.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleEmergencyTrigger}
            className="btn-secondary" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              color: 'white', 
              background: isEmergencyActive ? '#ef4444' : 'transparent',
              borderColor: isEmergencyActive ? '#ef4444' : 'rgba(239, 68, 68, 0.2)',
              animation: isEmergencyActive ? 'pulse-red 1s infinite' : 'none'
            }}
          >
            <ShieldAlert size={18} color={isEmergencyActive ? 'white' : '#ef4444'} />
            <span>{isEmergencyActive ? 'DỪNG BÁO ĐỘNG' : 'Phát Báo Động'}</span>
          </button>
          <style>{`
            @keyframes pulse-red {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
              70% { transform: scale(1.05); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          `}</style>
          <button 
            onClick={() => {
              const now = new Date();
              const pad = (n: number) => String(n).padStart(2, '0');
              const localNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
              
              setEditingSchedule({
                channel_id: channels[0]?.id,
                content_id: contents[0]?.id,
                scheduled_time: localNow,
                duration: '00:05:00',
                repeat_pattern: 'none'
              } as any);
              setIsModalOpen(true);
            }}
            className="btn-primary" 
          >
            <Plus size={20} />
            <span>Lập lịch mới</span>
          </button>
        </div>
      </div>

      {/* Channel Monitor Section */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.2rem' }}>Giám sát Kênh Truyền</h2>
      <section className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        {channels.map(channel => (
          <div key={channel.id} className="stat-card" style={{ 
            padding: '1.5rem',
            background: channel.status === 'emergency' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(255,255,255,0.03))' : 'rgba(255,255,255,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: '45px',
                height: '45px',
                background: channel.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Radio size={24} color={getStatusColor(channel.status)} />
              </div>
              <div style={{ 
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.65rem',
                fontWeight: 800,
                background: channel.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
                color: getStatusColor(channel.status),
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {getStatusIcon(channel.status)}
                <span>{channel.status}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.2rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9' }}>{channel.name}</h4>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} /> {channel.mount_point}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Timeline toolbar and search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}></h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div className="glass-card" style={{ 
            padding: '4px 12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '200px' }}
            />
          </div>
          <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 16px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

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
            <span>Đã chọn {selectedIds.length} lịch phát</span>
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

      {/* Schedule Table */}
      <section className="section-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Timeline Phát sóng</h2>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>{filteredSchedules.length} lịch phát</span>
        </div>
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{
            padding: '1rem 1.5rem',
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
                checked={filteredSchedules.length > 0 && selectedIds.length === filteredSchedules.length}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
              />
            </div>
            <span style={{ width: '120px' }}>Giờ phát</span>
            <span style={{ flex: 1 }}>Nội dung & Kênh</span>
            <span style={{ width: '150px' }}>Tần suất</span>
            <span style={{ width: '150px', textAlign: 'right' }}>Thao tác</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>Không tìm thấy lịch phát nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {paginatedSchedules.map(item => (
                <div key={item.id} className="table-row-hover" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.2rem 1.5rem',
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
                  {/* Time Info */}
                  <div style={{ width: '120px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px' }}>
                      {formatSafeTime(item.scheduled_time)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', fontWeight: 500 }}>
                      {formatSafeDate(item.scheduled_time)}
                    </div>
                  </div>

                  {/* Content Info */}
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{item.content_title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600 }}>
                      <Radio size={14} /> {item.channel_name}
                    </div>
                  </div>

                  {/* Pattern */}
                  <div style={{ width: '150px' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      background: item.repeat_pattern !== 'none' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: item.repeat_pattern !== 'none' ? '#818cf8' : '#94a3b8',
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {item.repeat_pattern === 'none' ? 'Một lần' : item.repeat_pattern === 'daily' ? 'Hàng ngày' : 'Hàng tuần'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div style={{ width: '150px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      onClick={() => handlePlayNow(item.id)}
                      disabled={processingId === item.id}
                      className="icon-btn-hover"
                      style={{ 
                        color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', 
                        border: 'none', width: '36px', height: '36px', borderRadius: '10px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                      title="Phát ngay"
                    >
                      {processingId === item.id ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
                    </button>
                    <button 
                      onClick={() => {
                        // Ensure we format the date correctly when opening the edit modal
                        setEditingSchedule({
                          ...item,
                          scheduled_time: formatSafeDateTimeForInput(item.scheduled_time)
                        });
                        setIsModalOpen(true);
                      }}
                      className="icon-btn-hover"
                      style={{ 
                        color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', 
                        border: 'none', width: '36px', height: '36px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                      title="Sửa"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="icon-btn-hover"
                      style={{ 
                        color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', 
                        border: 'none', width: '36px', height: '36px', borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                      }}
                      title="Xóa"
                    >
                      <Trash2 size={18} />
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

      {/* Modal */}
      {isModalOpen && editingSchedule && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {editingSchedule.id ? 'Cập nhật lịch phát' : 'Lên lịch phát mới'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <XCircle size={20} />
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

            <form onSubmit={handleSaveSchedule}>
              <div className="premium-form-group">
                <label className="premium-label"><Radio size={14} /> Kênh phát thanh</label>
                <select 
                  className="premium-select"
                  required
                  value={editingSchedule.channel_id || ''}
                  onChange={e => setEditingSchedule({...editingSchedule, channel_id: parseInt(e.target.value)} as any)}
                >
                  <option value="">Chọn kênh...</option>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="premium-form-group">
                <label className="premium-label"><Layers size={14} /> Bản tin nội dung</label>
                <select 
                  className="premium-select"
                  required
                  value={editingSchedule.content_id || ''}
                  onChange={e => setEditingSchedule({...editingSchedule, content_id: parseInt(e.target.value)} as any)}
                >
                  <option value="">Chọn bản tin...</option>
                  {contents.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '2rem' }}>
                <div className="premium-form-group" style={{ marginBottom: 0 }}>
                  <label className="premium-label"><Clock size={14} /> Thời gian bắt đầu</label>
                    <input 
                      type="datetime-local" 
                      required
                      className="premium-input"
                      value={formatSafeDateTimeForInput(editingSchedule.scheduled_time)}
                      onChange={e => {
                        const val = e.target.value;
                        if (!val) return;
                        // Directly store the input value string to avoid timezone drift during editing
                        setEditingSchedule({...editingSchedule, scheduled_time: val} as any);
                      }}
                    />
                </div>
                <div className="premium-form-group" style={{ marginBottom: 0 }}>
                  <label className="premium-label"><RefreshCw size={14} /> Tần suất</label>
                  <select 
                    className="premium-select"
                    value={editingSchedule.repeat_pattern || 'none'}
                    onChange={e => setEditingSchedule({...editingSchedule, repeat_pattern: e.target.value} as any)}
                  >
                    <option value="none">Một lần</option>
                    <option value="daily">Hàng ngày</option>
                    <option value="weekly">Hàng tuần</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Hủy bỏ</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={20} />}
                  <span>{editingSchedule.id ? 'Lưu thay đổi' : 'Xác nhận lưu'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
