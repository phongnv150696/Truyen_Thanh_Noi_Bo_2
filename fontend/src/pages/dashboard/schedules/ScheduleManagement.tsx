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
  Zap,
  CheckCircle2,
  XCircle,
  Plus
} from 'lucide-react';

interface Schedule {
  id: number;
  scheduled_time: string;
  duration: string;
  repeat_pattern: string;
  is_active: boolean;
  channel_name: string;
  mount_point: string;
  content_title: string;
}

interface Channel {
  id: number;
  name: string;
  mount_point: string;
  description: string;
  status: 'online' | 'offline' | 'emergency';
  unit_name?: string;
}

export default function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, chanRes] = await Promise.all([
        fetch('http://localhost:3000/schedules'),
        fetch('http://localhost:3000/channels')
      ]);
      const schedData = await schedRes.json();
      const chanData = await chanRes.json();
      setSchedules(schedData);
      setChannels(chanData);
    } catch (error) {
      console.error('Error fetching broadcast data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    };
  };

  const filteredSchedules = schedules.filter(s =>
    s.content_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.channel_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', color: '#ef4444' }}>
            <AlertTriangle size={18} />
            <span>Phát Báo Động</span>
          </button>
          <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '10px' }}>
            <Plus size={20} />
            <span>Lập lịch mới</span>
          </button>
        </div>
      </div>

      {/* Channel Monitor Section */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.2rem' }}>Giám sát Kênh Truyền</h2>
      <section className="stats-grid" style={{ marginBottom: '2.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {channels.map(channel => (
          <div key={channel.id} className="stat-card" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: '45px',
                height: '45px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Radio size={24} color={getStatusColor(channel.status)} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 600, color: getStatusColor(channel.status) }}>
                {getStatusIcon(channel.status)}
                <span style={{ textTransform: 'uppercase' }}>{channel.status}</span>
              </div>
            </div>

            <div style={{ marginTop: '1.2rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{channel.name}</h4>
              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Mount: {channel.mount_point}</p>
            </div>

            <div style={{
              marginTop: '1.2rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Đơn vị: {channel.unit_name || 'Toàn cục'}</span>
              <button style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Xem chi tiết</button>
            </div>
          </div>
        ))}
      </section>

      {/* Timeline Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Timeline Phát sóng</h2>
        <div className="glass-card" style={{ padding: '4px', display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.02)' }}>
          <button style={{ padding: '6px 16px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Tất cả</button>
          <button style={{ padding: '6px 16px', borderRadius: '8px', background: 'none', color: '#64748b', border: 'none', fontSize: '0.85rem', fontWeight: 600 }}>Hôm nay</button>
        </div>
      </div>

      <section className="section-container" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card" style={{
          padding: '0 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          height: '50px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
            <Search size={18} style={{ marginLeft: '16px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Tìm kiếm lịch phát theo tên bản tin hoặc kênh..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', background: 'transparent', border: 'none', padding: '0 16px', color: 'white', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>
          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />
          <button onClick={fetchData} style={{ padding: '0 15px', height: '34px', background: 'transparent', border: 'none', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span style={{ fontSize: '0.85rem' }}>Làm mới</span>
          </button>
        </div>
      </section>

      {/* Schedule List */}
      <section className="section-container">
        <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{
            padding: '0.8rem 1.5rem',
            background: 'rgba(255,255,255,0.01)',
            display: 'flex',
            color: '#475569',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <span style={{ flex: 1 }}>Thời gian</span>
            <span style={{ flex: 2 }}>Nội dung bản tin</span>
            <span style={{ flex: 1.5 }}>Kênh phát</span>
            <span style={{ flex: 1 }}>Định kỳ</span>
            <span style={{ width: '150px', textAlign: 'right' }}>Thao tác</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Đang tải lịch trình...</p>
            </div>
          ) : filteredSchedules.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>Chưa có lịch phát sóng nào được lập.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredSchedules.map(item => (
                <div key={item.id} className="table-row-hover" style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '1.2rem 1.5rem',
                  borderBottom: '1px solid rgba(255,255,255,0.03)'
                }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'center', width: '45px' }}>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>{formatDateTime(item.scheduled_time).time}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>{formatDateTime(item.scheduled_time).date}</p>
                    </div>
                  </div>

                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Zap size={18} color="#6366f1" />
                    </div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#f1f5f9' }}>{item.content_title || 'Bản tin không tên'}</p>
                  </div>

                  <div style={{ flex: 1.5, color: '#cbd5e1', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />
                    {item.channel_name}
                  </div>

                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: '0.7rem',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: item.repeat_pattern === 'none' ? 'rgba(255,255,255,0.05)' : 'rgba(16, 185, 129, 0.1)',
                      color: item.repeat_pattern === 'none' ? '#94a3b8' : '#10b981',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}>
                      {item.repeat_pattern === 'none' ? 'Một lần' : item.repeat_pattern}
                    </span>
                  </div>

                  <div style={{ width: '150px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="icon-btn-hover" title="Phát ngay" style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', color: '#10b981', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                      <Play size={16} />
                    </button>
                    <button className="icon-btn-hover" title="Sửa" style={{ background: 'none', border: 'none', color: '#64748b', padding: '8px', cursor: 'pointer' }}>
                      <Edit3 size={18} />
                    </button>
                    <button className="icon-btn-hover" title="Xóa" style={{ background: 'none', border: 'none', color: '#ef4444', padding: '8px', cursor: 'pointer' }}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

