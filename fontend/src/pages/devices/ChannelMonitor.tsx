import { useState, useEffect, useRef } from 'react';
import { Radio, Activity, Signal, Volume2, Globe, Monitor, Search, RefreshCw } from 'lucide-react';

interface Channel {
  id: number;
  name: string;
  mount_point: string;
  status: string;
  unit_name?: string;
  description?: string;
}

interface Device {
  id: number;
  name: string;
  status: string;
  ip_address: string;
  unit_name?: string;
  last_seen?: string;
}

export default function ChannelMonitor({ onLogout }: { onLogout?: () => void }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const pollInterval = useRef<any>(null);

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('openclaw_token') || ''}`
  });

  const fetchChannels = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/channels`, { headers: getHeaders() });
      if (res.status === 401) {
        onLogout?.();
        return;
      }
      const data = await res.json();
      console.log('[DEBUG] Channels fetched:', data);
      if (Array.isArray(data)) {
        setChannels(data);
        if (data.length > 0 && !selectedChannel) {
          setSelectedChannel(data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    }
  };

  const fetchDevicesForChannel = async (channelId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/channels/${channelId}/devices`, { headers: getHeaders() });
      const data = await res.json();
      setDevices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchDevicesForChannel(selectedChannel.id);

      // Thiết lập polling 10 giây
      if (pollInterval.current) clearInterval(pollInterval.current);
      pollInterval.current = setInterval(() => {
        fetchDevicesForChannel(selectedChannel.id); // Poll devices instead of schedules
      }, 10000);
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [selectedChannel]);

  const handlePing = async (deviceId: number) => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/devices/${deviceId}/ping`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        // Refresh local device list
        if (selectedChannel) fetchDevicesForChannel(selectedChannel.id);
      }
    } catch (err) {
      console.error('Ping failed:', err);
    }
  };

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.ip_address.includes(searchTerm)
  );

  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 180px)', display: 'flex', gap: '20px' }}>
      {/* Sidebar: Channel List */}
      <div style={{ 
        width: '280px', 
        minWidth: '280px',
        flexShrink: 0,
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '24px', 
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backdropFilter: 'blur(20px)'
      }}>
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc' }}>
            <Radio size={20} color="#818cf8" /> Hệ thống Kênh
          </h3>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }} className="hide-scrollbar">
          {channels.map(channel => (
            <div 
              key={channel.id}
              onClick={() => setSelectedChannel(channel)}
              style={{
                padding: '12px 16px',
                borderRadius: '16px',
                marginBottom: '6px',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: selectedChannel?.id === channel.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                border: `1px solid ${selectedChannel?.id === channel.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent'}`,
                boxShadow: selectedChannel?.id === channel.id ? '0 10px 20px -10px rgba(99, 102, 241, 0.4)' : 'none'
              }}
              className="hover-scale"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ 
                  fontWeight: selectedChannel?.id === channel.id ? 800 : 600, 
                  color: selectedChannel?.id === channel.id ? '#818cf8' : '#94a3b8',
                  fontSize: '0.95rem'
                }}>
                  {channel.name}
                </span>
                {selectedChannel?.id === channel.id && (
                  <Activity size={12} className="text-blue-400 ani-pulse" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Device Monitor */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header Ribbon */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          borderRadius: '20px', 
          border: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
              {selectedChannel ? `Bảng điều khiển: ${selectedChannel.name}` : 'Chọn kênh để bắt đầu'}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>
              {selectedChannel?.description || 'Giám sát và cấu hình các cụm loa trực tiếp theo thời gian thực.'}
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input 
                type="text" 
                placeholder="Tìm loa theo tên hoặc IP..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '10px 15px 10px 40px',
                  color: 'white',
                  width: '280px',
                  outline: 'none'
                }}
              />
            </div>
            <button 
              onClick={() => selectedChannel && fetchDevicesForChannel(selectedChannel.id)}
              className="refresh-btn"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#818cf8',
                transition: 'all 0.3s'
              }}
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        {/* Device Grid */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
          paddingBottom: '20px'
        }}>
          {loading ? (
             <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#94a3b8' }}>
                Đang tải dữ liệu thiết bị...
             </div>
          ) : filteredDevices.length === 0 ? (
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#64748b', background: 'rgba(255,255,255,0.02)', borderRadius: '20px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <Signal size={48} style={{ marginBottom: '15px', opacity: 0.2 }} />
              <p>Không tìm thấy thiết bị nào trong kênh này</p>
            </div>
          ) : (
            filteredDevices.map(device => (
              <div 
                key={device.id}
                className="device-card-premium"
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '20px',
                  padding: '16px 20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Top Row: Icon + Name + Status */}
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div style={{ 
                    width: '42px', height: '42px', 
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.2))',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <Monitor size={22} color="#818cf8" />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <h4 style={{ 
                        margin: 0, 
                        fontSize: '1rem', 
                        fontWeight: 700, 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis' 
                      }}>
                        {device.name}
                      </h4>
                      <div style={{ 
                        flexShrink: 0,
                        background: device.status === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: `1px solid ${device.status === 'online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                      }}>
                        <div style={{ 
                          width: '5px', height: '5px', borderRadius: '50%', 
                          background: device.status === 'online' ? '#10b981' : '#ef4444' 
                        }} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, color: device.status === 'online' ? '#10b981' : '#ef4444' }}>
                          {device.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Globe size={12} /> {device.ip_address}
                    </p>
                  </div>
                </div>

                {/* Middle Row: Single line stat and Vol */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                       <span style={{ fontSize: '0.65rem', color: '#475569', fontWeight: 700 }}>ÂM LƯỢNG: 85%</span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '10px' }}>
                      <div style={{ width: '85%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #818cf8)', borderRadius: '10px' }} />
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button 
                      onClick={() => handlePing(device.id)}
                      title="Kiểm tra kết nối"
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)';
                        e.currentTarget.style.color = '#818cf8';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.color = '#94a3b8';
                      }}
                    >
                      <Activity size={16} />
                    </button>
                    <button 
                      title="Chỉnh âm lượng"
                      style={{
                        padding: '8px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      <Volume2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <style>{`
        .device-card-premium:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3), 0 0 20px rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3) !important;
        }
        .refresh-btn:hover {
          transform: rotate(180deg);
          background: rgba(99, 102, 241, 0.2) !important;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
