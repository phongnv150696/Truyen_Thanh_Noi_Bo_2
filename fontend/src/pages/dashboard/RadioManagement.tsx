import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Radio, 
  Play, 
  Square, 
  Plus, 
  Trash2, 
  Globe, 
  Search,
  AlertCircle,
  Clock,
  ChevronDown
} from 'lucide-react';

const RadioManagement = ({ onLogout }: { onLogout?: () => void }) => {
  const [radios, setRadios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRadio, setNewRadio] = useState({ name: '', url: '', description: '' });
  const [error, setError] = useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingRadio, setSchedulingRadio] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [newSchedule, setNewSchedule] = useState({
    channel_id: '',
    scheduled_time: '',
    repeat_pattern: 'none'
  });

  useEffect(() => {
    fetchRadios();
  }, []);

  const fetchRadios = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:3000/radios`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
      });
      setRadios(response.data);
      setLoading(false);
    } catch (err: any) {
      if (err.response?.status === 401) {
        onLogout?.();
        return;
      }
      console.error('Failed to fetch radios', err);
      setLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await axios.get(`http://${window.location.hostname}:3000/channels`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
      });
      setChannels(response.data);
      if (response.data.length > 0 && !newSchedule.channel_id) {
        setNewSchedule(prev => ({ ...prev, channel_id: response.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  };

  useEffect(() => {
    if (showScheduleModal) {
      fetchChannels();
      // Reset time to next hour
      const nextHour = new Date();
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const tzOffset = nextHour.getTimezoneOffset() * 60000;
      const localISOTime = new Date(nextHour.getTime() - tzOffset).toISOString().slice(0, 16);
      setNewSchedule(prev => ({ ...prev, scheduled_time: localISOTime }));
    }
  }, [showScheduleModal]);

  const handlePlay = async (id: number) => {
    try {
      setPlayingId(id);
      await axios.post(`http://${window.location.hostname}:3000/radios/${id}/play`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
      });
    } catch (err) {
      setError('Không thể kích hoạt đài phát thanh này.');
      setTimeout(() => setError(null), 3000);
      setPlayingId(null);
    }
  };

  const handleStop = async () => {
    try {
      await axios.post(`http://${window.location.hostname}:3000/radios/stop`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
      });
      setPlayingId(null);
    } catch (err) {
      console.error('Failed to stop radio', err);
    }
  };

  const handleAddRadio = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`http://${window.location.hostname}:3000/radios`, newRadio, {
        headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
      });
      setShowAddModal(false);
      setNewRadio({ name: '', url: '', description: '' });
      fetchRadios();
    } catch (err) {
      setError('Lỗi khi thêm đài phát thanh.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đài này?')) return;
    try {
      await axios.delete(`http://${window.location.hostname}:3000/radios/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
      });
      fetchRadios();
    } catch (err) {
      console.error('Failed to delete radio', err);
    }
  };

  const filteredRadios = radios.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const Visualizer = () => (
    <div className="radio-visualizer">
      <div className="visualizer-bar animate-bar-1"></div>
      <div className="visualizer-bar animate-bar-2"></div>
      <div className="visualizer-bar animate-bar-3"></div>
      <div className="visualizer-bar animate-bar-4"></div>
    </div>
  );

  return (
    <div className="radio-container p-8 flex flex-col gap-8">
      <div className="radio-header-card">
        <div className="radio-title-group">
          <div className="radio-icon-wrapper">
            <Radio className="text-blue-400" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Quản lý Internet Radio</h1>
            <p className="text-slate-400">Phát luồng âm thanh trực tiếp tới toàn bộ hệ thống loa</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary"
          style={{ padding: '14px 28px', borderRadius: '18px' }}
        >
          <Plus size={20} /> Thêm đài mới
        </button>
      </div>

      {error && (
        <div className="glass-card p-4 flex items-center gap-3 animate-fade-in" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="premium-search-box">
        <Search size={20} />
        <input 
          type="text" 
          placeholder="Tìm kiếm đài phát..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Grid Danh sách đài */}
      <div className="radio-grid">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="radio-card ani-pulse" style={{ height: '220px' }}></div>
          ))
        ) : filteredRadios.map((radio) => (
          <div 
            key={radio.id} 
            className="radio-card"
            style={playingId === radio.id ? { borderColor: 'rgba(37, 99, 235, 0.6)', boxShadow: '0 0 20px rgba(37, 99, 235, 0.2)' } : {}}
          >
            <div className="radio-card-glow"></div>

            <div className="relative z-10 flex flex-col" style={{ height: '100%' }}>
              <div className="flex justify-between items-start mb-6">
                <div style={{ 
                  padding: '14px', 
                  background: playingId === radio.id ? '#2563eb' : 'rgba(255,255,255,0.05)',
                  borderRadius: '16px',
                  transition: 'all 0.4s'
                }}>
                  <Globe className={playingId === radio.id ? 'text-white' : 'text-blue-400'} size={28} />
                </div>
                <button 
                  onClick={() => handleDelete(radio.id)}
                  className="btn-icon-hover"
                  style={{ background: 'none', border: 'none', color: '#64748b', padding: '8px', cursor: 'pointer' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <h3 className="text-white font-black" style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{radio.name}</h3>
              <p className="text-slate-400" style={{ fontSize: '0.9rem', lineHeight: 1.5, height: '40px', overflow: 'hidden' }}>
                {radio.description || 'Hệ thống truyền thanh trực tuyến kỹ thuật số'}
              </p>

                <div className="flex items-center justify-between mt-auto pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2" style={{ fontSize: '0.7rem', fontWeight: 800, color: playingId === radio.id ? '#4ade80' : '#64748b', letterSpacing: '1px' }}>
                      <div className={playingId === radio.id ? 'ani-ping' : ''} style={{ width: '8px', height: '8px', background: playingId === radio.id ? '#4ade80' : '#475569', borderRadius: '50%' }}></div>
                      {playingId === radio.id ? 'ĐANG PHÁT SÓNG' : 'SẴN SÀNG'}
                    </div>
                    {playingId === radio.id && <Visualizer />}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setSchedulingRadio(radio);
                        setShowScheduleModal(true);
                      }}
                      className="btn-secondary" 
                      style={{ padding: '10px', borderRadius: '12px' }}
                      title="Đặt lịch phát sóng"
                    >
                      <Clock size={18} />
                    </button>

                    {playingId === radio.id ? (
                      <button onClick={handleStop} className="btn-primary" style={{ background: '#ef4444', padding: '10px 20px', borderRadius: '12px' }}>
                        <Square size={16} fill="currentColor" /> DỪNG
                      </button>
                    ) : (
                      <button onClick={() => handlePlay(radio.id)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '12px' }}>
                        <Play size={16} fill="currentColor" /> PHÁT
                      </button>
                    )}
                  </div>
                </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Thêm đài mới (Sử dụng các class premium có sẵn) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <h2 className="text-white font-black text-3xl" style={{ marginBottom: '1.5rem' }}>Thêm đài Radio mới</h2>
              <form onSubmit={handleAddRadio}>
                <div className="premium-form-group">
                  <label className="premium-label">Tên đài phát thanh</label>
                  <input 
                    type="text" required placeholder="Ví dụ: VOV1 - Thời sự"
                    className="premium-input"
                    value={newRadio.name}
                    onChange={e => setNewRadio({...newRadio, name: e.target.value})}
                  />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Stream URL (.m3u8, .mp3, .pls)</label>
                  <input 
                    type="url" required placeholder="http://..."
                    className="premium-input"
                    value={newRadio.url}
                    onChange={e => setNewRadio({...newRadio, url: e.target.value})}
                  />
                </div>
                <div className="premium-form-group">
                  <label className="premium-label">Mô tả ngắn</label>
                  <textarea 
                    className="premium-input" style={{ height: '100px', resize: 'none' }}
                    value={newRadio.description}
                    onChange={e => setNewRadio({...newRadio, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-4" style={{ marginTop: '2rem' }}>
                  <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ flex: 1 }}>Hủy</button>
                  <button type="submit" className="btn-primary" style={{ flex: 1 }}>Lưu đài</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Modal Lập lịch (Thiết kế Compact cao cấp) */}
      <AnimatePresence>
        {showScheduleModal && schedulingRadio && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal-content"
              style={{ maxWidth: '900px', width: '95%' }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-white font-black text-3xl mb-1">Lập lịch phát Radio</h2>
                  <p className="text-slate-400 text-sm">Đài phát: <span className="text-blue-400 font-bold">{schedulingRadio.name}</span></p>
                </div>
                <button 
                  onClick={() => setShowScheduleModal(false)} 
                  className="btn-secondary" 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    padding: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  ✕
                </button>
              </div>

              <div className="glass-card" style={{ padding: '24px', background: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '16px', alignItems: 'flex-end' }}>
                  
                  {/* Chọn Kênh */}
                  <div style={{ flex: 1.5 }}>
                    <label className="premium-label" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>CHỌN KÊNH PHÁT</label>
                    <div className="relative">
                      <select 
                        className="premium-select"
                        value={newSchedule.channel_id}
                        onChange={e => setNewSchedule({...newSchedule, channel_id: e.target.value})}
                      >
                        {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Tần suất */}
                  <div style={{ flex: 1 }}>
                    <label className="premium-label" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>TẦN SUẤT</label>
                    <div className="relative">
                      <select 
                        className="premium-select"
                        value={newSchedule.repeat_pattern}
                        onChange={e => setNewSchedule({...newSchedule, repeat_pattern: e.target.value})}
                      >
                        <option value="none">Một lần</option>
                        <option value="daily">Hàng ngày</option>
                        <option value="weekly">Hàng tuần</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Giờ phát */}
                  <div style={{ flex: 1.2 }}>
                    <label className="premium-label" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>GIỜ PHÁT SÓNG</label>
                    <div className="relative">
                      <input 
                        type="datetime-local"
                        className="premium-input"
                        value={newSchedule.scheduled_time}
                        onChange={e => setNewSchedule({...newSchedule, scheduled_time: e.target.value})}
                        style={{ paddingRight: '12px' }}
                      />
                    </div>
                  </div>

                  {/* Nút lưu */}
                  <button 
                    className="btn-primary btn-glow-indigo"
                    style={{ height: '52px', padding: '0 32px', borderRadius: '16px', fontWeight: 900 }}
                    onClick={async () => {
                      try {
                        const res = await axios.post(`http://${window.location.hostname}:3000/schedules`, {
                          ...newSchedule,
                          radio_id: schedulingRadio.id,
                          content_id: null
                        }, {
                          headers: { Authorization: `Bearer ${localStorage.getItem('openclaw_token')}` }
                        });
                        if (res.status === 201) {
                          alert('Đã đặt lịch phát Radio thành công!');
                          setShowScheduleModal(false);
                        }
                      } catch (err: any) {
                        alert('Lỗi khi lưu lịch: ' + (err.response?.data?.error || 'Máy chủ không phản hồi'));
                      }
                    }}
                  >
                    LƯU LỊCH PHÁT
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .btn-glow-indigo {
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
        }
        .btn-glow-indigo:hover {
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.6);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default RadioManagement;
