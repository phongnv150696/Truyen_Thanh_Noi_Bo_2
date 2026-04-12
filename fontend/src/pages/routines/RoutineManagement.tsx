import React, { useState, useEffect } from 'react';
import { 
  AlarmClock, 
  Moon, 
  Briefcase, 
  Users, 
  Coffee, 
  Upload, 
  Play, 
  Trash2, 
  Calendar,
  Music,
  Clock,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import { useNotification } from '../../components/NotificationProvider';
import { API_URL } from '../../config'

interface RoutineCommand {
  id: number;
  type: string;
  title: string;
  file_path: string | null;
  duration: number | null;
  file_size: string | null;
  updated_at: string;
}

export default function RoutineManagement() {
  const [routines, setRoutines] = useState<RoutineCommand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  const { showNotification } = useNotification();
  
  // New State for Creation
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoutineTitle, setNewRoutineTitle] = useState('');
  const [newRoutineType, setNewRoutineType] = useState('work');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchRoutines = async () => {
    try {
      const res = await fetch(`${API_URL}/routines`, {
        headers: getHeaders()
      });
      if (!res.ok) throw new Error('Không thể tải danh sách hiệu lệnh');
      const data = await res.json();
      setRoutines(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/channels`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setChannels(data);
        if (data.length > 0) setSelectedChannel(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching channels:', err);
    }
  };

  useEffect(() => {
    fetchRoutines();
    fetchChannels();
  }, []);

  const handleFileUpload = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/routines/${id}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': getHeaders().Authorization
        },
        body: formData
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi tải lên');
      }

      await fetchRoutines();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlayNow = async (id: number) => {
    if (!selectedChannel) {
      showNotification('info', 'Vui lòng chọn kênh phát');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/routines/${id}/play`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ channel_id: selectedChannel })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi khi phát');
      }
      
      showNotification('success', 'Đã bắt đầu phát hiệu lệnh');
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleDeleteFile = async (id: number) => {
    if (!(await confirm('Bạn có chắc chắn muốn xóa file âm thanh này?'))) return;

    try {
      const res = await fetch(`${API_URL}/routines/${id}/file`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) throw new Error('Lỗi khi xóa');
      await fetchRoutines();
      showNotification('success', 'Đã xóa file âm thanh');
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const handleCreateRoutine = async () => {
    if (!newRoutineTitle) {
      showNotification('info', 'Vui lòng nhập tên hiệu lệnh');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`${API_URL}/routines`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newRoutineTitle, type: newRoutineType })
      });

      if (!res.ok) throw new Error('Không thể tạo hiệu lệnh');
      
      setNewRoutineTitle('');
      setIsModalOpen(false);
      await fetchRoutines();
      showNotification('success', `Đã tạo hiệu lệnh "${newRoutineTitle}"`);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoutine = async (id: number, title: string) => {
    if (!(await confirm(`XÓA CẢNH BÁO: Bạn có chắc chắn muốn xóa HOÀN TOÀN hiệu lệnh "${title}"? Việc này sẽ xóa cả file âm thanh và tất cả lịch phát tự động của hiệu lệnh này.`))) return;

    try {
      const res = await fetch(`${API_URL}/routines/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });

      if (!res.ok) throw new Error('Lỗi khi xóa hiệu lệnh');
      await fetchRoutines();
      showNotification('success', `Đã xóa hiệu lệnh "${title}"`);
    } catch (err: any) {
      showNotification('error', err.message);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'alarm': return <AlarmClock size={28} />;
      case 'sleep': return <Moon size={28} />;
      case 'work': return <Briefcase size={28} />;
      case 'rollcall': return <Users size={28} />;
      case 'break': return <Coffee size={28} />;
      default: return <Music size={28} />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'alarm': return '#f59e0b'; // Amber
      case 'sleep': return '#818cf8'; // Indigo
      case 'work': return '#10b981'; // Emerald
      case 'rollcall': return '#ec4899'; // Pink
      case 'break': return '#06b6d4'; // Cyan
      default: return '#6366f1';
    }
  };

  if (isLoading && routines.length === 0) return <div className="p-8 text-center">Đang tải...</div>;

  return (
    <div className="routine-management ani-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, margin: 0, letterSpacing: '-1px' }}>Hiệu lệnh làm việc</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.5rem' }}>Quản lý và phát các hiệu lệnh báo thức, làm việc, sinh hoạt hàng ngày.</p>
        </div>
        
        <div className="glass-card" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '15px', borderRadius: '20px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>KÊNH PHÁT MẶC ĐỊNH:</span>
          <select 
            value={selectedChannel || ''} 
            onChange={(e) => setSelectedChannel(Number(e.target.value))}
            className="premium-select"
            style={{ minWidth: '200px' }}
          >
            {channels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', color: '#ef4444', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={20} /> {error}
        </div>
      )}

      <div className="radio-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '2rem' }}>
        {routines.map((routine) => (
          <div key={routine.id} className="radio-card ani-scale-in" style={{ padding: '2rem' }}>
            <div className="radio-card-glow" style={{ background: `radial-gradient(circle at 50% 120%, ${getColor(routine.type)}22 0%, transparent 60%)` }} />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                background: `${getColor(routine.type)}11`, 
                borderRadius: '20px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: getColor(routine.type),
                border: `1px solid ${getColor(routine.type)}33`
              }}>
                {getIcon(routine.type)}
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    fontWeight: 900, 
                    background: routine.file_path ? `${getColor(routine.type)}22` : 'rgba(255,255,255,0.05)', 
                    color: routine.file_path ? getColor(routine.type) : '#475569', 
                    padding: '4px 12px', 
                    borderRadius: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {routine.file_path ? 'SẴN SÀNG' : 'CHƯA CÓ FILE'}
                  </span>
                </div>
                <button 
                  onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                  style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                  title="Xóa hiệu lệnh hoàn toàn"
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', position: 'relative', zIndex: 1 }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>{routine.title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', color: '#64748b', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> {formatDuration(routine.duration)}
                </div>
                <span>•</span>
                <div>{routine.file_size || '0.00 MB'}</div>
              </div>
            </div>

            <div className="dropdown-divider" style={{ margin: '1.5rem 0' }} />

            <div style={{ display: 'flex', gap: '10px', position: 'relative', zIndex: 1 }}>
              <button 
                onClick={() => handlePlayNow(routine.id)}
                disabled={!routine.file_path}
                className="btn-primary hover-scale"
                style={{ 
                  flex: 1, 
                  height: '42px', 
                  background: routine.file_path ? `linear-gradient(135deg, ${getColor(routine.type)}, ${getColor(routine.type)}cc)` : 'rgba(255,255,255,0.05)',
                  opacity: routine.file_path ? 1 : 0.5,
                  cursor: routine.file_path ? 'pointer' : 'not-allowed'
                }}
              >
                <Play size={18} fill="currentColor" /> Phát ngay
              </button>

              <button 
                onClick={() => {
                   // Dispatch event for scheduling
                   const event = new CustomEvent('openRoutineSchedule', { 
                     detail: { routineId: routine.id, title: routine.title } 
                   });
                   window.dispatchEvent(event);
                }}
                disabled={!routine.file_path}
                className="btn-secondary"
                style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center' }}
                title="Lên lịch phát"
              >
                <Calendar size={18} />
              </button>

              <label className="btn-secondary" style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center', cursor: 'pointer' }} title={routine.file_path ? "Thay thế file" : "Tải lên file"}>
                <Upload size={18} />
                <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={(e) => handleFileUpload(routine.id, e)} />
              </label>

              {routine.file_path && (
                <button 
                  onClick={() => handleDeleteFile(routine.id)}
                  className="btn-secondary" 
                  style={{ width: '42px', height: '42px', padding: 0, justifyContent: 'center', color: '#f87171' }}
                  title="Xóa file âm thanh"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Add New Routine Card */}
        <div 
          onClick={() => setIsModalOpen(true)}
          className="radio-card ani-scale-in" 
          style={{ 
            padding: '2rem', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '1.5rem',
            border: '2px dashed rgba(255,255,255,0.05)',
            cursor: 'pointer',
            minHeight: '300px'
          }}
        >
          <div style={{ width: '60px', height: '60px', background: 'rgba(99,102,241,0.05)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <Plus size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Thêm hiệu lệnh</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '5px' }}>Tạo thêm tín hiệu báo giờ, sinh hoạt...</p>
          </div>
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="modal-overlay ani-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content ani-slide-up" style={{ maxWidth: '500px', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900 }}>Thêm hiệu lệnh mới</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="premium-form-group">
              <label className="premium-label">Tên hiệu lệnh</label>
              <input 
                type="text" 
                className="premium-input" 
                placeholder="Ví dụ: Hiệu lệnh báo giờ, Chào cờ..."
                value={newRoutineTitle}
                onChange={e => setNewRoutineTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="premium-form-group" style={{ marginTop: '1.5rem' }}>
              <label className="premium-label">Danh mục (Biểu tượng)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {[
                  { id: 'work', title: 'Làm việc', icon: <Briefcase size={18} /> },
                  { id: 'alarm', title: 'Báo thức', icon: <AlarmClock size={18} /> },
                  { id: 'sleep', title: 'Đi ngủ', icon: <Moon size={18} /> },
                  { id: 'rollcall', title: 'Điểm danh', icon: <Users size={18} /> },
                  { id: 'break', title: 'Giải lao', icon: <Coffee size={18} /> },
                  { id: 'other', title: 'Khác', icon: <Music size={18} /> }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setNewRoutineType(cat.id)}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      background: newRoutineType === cat.id ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                      border: newRoutineType === cat.id ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.05)',
                      color: newRoutineType === cat.id ? '#818cf8' : '#64748b',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat.icon}
                    {cat.title}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '2.5rem' }}>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="btn-secondary" 
                style={{ flex: 1 }}
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleCreateRoutine}
                disabled={isSubmitting}
                className="btn-primary" 
                style={{ flex: 2 }}
              >
                {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card" style={{ marginTop: '3rem', padding: '2.5rem', background: 'rgba(99, 102, 241, 0.03)', border: '1px dashed rgba(99, 102, 241, 0.2)' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
            <AlertCircle size={30} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Hướng dẫn sử dụng Hiệu lệnh</h4>
            <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
              Tải lên file âm thanh (MP3/WAV) cho từng loại hiệu lệnh để sẵn sàng sử dụng. Bạn có thể phát trực tiếp ngay lập tức hoặc sử dụng chức năng <strong>Lên lịch</strong> để hệ thống tự động phát vào khung giờ cố định mỗi ngày hoặc mỗi tuần (Báo thức sáng, Báo giờ đi ngủ...).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
