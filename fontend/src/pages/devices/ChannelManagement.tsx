import { useState, useEffect, useRef } from 'react';
import { 
  Radio as RadioIcon,
  RefreshCw,
  Building2,
  CircleDot,
  ChevronRight,
  ChevronDown,
  Speaker,
  Activity
} from 'lucide-react';

interface Device {
  id: number;
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  ip_address?: string;
}

interface Channel {
  id: number;
  name: string;
  unit_id: number;
  unit_name?: string;
  status?: string;
  isLive?: boolean;
  activeBroadcast?: any;
  deviceCount?: number;
}

interface Unit {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
}

import { API_URL, WEBSOCKET_URL } from '../../config'

interface ChannelManagementProps {
  user?: any;
}

export default function ChannelManagement({ user }: ChannelManagementProps) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedUnitIds, setExpandedUnitIds] = useState<number[]>([]);
  const [expandedChannelId, setExpandedChannelId] = useState<number | null>(null);
  const [channelDevices, setChannelDevices] = useState<{ [key: number]: Device[] }>({});
  const [loadingDevices, setLoadingDevices] = useState<number | null>(null);

  // Monitor state (WebSocket)
  const [activeBroadcasts, setActiveBroadcasts] = useState<{ [key: number]: any }>({});
  const wsRef = useRef<WebSocket | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return { 'Authorization': token ? `Bearer ${token}` : '' };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [chanRes, unitRes] = await Promise.all([
        fetch(`${API_URL}/channels`, { headers: getHeaders() }),
        fetch(`${API_URL}/users/units`, { headers: getHeaders() }) // Corrected path from userRoutes
      ]);

      const [chanData, unitData] = await Promise.all([chanRes.json(), unitRes.json()]);
      
      setChannels(Array.isArray(chanData) ? chanData : []);
      setUnits(Array.isArray(unitData) ? unitData : []);

      // Auto-expand all units initially
      if (Array.isArray(unitData)) {
        setExpandedUnitIds(unitData.map(u => u.id));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannelDevices = async (channelId: number) => {
    if (expandedChannelId === channelId) {
      setExpandedChannelId(null);
      return;
    }

    setExpandedChannelId(channelId);
    if (channelDevices[channelId]) return;

    setLoadingDevices(channelId);
    try {
      const res = await fetch(`${API_URL}/channels/${channelId}/devices`, { headers: getHeaders() });
      const data = await res.json();
      setChannelDevices(prev => ({ ...prev, [channelId]: Array.isArray(data) ? data : [] }));
    } catch (e) {
      console.error(e);
    } finally {
      // Done loading
    }
  };

  useEffect(() => {
    fetchData();

    // Setup WebSocket Monitor
    const ws = new WebSocket(WEBSOCKET_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'identify', channel_id: 0, device_id: 999, isBrowser: true }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'broadcast-start') {
          setActiveBroadcasts(prev => ({ ...prev, [data.channel_id || 1]: data }));
        } else if (data.type === 'broadcast-stop') {
          setActiveBroadcasts(prev => {
            const next = { ...prev };
            delete next[data.channel_id || 1];
            return next;
          });
        }
      } catch (e) {}
    };

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleAddChannel = async (unitId: number) => {
    const name = prompt('Nhập tên kênh mới:');
    if (!name?.trim()) return;

    try {
      const res = await fetch(`${API_URL}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ name: name.trim(), unit_id: unitId })
      });
      if (res.ok) await fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const groupChannelsByUnit = () => {
    const grouped: { [key: number]: Channel[] } = {};
    channels.forEach(chan => {
      const uid = chan.unit_id || 0;
      if (!grouped[uid]) grouped[uid] = [];
      grouped[uid].push(chan);
    });
    return grouped;
  };

  const groupedChannels = groupChannelsByUnit();
  
  // Filter units strictly to only show those that:
  // 1. Have active channels (the list is already scoped by backend to descendants)
  // 2. OR reflect the user's management level (Level of the user's own unit or below)
  const userUnitLevel = user?.unit_level || user?.level || 1; 
  const manageableUnits = units.filter(u => groupedChannels[u.id] || u.level >= userUnitLevel);

  // For Hierarchical display: Group units by their level
  // If user is Level 1, we show Level 2 as main sections, with Level 3+ nested
  const rootUnits = manageableUnits.filter(u => u.level === userUnitLevel);
  const getSubUnits = (parentId: number) => manageableUnits.filter(u => u.parent_id === parentId);

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Điều hành Kênh & Hệ thống Loa</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Hợp nhất quản lý thiết bị và giám sát trạng thái phát sóng theo từng Tiểu đoàn.</p>
        </div>
        <button 
          onClick={fetchData}
          className="btn-secondary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px' }}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới toàn bộ</span>
        </button>
      </div>

      {loading && channels.length === 0 ? (
        <div style={{ padding: '8rem', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={48} className="animate-spin" style={{ opacity: 0.2, marginBottom: '1.5rem' }} />
          <p style={{ fontSize: '1.2rem' }}>Đang đồng bộ dữ liệu hệ thống...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {rootUnits.length === 0 && !loading && (
            <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Building2 size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>Không có đơn vị nào thuộc phạm vi quản lý của bạn.</p>
            </div>
          )}

          {rootUnits.map(unit => {
            const unitChannels = groupedChannels[unit.id] || [];
            const subUnits = getSubUnits(unit.id);
            const isExpanded = expandedUnitIds.includes(unit.id);

            return (
              <div key={unit.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', border: isExpanded ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                {/* Unit Header */}
                <div 
                  onClick={() => setExpandedUnitIds(prev => isExpanded ? prev.filter(id => id !== unit.id) : [...prev, unit.id])}
                  style={{ 
                    padding: '1rem 1.5rem',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{ color: '#6366f1', opacity: 0.7 }}><Building2 size={20} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{unit.name}</h2>
                      <span style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>Cấp {unit.level}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>{unitChannels.length} kênh</span>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: '0.5rem 1.5rem 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                    {/* Channels of this unit */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem' }}>
                      {unitChannels.length === 0 && subUnits.length === 0 && (
                        <p style={{ color: '#475569', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Đơn vị này chưa có kênh phát hoặc đơn vị trực thuộc.</p>
                      )}
                      
                      {unitChannels.map(channel => {
                        const isLive = !!activeBroadcasts[channel.id];
                        const isSelected = expandedChannelId === channel.id;
                        return (
                          <div key={channel.id} style={{ borderRadius: '10px', overflow: 'hidden' }}>
                            <div 
                              className={`hover-glow ${isLive ? 'border-live' : ''}`}
                              style={{ 
                                padding: '0.8rem 1rem', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '12px',
                                cursor: 'pointer',
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderLeft: isLive ? '3px solid #ef4444' : '3px solid transparent'
                              }}
                              onClick={() => fetchChannelDevices(channel.id)}
                            >
                              <div style={{ color: isLive ? '#ef4444' : '#64748b' }}>
                                {isLive ? <Activity size={18} className="animate-pulse" /> : <RadioIcon size={18} />}
                              </div>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: isLive ? '#f8fafc' : '#cbd5e1' }}>{channel.name}</h4>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: channel.status === 'online' || isLive ? '#10b981' : '#f87171' }}>
                                  <CircleDot size={8} fill={channel.status === 'online' || isLive ? '#10b981' : '#f87171'} />
                                  <span>{isLive ? 'PHÁT' : 'SẴN SÀNG'}</span>
                                </div>
                                {isSelected ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              </div>
                            </div>

                            {isSelected && (
                              <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                                {loadingDevices === channel.id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem', padding: '0.5rem' }}>
                                    <RefreshCw size={14} className="animate-spin" />
                                    <span>Đang lấy danh sách thiết bị...</span>
                                  </div>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.8rem' }}>
                                    {(channelDevices[channel.id] || []).map(dev => (
                                      <div key={dev.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.02)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <Speaker size={14} style={{ color: dev.status === 'online' ? '#10b981' : '#475569' }} />
                                          <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{dev.name}</span>
                                        </div>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: dev.status === 'online' ? '#10b981' : '#f87171' }} />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Nested Subunits (Đại đội) */}
                    {subUnits.length > 0 && (
                      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 0 0.5rem 0' }} />
                        <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 900, color: '#475569', letterSpacing: '1px', textTransform: 'uppercase' }}>Đơn vị trực thuộc</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                          {subUnits.map(sub => {
                            const subChannels = groupedChannels[sub.id] || [];
                            return (
                              <div key={sub.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                  <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#f1f5f9' }}>{sub.name}</h5>
                                  <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{subChannels.length} kênh</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {subChannels.map(chan => (
                                    <div key={chan.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <RadioIcon size={12} />
                                        <span>{chan.name}</span>
                                      </div>
                                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: chan.status === 'online' ? '#10b981' : '#f87171' }} />
                                    </div>
                                  ))}
                                  {subChannels.length === 0 && <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569' }}>Chưa thiết lập kênh</p>}
                                </div>
                                <button onClick={() => handleAddChannel(sub.id)} style={{ marginTop: '0.8rem', width: '100%', padding: '6px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '6px', cursor: 'pointer' }}>+ Thêm kênh</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button 
                      onClick={() => handleAddChannel(unit.id)}
                      style={{ marginTop: '1rem', width: '100%', padding: '10px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', color: '#64748b', borderRadius: '10px', cursor: 'pointer' }}
                    >
                      + Thêm kênh cho {unit.name}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .hover-glow:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .border-live {
          border-left: 5px solid #ef4444 !important;
          background: rgba(239, 68, 68, 0.03) !important;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-slide-down {
          animation: slideDown 0.3s ease-out;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .btn-add-dashed:hover {
          background: rgba(255,255,255,0.03) !important;
          color: white !important;
          border-color: rgba(99, 102, 241, 0.5) !important;
        }
      `}</style>
    </div>
  );
}
