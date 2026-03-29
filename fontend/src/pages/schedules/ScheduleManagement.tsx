import { useState, useEffect } from 'react';
import {
  Calendar,
  Radio,
  Search,
  RefreshCw,
  Trash2,
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
  ChevronRight,
  Music,
  User,
  MoreVertical,
  X,
  Save,
  Edit3
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:3000`;

interface ScheduleEntry {
  schedule_id: number;
  scheduled_time: string;
  channel_id: number;
  channel_name: string;
  mount_point: string;
  duration: string;
  repeat_pattern: string;
  is_active: boolean;
  triggered_at: string | null;
  play_status: 'played' | 'pending' | 'overdue';
}

interface GroupedContent {
  content_id: number | null;
  radio_id?: number | null;
  content_title: string;
  author_name: string | null;
  has_audio: boolean;
  schedules: ScheduleEntry[];
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
  author_name?: string;
}

interface FlatSchedule {
  id: number;
  scheduled_time: string;
  duration: string;
  repeat_pattern: string;
  is_active: boolean;
  channel_id: number;
  channel_name: string;
  mount_point: string;
  content_id: number | null;
  radio_id?: number | null;
  radio_name?: string | null;
  content_title: string;
  author_name?: string;
  has_audio: boolean;
  triggered_at?: string | null;
  play_status?: string;
}

// ── Sub-component: Popup 👁 xem giờ phát ──────────────────────────────────────
function ScheduleDetailPopup({
  item,
  channels,
  onClose,
  onAddSlot,
  onUpdateSlot,
  onDeleteSlot,
  onPlayNow,
  isReadOnly = false,
  selectedDate = 'all'
}: {
  item: GroupedContent;
  channels: Channel[];
  onClose: () => void;
  onAddSlot: (contentId: number | null, channelId: number, scheduledTime: string, repeatPattern: string, radioId?: number | null, duration?: number) => Promise<void>;
  onUpdateSlot: (scheduleId: number, channelId: number, scheduledTime: string, repeatPattern: string, duration?: number) => Promise<void>;
  onDeleteSlot: (scheduleId: number) => Promise<void>;
  onPlayNow: (scheduleId: number) => Promise<void>;
  isReadOnly?: boolean;
  selectedDate?: string;
}) {
  const [newChannelId, setNewChannelId] = useState(channels[0]?.id || 0);
  const [newTime, setNewTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newRepeat, setNewRepeat] = useState('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const extractTime = (iso: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    } catch (e) {
      return '';
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'played') return (
      <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '0.65rem', fontWeight: 800, border: '1px solid rgba(16,185,129,0.1)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <CheckCircle2 size={10} /> Đã phát
      </span>
    );
    if (status === 'overdue') return (
      <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.65rem', fontWeight: 800, border: '1px solid rgba(239,68,68,0.1)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <XCircle size={10} /> Bỏ lỡ
      </span>
    );
    return (
      <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', fontSize: '0.65rem', fontWeight: 800, border: '1px solid rgba(245,158,11,0.1)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Clock size={10} /> Chờ phát
      </span>
    );
  };

  const handleSave = async () => {
    if (!newTime || !newChannelId) return;

    // Check if time is in the past for today
    const now = new Date();
    const scheduledDateObj = new Date(newTime);
    if (scheduledDateObj < now) {
      alert(`Không thể đặt lịch phát trong quá khứ (${scheduledDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}). Vui lòng chọn giờ lớn hơn giờ hiện tại (${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).`);
      return;
    }

    let duration = 0;
    if (newEndTime) {
      try {
        const datePart = newTime.includes('T') ? newTime.split('T')[0] : new Date().toISOString().split('T')[0];
        const start = new Date(newTime).getTime();
        const [h, m] = newEndTime.split(':').map(Number);
        const end = new Date(datePart).setHours(h, m, 0, 0);
        
        if (end <= start) {
          alert("Giờ kết thúc phải lớn hơn giờ bắt đầu.");
          return;
        }
        duration = Math.floor((end - start) / 1000);
      } catch (err) {
        console.error("Invalid end time format", err);
      }
    }

    setSubmitting(true);
    if (editingId) {
      await onUpdateSlot(editingId, newChannelId, newTime, newRepeat, duration);
      setEditingId(null);
    } else {
      await onAddSlot(item.content_id, newChannelId, newTime, newRepeat, item.radio_id, duration);
    }
    setNewTime('');
    setNewEndTime('');
    setSubmitting(false);
  };

  const startEdit = (s: ScheduleEntry) => {
    setEditingId(s.schedule_id);
    setNewChannelId(s.channel_id);
    setNewRepeat(s.repeat_pattern);
    setNewTime(s.scheduled_time);
    if (s.duration) {
      const start = new Date(s.scheduled_time);
      const durationNum = Number(s.duration);
      const end = new Date(start.getTime() + (isNaN(durationNum) ? 0 : durationNum) * 1000);
      const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
      setNewEndTime(endStr);
    } else {
      setNewEndTime('');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewTime('');
    setNewEndTime('');
    setNewRepeat('none');
    setNewChannelId(channels[0]?.id || 0);
  };

  const isScheduledOnDate = (s: { scheduled_time: string, repeat_pattern: string }, targetDate: string) => {
    const sDate = s.scheduled_time.split('T')[0];
    if (sDate === targetDate) return true;
    if (s.repeat_pattern === 'daily') return sDate <= targetDate;
    if (s.repeat_pattern === 'weekly') {
      const sDay = new Date(sDate).getDay();
      const targetDay = new Date(targetDate).getDay();
      return sDate <= targetDate && sDay === targetDay;
    }
    return false;
  };

  const byChannel: Record<string, ScheduleEntry[]> = {};
  const dateToFilter = (selectedDate && selectedDate !== 'all') ? selectedDate : null;

  const filteredSchedules = (dateToFilter
    ? item.schedules.filter(s => isScheduledOnDate(s, dateToFilter))
    : item.schedules).sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

  for (const s of filteredSchedules) {
    const key = s.channel_name || 'Kênh không xác định';
    if (!byChannel[key]) byChannel[key] = [];
    byChannel[key].push(s);
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'rgba(15,23,42,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', width: '100%', maxWidth: '640px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)' }}>
        {/* Header */}
        <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px', opacity: 0.8 }}>CHI TIẾT LỊCH PHÁT</div>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>{item.content_title}</h3>
            {item.author_name && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: '#94a3b8', fontSize: '0.85rem' }}>
                <User size={13} style={{ opacity: 0.7 }} /> {item.author_name}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px', borderRadius: '15px', cursor: 'pointer' }}>
            <XCircle size={20} />
          </button>
        </div>

        {/* Edit Section */}
        {!isReadOnly && (
          <div style={{ padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: editingId ? 'rgba(245,158,11,0.03)' : 'rgba(99,102,241,0.03)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Kênh phát sóng</label>
                <select value={newChannelId} onChange={e => setNewChannelId(parseInt(e.target.value))} className="premium-select" style={{ width: '100%', height: '42px' }}>
                  {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Tần suất lặp</label>
                <select value={newRepeat} onChange={e => setNewRepeat(e.target.value)} className="premium-select" style={{ width: '100%', height: '42px' }}>
                  <option value="none">Một lần</option>
                  <option value="daily">Hàng ngày</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Giờ Bắt đầu</label>
                <input type="time" required value={extractTime(newTime)} onChange={e => {
                  const time = e.target.value;
                  const baseDate = (selectedDate && selectedDate !== 'all') ? selectedDate : new Date().toISOString().split('T')[0];
                  setNewTime(`${baseDate}T${time}:00`);
                }} className="premium-input" style={{ width: '100%', height: '42px' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.65rem', color: '#818cf8', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Giờ Kết thúc (Tùy chọn)</label>
                <input type="time" value={newEndTime} onChange={e => setNewEndTime(e.target.value)} className="premium-input" style={{ width: '100%', height: '42px', borderColor: 'rgba(129,140,248,0.3)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={handleSave} disabled={submitting || !newTime} className={`hover-scale ${editingId ? 'btn-glow-gold' : 'btn-glow-indigo'}`} style={{ flex: 2, height: '42px', background: editingId ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' : 'linear-gradient(135deg,#6366f1,#a855f7)', border: 'none', borderRadius: '12px', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
                {submitting ? <RefreshCw size={16} className="animate-spin" /> : editingId ? <Save size={18} /> : <Plus size={18} />} 
                {editingId ? 'Cập nhật khung giờ' : 'Thêm khung giờ'}
              </button>
              {editingId && (
                <button onClick={cancelEdit} className="hover-scale" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#94a3b8', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <X size={16} /> Hủy
                </button>
              )}
            </div>
          </div>
        )}

        {/* List Section */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 32px' }}>
          {Object.keys(byChannel).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#475569' }}>
              <Clock size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Chưa có khung giờ nào được lập lịch.</p>
            </div>
          ) : (
            Object.entries(byChannel).map(([channelName, slots]) => (
              <div key={channelName} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Radio size={14} color="#6366f1" />
                  <span style={{ fontWeight: 700, color: '#818cf8', fontSize: '0.9rem' }}>{channelName}</span>
                  <span style={{ fontSize: '0.7rem', color: '#475569' }}>({slots.length} khung giờ)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '22px' }}>
                  {slots.map(s => (
                    <div key={s.schedule_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.04)' }} className="hover-scale glass-glow">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ padding: '8px 12px', background: 'rgba(99,102,241,0.06)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ fontWeight: 800, color: '#818cf8', fontSize: '0.95rem' }}>{extractTime(s.scheduled_time)}</div>
                          <div style={{ width: '10px', height: '1px', background: 'rgba(129,140,248,0.3)' }}></div>
                          <div style={{ fontWeight: 800, color: s.duration && parseInt(s.duration) > 0 ? '#10b981' : '#475569', fontSize: '0.95rem' }}>
                             {s.duration && parseInt(s.duration) > 0 
                               ? new Date(new Date(s.scheduled_time).getTime() + parseInt(s.duration) * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                               : '--:--'}
                          </div>
                        </div>
                        {getStatusBadge(s.play_status)}
                      </div>
                      {!isReadOnly && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => startEdit(s)} className="hover-scale" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => onPlayNow(s.schedule_id)} className="hover-scale" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Play size={13} fill="#10b981" />
                          </button>
                          <button onClick={() => onDeleteSlot(s.schedule_id)} className="hover-scale" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ScheduleManagement({ onLogout }: { onLogout?: () => void }) {
  const [groupedContents, setGroupedContents] = useState<GroupedContent[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Popup state
  const [viewingDetailOnly, setViewingDetailOnly] = useState(false);
  const [viewingItem, setViewingItem] = useState<GroupedContent | null>(null);

  // Create Schedule Modal state (for header button)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSchedule, setNewSchedule] = useState<any>({
    channel_id: '',
    content_id: '',
    scheduled_time: '',
    repeat_pattern: 'none',
    end_time: ''
  });
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [isContentListOpen, setIsContentListOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  // Menu state (⋮)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return { 'Authorization': token ? `Bearer ${token}` : '' };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, chanRes, contRes, emRes] = await Promise.all([
        fetch(`${API_URL}/schedules`, { headers: getHeaders() }),
        fetch(`${API_URL}/channels`, { headers: getHeaders() }),
        fetch(`${API_URL}/content?status=approved`, { headers: getHeaders() }),
        fetch(`${API_URL}/schedules/emergency/status`, { headers: getHeaders() })
      ]);

      // Check schedule API response explicitly
      if (!schedRes.ok) {
        if (schedRes.status === 401) {
          onLogout?.();
          return;
        }
        const errBody = await schedRes.json().catch(() => ({}));
        const msg = errBody.error || errBody.message || `HTTP ${schedRes.status}`;
        setError(`Không thể tải lịch phát: ${msg} (HTTP ${schedRes.status})`);
        setGroupedContents([]);
        setLoading(false);
        return;
      }

      const schedData = await schedRes.json();
      const chans = await chanRes.json();
      const conts = await contRes.json();
      if (emRes.ok) { const em = await emRes.json(); setIsEmergencyActive(em.active); }

      console.log('[Schedules] flat schedules count:', Array.isArray(schedData) ? schedData.length : 'NOT ARRAY', schedData);

      // Group flat list by content_id client-side
      const flatList: FlatSchedule[] = Array.isArray(schedData) ? schedData : [];

      if (!Array.isArray(schedData)) {
        setError(`API trả về dữ liệu không hợp lệ: ${JSON.stringify(schedData).substring(0, 100)}`);
      }

      const map = new Map<string, GroupedContent>();
      for (const s of flatList) {
        const groupKey = s.content_id ? `c${s.content_id}` : `r${s.radio_id}`;
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            content_id: s.content_id,
            radio_id: s.radio_id,
            content_title: s.radio_name ? `Radio: ${s.radio_name}` : (s.content_title || 'Nội dung không tên'),
            author_name: s.author_name || null,
            has_audio: s.has_audio,
            schedules: []
          });
        }
        const now = new Date();
        const sTime = new Date(s.scheduled_time);
        let play_status: 'played' | 'pending' | 'overdue' = 'pending';
        if (s.triggered_at) play_status = 'played';
        else if (now.getTime() - sTime.getTime() > 2 * 60 * 1000) play_status = 'overdue';

        map.get(groupKey)!.schedules.push({
          schedule_id: s.id,
          scheduled_time: s.scheduled_time,
          channel_id: s.channel_id,
          channel_name: s.channel_name || 'Kênh không xác định',
          mount_point: s.mount_point || '',
          duration: s.duration || '',
          repeat_pattern: s.repeat_pattern || 'none',
          is_active: s.is_active,
          triggered_at: s.triggered_at || null,
          play_status
        });
      }

      const grouped = Array.from(map.values());
      console.log('[Schedules] grouped:', grouped.length, 'items');
      setGroupedContents(grouped);
      setChannels(Array.isArray(chans) ? chans : []);
      setContents(Array.isArray(conts) ? conts : []);
    } catch (err) {
      console.error('[Schedules] Error:', err);
      setError('Lỗi kết nối đến máy chủ. Vui lòng thử lại.');
      setGroupedContents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const host = window.location.hostname || 'localhost';
    const socket = new WebSocket(`ws://${host}:3000/ws`);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'emergency_status_change') setIsEmergencyActive(data.active);
        if (data.type === 'broadcast-start') fetchData();
      } catch { }
    };
    return () => socket.close();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.schedule-action-menu')) setMenuOpenId(null);
      if (!target.closest('.content-search-container')) setIsContentListOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePlayNow = async (scheduleId: number) => {
    if (!confirm('Bạn có chắc chắn muốn phát khung giờ này ngay lập tức?')) return;
    setProcessingId(scheduleId);
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}/play`, { method: 'POST', headers: getHeaders() });
      if (res.ok) {
        alert('Đã gửi lệnh phát sóng thành công!');
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        alert('Lỗi: ' + (e.error || 'Máy chủ phục vụ từ chối lệnh phát.'));
      }
    } catch { alert('Lỗi kết nối máy chủ'); }
    finally { setProcessingId(null); }
  };

  const handlePlayAllChannels = async (contentId: number | null, radioId?: number | null) => {
    if (!confirm('Bạn có chắc chắn muốn phát nội dung này trên TẤT CẢ các kênh có lịch trong hôm nay?')) return;
    const groupKey = contentId ? `c${contentId}` : `r${radioId}`;
    if (!groupKey) return;
    setProcessingId(groupKey);
    try {
      const url = contentId
        ? `${API_URL}/schedules/content/${contentId}/play-all`
        : `${API_URL}/schedules/radio/${radioId}/play-all`;
      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Đã gửi lệnh phát sóng đa kênh thành công!');
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        alert('Lỗi: ' + (e.error || 'Máy chủ từ chối lệnh phát.'));
      }
    } catch { alert('Lỗi kết nối máy chủ'); }
    finally { setProcessingId(null); }
  };

  const handleDeleteContent = async (contentId: number | null, radioId?: number | null) => {
    const groupKey = contentId ? `c${contentId}` : `r${radioId}`;
    const item = groupedContents.find(g => (g.content_id ? `c${g.content_id}` : `r${g.radio_id}`) === groupKey);
    if (!item) return;
    if (!confirm(`Xóa toàn bộ ${item.schedules.length} lịch phát của "${item.content_title}"?`)) return;
    try {
      const ids = item.schedules.map(s => s.schedule_id);
      await fetch(`${API_URL}/schedules/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify({ ids })
      });
      setGroupedContents(prev => prev.filter(g => (g.content_id ? `c${g.content_id}` : `r${g.radio_id}`) !== groupKey));
    } catch { setError('Lỗi kết nối khi xóa.'); }
  };

  const onAddSlot = async (contentId: number | null, channelId: number, scheduledTime: string, repeatPattern: string, radioId?: number | null, duration?: number) => {
    try {
      const res = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          content_id: contentId,
          radio_id: radioId,
          scheduled_time: scheduledTime,
          repeat_pattern: repeatPattern,
          duration: duration
        })
      });
      if (res.ok) {
        await fetchData();
        // Update viewingItem if any
        if (viewingItem) {
          const newData = await (await fetch(`${API_URL}/schedules`, { headers: getHeaders() })).json();
          const flatList: FlatSchedule[] = Array.isArray(newData) ? newData : [];
          updateViewingItem(flatList, viewingItem.content_id, viewingItem.radio_id);
        }
      }
    } catch (err) {
      console.error('Add failed', err);
    }
  };

  const onUpdateSlot = async (scheduleId: number, channelId: number, scheduledTime: string, repeatPattern: string, duration?: number) => {
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          scheduled_time: scheduledTime,
          repeat_pattern: repeatPattern,
          duration: duration
        })
      });
      if (res.ok) {
        await fetchData();
        if (viewingItem) {
          const newData = await (await fetch(`${API_URL}/schedules`, { headers: getHeaders() })).json();
          const flatList: FlatSchedule[] = Array.isArray(newData) ? newData : [];
          updateViewingItem(flatList, viewingItem.content_id, viewingItem.radio_id);
        }
      }
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const updateViewingItem = (flatList: FlatSchedule[], contentId: number | null, radioId?: number | null) => {
    // Re-group just for the content we care about
    const map = new Map<string, GroupedContent>();
    const targetKey = contentId ? `c${contentId}` : `r${radioId}`;

    for (const s of flatList) {
      const groupKey = s.content_id ? `c${s.content_id}` : `r${s.radio_id}`;
      if (groupKey !== targetKey) continue;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          content_id: s.content_id,
          radio_id: s.radio_id,
          content_title: s.radio_name ? `Radio: ${s.radio_name}` : (s.content_title || 'Nội dung không tên'),
          author_name: s.author_name || null,
          has_audio: s.has_audio,
          schedules: []
        });
      }
      const now = new Date();
      const sTime = new Date(s.scheduled_time);
      let play_status: 'played' | 'pending' | 'overdue' = 'pending';
      if (s.triggered_at) play_status = 'played';
      else if (sTime <= now) play_status = 'overdue';

      map.get(groupKey)!.schedules.push({
        schedule_id: s.id,
        scheduled_time: s.scheduled_time,
        channel_id: s.channel_id,
        channel_name: s.channel_name || 'Kênh không xác định',
        mount_point: s.mount_point || '',
        duration: s.duration || '',
        repeat_pattern: s.repeat_pattern || 'none',
        is_active: s.is_active,
        triggered_at: s.triggered_at || null,
        play_status: play_status
      });
    }
    const updated = map.get(targetKey);
    if (updated) setViewingItem(updated);
  };

  const onDeleteSlot = async (scheduleId: number) => {
    if (!confirm('Xóa khung giờ phát này?')) return;
    try {
      await fetch(`${API_URL}/schedules/${scheduleId}`, { method: 'DELETE', headers: getHeaders() });
      await fetchData(); // Refresh main list
      if (viewingItem) {
        // Refresh popup data
        const newData = await (await fetch(`${API_URL}/schedules`, { headers: getHeaders() })).json();
        const flatList: FlatSchedule[] = Array.isArray(newData) ? newData : [];
        updateViewingItem(flatList, viewingItem.content_id, viewingItem.radio_id);
      }
    } catch { setError('Lỗi khi xóa khung giờ.'); }
  };

  const handleEmergencyTrigger = async () => {
    const action = isEmergencyActive ? 'dừng' : 'KÍCH HOẠT';
    if (!confirm(isEmergencyActive ? `Xác nhận ${action} báo động?` : `CẢNH BÁO: Đang ${action} PHÁT BÁO ĐỘNG toàn hệ thống. Tiếp tục?`)) return;
    const url = isEmergencyActive ? `${API_URL}/schedules/emergency/stop` : `${API_URL}/schedules/emergency`;
    try {
      const res = await fetch(url, { method: 'POST', headers: getHeaders() });
      if (res.ok) { setIsEmergencyActive(!isEmergencyActive); fetchData(); }
    } catch { }
  };

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      // Calculate duration if end_time is provided
      const payload = { ...newSchedule };
      if (payload.end_time && payload.scheduled_time) {
        try {
          const datePart = payload.scheduled_time.split('T')[0];
          const start = new Date(payload.scheduled_time).getTime();
          const [h, m] = payload.end_time.split(':').map(Number);
          const end = new Date(datePart).setHours(h, m, 0, 0);
          if (end > start) {
            payload.duration = Math.floor((end - start) / 1000);
          }
        } catch (err) {
          console.error("Main modal duration error", err);
        }
      }
      delete payload.end_time;

      const res = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getHeaders() },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsModalOpen(false);
        setNewSchedule({ channel_id: '', content_id: '', scheduled_time: '', repeat_pattern: 'none', end_time: '' });
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        setError(e.error || 'Lỗi khi tạo lịch.');
      }
    } catch { setError('Lỗi kết nối.'); }
    finally { setIsSubmitting(false); }
  };

  const getStatusColor = (status: string) => {
    if (status === 'online') return '#10b981';
    if (status === 'emergency') return '#ef4444';
    return '#64748b';
  };

  const isScheduledOnDate = (s: { scheduled_time: string, repeat_pattern: string }, targetDate: string) => {
    const sDate = s.scheduled_time.split('T')[0];
    if (sDate === targetDate) return true;
    if (s.repeat_pattern === 'daily') return sDate <= targetDate;
    if (s.repeat_pattern === 'weekly') {
      const sDay = new Date(sDate).getDay();
      const targetDay = new Date(targetDate).getDay();
      return sDate <= targetDate && sDay === targetDay;
    }
    return false;
  };

  // Derived data
  const filtered = groupedContents.filter(g => {
    // Search filter
    const matchesSearch = (g.content_title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.author_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // Date filter: only show if at least one schedule is on the selected date
    if (selectedDate === 'all') return true;
    return g.schedules.some(s => isScheduledOnDate(s, selectedDate));
  });
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Filter contents for the "Add New" form:
  // 1. Must not already have a schedule on the selected date
  // 2. Must match the contentSearchQuery
  const availableContents = contents.filter(c => {
    const targetDate = selectedDate === 'all' ? new Date().toISOString().split('T')[0] : selectedDate;
    const scheduledToday = groupedContents.find(g => g.content_id === c.id)?.schedules.some(s => isScheduledOnDate(s, targetDate));
    if (scheduledToday) return false;

    if (!contentSearchQuery) return true;
    return (c.title || '').toLowerCase().includes(contentSearchQuery.toLowerCase()) ||
           (c.author_name || '').toLowerCase().includes(contentSearchQuery.toLowerCase());
  });


  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Lịch phát thanh</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Điều hành luồng phát thanh, lập lịch tiếp sóng và thông báo khẩn.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleEmergencyTrigger}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', background: isEmergencyActive ? '#ef4444' : 'transparent', borderColor: isEmergencyActive ? '#ef4444' : 'rgba(239,68,68,0.2)', animation: isEmergencyActive ? 'pulse-red 1s infinite' : 'none' }}
          >
            <ShieldAlert size={18} color={isEmergencyActive ? 'white' : '#ef4444'} />
            <span>{isEmergencyActive ? 'DỪNG BÁO ĐỘNG' : 'Phát Báo Động'}</span>
          </button>
          <style>{`@keyframes pulse-red { 0%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,.7)} 70%{transform:scale(1.05);box-shadow:0 0 0 10px rgba(239,68,68,0)} 100%{transform:scale(1);box-shadow:0 0 0 0 rgba(239,68,68,0)} }`}</style>
        </div>
      </div>

      {/* Channel Monitor */}
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.2rem' }}>Giám sát Kênh Truyền</h2>
      <section className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        {channels.map(channel => (
          <div key={channel.id} className="stat-card" style={{ padding: '1.5rem', background: channel.status === 'emergency' ? 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(255,255,255,0.03))' : 'rgba(255,255,255,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: '45px', height: '45px', background: channel.status === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Radio size={24} color={getStatusColor(channel.status)} />
              </div>
              <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, background: channel.status === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)', color: getStatusColor(channel.status), textTransform: 'uppercase' }}>
                {channel.status}
              </span>
            </div>
            <div style={{ marginTop: '1.2rem' }}>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9' }}>{channel.name}</h4>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={14} /> {channel.mount_point}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Date Selector (Cinema Style) */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '1.5rem', marginBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        {/* "Tất cả" Option */}
        <button
          onClick={() => setSelectedDate('all')}
          style={{
            minWidth: '70px',
            padding: '12px 8px',
            borderRadius: '16px',
            background: selectedDate === 'all' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${selectedDate === 'all' ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
            color: selectedDate === 'all' ? 'white' : '#94a3b8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: selectedDate === 'all' ? '0 10px 15px -3px rgba(59, 130, 246, 0.3)' : 'none',
            transform: selectedDate === 'all' ? 'translateY(-2px)' : 'none'
          }}
        >
          <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: selectedDate === 'all' ? 0.9 : 0.6 }}>Lịch</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>TẤT CẢ</span>
        </button>

        {Array.from({ length: 14 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          const isSelected = selectedDate === dateStr;
          const dayName = i === 0 ? 'Hôm nay' : d.toLocaleDateString('vi-VN', { weekday: 'short' });
          const dayNum = d.getDate();
          const monthNum = d.getMonth() + 1;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              style={{
                minWidth: '70px',
                padding: '12px 8px',
                borderRadius: '16px',
                background: isSelected ? 'linear-gradient(135deg, #6366f1, #a855f7)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isSelected ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                color: isSelected ? 'white' : '#94a3b8',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: isSelected ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none'
              }}
            >
              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', opacity: isSelected ? 0.9 : 0.6 }}>{dayName}</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>{dayNum < 10 ? `0${dayNum}` : dayNum}</span>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, opacity: 0.7 }}>Th{monthNum}</span>
            </button>
          );
        })}
      </div>

      {/* Error bar */}
      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem' }}>
          <AlertTriangle size={18} /> {error}
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><XCircle size={16} /></button>
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Timeline Phát sóng</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '4px 14px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              placeholder="Tìm bản tin, tác giả..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '220px', fontSize: '0.9rem' }}
            />
          </div>
          <button onClick={fetchData} className="btn-secondary" style={{ padding: '8px 16px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main table */}
      <section className="section-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem' }}>
            {searchTerm ? `Tìm thấy ${filtered.length} bản tin` : `${filtered.length} bản tin có lịch phát${selectedDate !== 'all' ? ' tương ứng' : ''}`}
          </span>
          <button
            onClick={() => {
              const now = new Date();
              const baseDate = selectedDate === 'all' ? now.toISOString().split('T')[0] : selectedDate;
              // Combine baseDate with current time HH:mm
              const pad = (n: number) => String(n).padStart(2, '0');
              const dateTimeForInput = `${baseDate}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

              setNewSchedule({
                channel_id: channels[0]?.id || '',
                content_id: '',
                scheduled_time: dateTimeForInput,
                repeat_pattern: 'none'
              });
              setContentSearchQuery('');
              setIsContentListOpen(false);
              setIsModalOpen(true);
            }}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px' }}
          >
            <Plus size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Thêm Nội dung phát</span>
          </button>
        </div>

        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Table header */}
          <div style={{ padding: '0.8rem 1.5rem', background: 'rgba(255,255,255,0.01)', display: 'flex', alignItems: 'center', color: '#475569', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ width: '60px' }}>ID</span>
            <span style={{ flex: 2 }}>Tên bản tin</span>
            <span style={{ flex: 1 }}>Tác giả</span>
            <span style={{ width: '80px', textAlign: 'center' }}>Số lịch</span>
            <span style={{ width: '120px', textAlign: 'right' }}>Thao tác</span>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Đang tải dữ liệu...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
              <Calendar size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
              <p>Không tìm thấy lịch phát nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '120px', minHeight: '300px' }}>
              {paginated.map((item, index) => {
                const groupKey = item.content_id ? `c${item.content_id}` : `r${item.radio_id}`;
                const dateToFilter = selectedDate !== 'all' ? selectedDate : null;
                const relevantSchedules = dateToFilter
                  ? item.schedules.filter(s => isScheduledOnDate(s, dateToFilter))
                  : item.schedules;

                const playedCount = relevantSchedules.filter(s => s.play_status === 'played').length;
                const pendingCount = relevantSchedules.filter(s => s.play_status === 'pending').length;
                const overdueCount = relevantSchedules.filter(s => s.play_status === 'overdue').length;
                return (
                  <div key={groupKey} className="table-row-hover" style={{ display: 'flex', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'all 0.2s ease' }}>
                    {/* ID */}
                    <div style={{ width: '60px', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>
                      #{item.content_id || item.radio_id}
                    </div>
                    {/* Tên bản tin */}
                    <div style={{ flex: 2, paddingRight: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }} title={item.content_title}>
                          {item.content_title}
                        </h4>
                        {item.has_audio ? (
                          <span style={{ flexShrink: 0, padding: '1px 6px', background: 'rgba(16,185,129,0.1)', borderRadius: '5px', color: '#10b981', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Music size={9} /> AUDIO
                          </span>
                        ) : (
                          <span style={{ flexShrink: 0, padding: '1px 6px', background: 'rgba(239,68,68,0.1)', borderRadius: '5px', color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <AlertTriangle size={9} /> NO AUDIO
                          </span>
                        )}
                      </div>
                      {/* Mini schedule summary */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {playedCount > 0 && <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={10} /> {playedCount} đã phát</span>}
                        {pendingCount > 0 && <span style={{ fontSize: '0.7rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px' }}><Clock size={10} /> {pendingCount} chờ phát</span>}
                        {overdueCount > 0 && <span style={{ fontSize: '0.7rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '3px' }}><XCircle size={10} /> {overdueCount} bỏ lỡ</span>}
                      </div>
                    </div>

                    {/* Tác giả */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                      <User size={13} color="#475569" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                        {item.author_name || 'Không có'}
                      </span>
                    </div>

                    {/* Số khung giờ - Interactive */}
                    <div style={{ width: '80px', textAlign: 'center' }}>
                      <button
                        onClick={() => { setViewingItem(item); setViewingDetailOnly(true); }}
                        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', padding: '4px 12px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Xem chi tiết lịch phát"
                        onMouseOver={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.2)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.1)')}
                      >
                        {relevantSchedules.length}
                      </button>
                    </div>

                    {/* Thao tác: ➕ 🗑 ⋮ */}
                    <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                      {/* ➕ Tạo lịch */}
                      <button
                        onClick={() => { setViewingItem(item); setViewingDetailOnly(false); }}
                        title="Thêm khung giờ"
                        style={{ background: 'rgba(16,185,129,0.1)', border: 'none', color: '#10b981', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <Plus size={16} />
                      </button>

                      {/* 🗑 Xóa tất cả lịch */}
                      <button
                        onClick={() => handleDeleteContent(item.content_id, item.radio_id)}
                        title="Xóa tất cả lịch phát"
                        style={{ background: 'rgba(239,68,68,0.08)', border: 'none', color: '#ef4444', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* ⋮ Menu */}
                      <div className="schedule-action-menu" style={{ position: 'relative' }}>
                        <button
                          onClick={() => {
                            setMenuOpenId(menuOpenId === groupKey ? null : groupKey);
                          }}
                          style={{ background: menuOpenId === groupKey ? 'rgba(255,255,255,0.08)' : 'none', border: 'none', color: '#64748b', width: '34px', height: '34px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuOpenId === groupKey && (
                            <div className="animate-fade-in" style={{ 
                              position: 'absolute', 
                              right: 0, 
                              ...(index >= Math.max(0, paginated.length - 2) && paginated.length > 3 ? { bottom: '100%', marginBottom: '6px' } : { top: '100%', marginTop: '6px' }),
                              width: '160px', 
                              background: 'rgba(15,23,42,0.97)', 
                              backdropFilter: 'blur(20px)', 
                              border: '1px solid rgba(255,255,255,0.08)', 
                              borderRadius: '12px', 
                              padding: '6px', 
                              zIndex: 50, 
                              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.4)' 
                            }}>
                              <button
                                onClick={() => { setMenuOpenId(null); setViewingItem(item); setViewingDetailOnly(false); }}
                                style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}
                              >
                                <Plus size={14} />
                                <span>Sửa lịch phát</span>
                              </button>
                            <button
                              onClick={() => {
                                setMenuOpenId(null);
                                if (!item.has_audio) {
                                  alert('Bản tin này hiện chưa được gán file âm thanh, không thể phát đa kênh. Vui lòng cập nhật âm thanh trước.');
                                  return;
                                }
                                handlePlayAllChannels(item.content_id, item.radio_id);
                              }}
                              style={{ width: '100%', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', color: item.has_audio ? '#10b981' : '#475569', cursor: item.has_audio ? 'pointer' : 'not-allowed', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'left' }}
                            >
                              {processingId === groupKey ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                              <span>Phát ngay (Tất cả kênh)</span>
                            </button>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '2rem', gap: '12px' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: currentPage === 1 ? '#475569' : '#cbd5e1', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '38px', height: '38px', borderRadius: '10px', background: currentPage === page ? '#6366f1' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                  {page}
                </button>
              ))}
            </div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: currentPage === totalPages ? '#475569' : '#cbd5e1', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </section>

      {/* Detail Popup 👁 */}
      {viewingItem && (
        <ScheduleDetailPopup
          item={viewingItem}
          channels={channels}
          onClose={() => setViewingItem(null)}
          onAddSlot={onAddSlot}
          onUpdateSlot={onUpdateSlot}
          onDeleteSlot={onDeleteSlot}
          onPlayNow={handlePlayNow}
          isReadOnly={viewingDetailOnly}
          selectedDate={selectedDate}
        />
      )}

      {/* Create Schedule Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
          <div className="modal-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg,#fff,#94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Thêm Lịch Phát Mới
              </h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                <XCircle size={20} />
              </button>
            </div>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '12px 16px', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertTriangle size={18} /> {error}
              </div>
            )}
            <form onSubmit={handleCreateNew}>
              {/* Channel is hidden, default to channels[0] */}
              <div className="premium-form-group content-search-container" style={{ position: 'relative' }}>
                <label className="premium-label"><Layers size={14} /> Bản tin nội dung</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="premium-input"
                    placeholder="Tìm kiếm bản tin hoặc tác giả..."
                    value={contentSearchQuery || (contents.find(c => c.id === parseInt(newSchedule.content_id))?.title || '')}
                    onFocus={() => { setContentSearchQuery(''); setIsContentListOpen(true); }}
                    onChange={e => { setContentSearchQuery(e.target.value); setIsContentListOpen(true); }}
                    style={{ paddingRight: '40px' }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                  
                  {isContentListOpen && (
                    <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', maxHeight: '250px', overflowY: 'auto', zIndex: 100, padding: '5px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {availableContents.length === 0 ? (
                        <div style={{ padding: '15px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                          {contentSearchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Tất cả các bản tin hôm nay đều đã có lịch'}
                        </div>
                      ) : (
                        availableContents.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setNewSchedule({ ...newSchedule, content_id: c.id });
                              setContentSearchQuery(c.title);
                              setIsContentListOpen(false);
                            }}
                            className="table-row-hover"
                            style={{ padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}
                          >
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>{c.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <User size={10} /> {c.author_name || 'Không có tác giả'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="premium-form-group">
                <label className="premium-label"><User size={14} /> Tác giả bản tin</label>
                <input
                  type="text"
                  className="premium-input"
                  readOnly
                  style={{ background: 'rgba(0,0,0,0.1)', cursor: 'default' }}
                  value={contents.find(c => c.id === parseInt(newSchedule.content_id))?.author_name || 'Chưa chọn bản tin'}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '2rem' }}>
                <div className="premium-form-group" style={{ marginBottom: 0 }}>
                  <label className="premium-label"><Clock size={14} /> Giờ phát</label>
                  <input
                    type="time"
                    required
                    className="premium-input"
                    value={newSchedule.scheduled_time ? (new Date(newSchedule.scheduled_time).getHours().toString().padStart(2, '0') + ':' + new Date(newSchedule.scheduled_time).getMinutes().toString().padStart(2, '0')) : ''}
                    onChange={e => {
                      const time = e.target.value;
                      const baseDate = selectedDate === 'all' ? new Date().toISOString().split('T')[0] : selectedDate;
                      setNewSchedule({ ...newSchedule, scheduled_time: `${baseDate}T${time}:00` });
                    }}
                  />
                </div>
                <div className="premium-form-group" style={{ marginBottom: 0 }}>
                  <label className="premium-label"><RefreshCw size={14} /> Tần suất</label>
                  <select className="premium-select" value={newSchedule.repeat_pattern} onChange={e => setNewSchedule({ ...newSchedule, repeat_pattern: e.target.value })}>
                    <option value="none">Phát một lần (Tự do)</option>
                    <option value="daily">Hàng ngày (Tự động phát mỗi ngày)</option>
                    <option value="weekly">Hàng tuần (Phát 1 tuần/lần)</option>
                  </select>
                </div>
              </div>

              {/* Added: Optional Duration for Content too, or specifically if it was a radio (but radio addition is via popup usually) */}
              <div className="premium-form-group">
                <label className="premium-label"><Clock size={14} /> Giờ kết thúc (Tùy chọn)</label>
                <input
                  type="time"
                  className="premium-input"
                  value={newSchedule.end_time || ''}
                  onChange={e => setNewSchedule({ ...newSchedule, end_time: e.target.value })}
                  placeholder="Để trống nếu phát hết file"
                />
                <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '4px' }}>* Chỉ áp dụng nếu bạn muốn giới hạn thời gian phát.</p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} style={{ flex: 1 }}>Hủy bỏ</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Check size={20} />}
                  <span>Xác nhận lưu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
