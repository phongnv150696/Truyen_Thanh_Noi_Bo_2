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
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Save,
  Edit3,
  Pause,
  Activity
} from 'lucide-react';
import { useNotification } from '../../components/NotificationProvider';

import { API_URL, WEBSOCKET_URL } from '../../config'

interface ScheduleEntry {
  schedule_id: number;
  scheduled_time: string;
  channel_id: number;
  channel_name: string;
  mount_point: string;
  duration: string;
  repeat_pattern: string;
  is_active: boolean;
  unit_id?: number | null;
  unit_name?: string | null;
  is_all_units?: boolean;
  triggered_at: string | null;
  play_status: 'played' | 'pending' | 'overdue';
}

interface GroupedContent {
  content_id: number | null;
  radio_id?: number | null;
  routine_id?: number | null;
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

interface Unit {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
}

interface FlatSchedule {
  id: number;
  scheduled_time: string;
  duration: string;
  repeat_pattern: string;
  is_active: boolean;
  channel_id: number;
  channel_name: string;
  unit_id?: number | null;
  unit_name?: string | null;
  is_all_units?: boolean;
  mount_point: string;
  content_id: number | null;
  radio_id?: number | null;
  radio_name?: string | null;
  routine_id?: number | null;
  routine_title?: string | null;
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
  onStopBroadcast,
  activeBroadcast,
  units,
  devices,
  user,
  isReadOnly = false,
  selectedDate = 'all'
}: {
  item: GroupedContent;
  channels: Channel[];
  onClose: () => void;
  onAddSlot: (contentId: number | null, channelId: number | null, scheduledTime: string, repeatPattern: string, radioId?: number | null, duration?: number, routineId?: number | null, unitId?: number | null, isAllUnits?: boolean) => Promise<void>;
  onUpdateSlot: (scheduleId: number, channelId: number | null, scheduledTime: string, repeatPattern: string, duration?: number, unitId?: number | null, isAllUnits?: boolean) => Promise<void>;
  onDeleteSlot: (scheduleId: number) => Promise<void>;
  onPlayNow: (scheduleId: number) => Promise<void>;
  onStopBroadcast: () => void;
  activeBroadcast: any;
  units: Unit[];
  devices: any[];
  user: any;
  isReadOnly?: boolean;
  selectedDate?: string;
}) {
  const [targetType, setTargetType] = useState<'channel' | 'unit' | 'all'>('unit');
  const [newChannelId, setNewChannelId] = useState(channels[0]?.id || 0);
  const [newUnitId, setNewUnitId] = useState<number | string>(user?.unit_id || '');
  const [newTime, setNewTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [newRepeat, setNewRepeat] = useState('none');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { showNotification } = useNotification();

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

  const getStatusBadge = (status: string, scheduleId?: number) => {
    if (activeBroadcast && scheduleId && activeBroadcast.schedule_id === scheduleId) return (
      <span style={{ padding: '4px 10px', borderRadius: '10px', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', fontSize: '0.65rem', fontWeight: 800, border: '1px solid rgba(59,130,246,0.1)', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <RefreshCw size={10} className="animate-spin" /> Đang phát
      </span>
    );
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
    if (!newTime) return;
    if (targetType === 'channel' && !newChannelId) return;
    if (targetType === 'unit' && !newUnitId) return;

    // Check if time is in the past for today
    const now = new Date();
    const scheduledDateObj = new Date(newTime);
    if (scheduledDateObj < now) {
      showNotification('error', `Không thể đặt lịch phát trong quá khứ (${scheduledDateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}). Vui lòng chọn giờ lớn hơn giờ hiện tại (${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}).`);
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
          showNotification('info', "Giờ kết thúc phải lớn hơn giờ bắt đầu.");
          return;
        }
        duration = Math.floor((end - start) / 1000);
      } catch (err) {
        console.error("Invalid end time format", err);
      }
    }

    setSubmitting(true);
    const channelId = targetType === 'channel' ? newChannelId : null;
    const unitId = targetType === 'unit' ? Number(newUnitId) : (targetType === 'all' && user?.unit_id ? user.unit_id : null);
    const isAllUnits = targetType === 'all';

    if (editingId) {
      await onUpdateSlot(editingId, channelId, newTime, newRepeat, duration, unitId, isAllUnits);
      setEditingId(null);
    } else {
      await onAddSlot(item.content_id, channelId, newTime, newRepeat, item.radio_id, duration, item.routine_id, unitId, isAllUnits);
    }
    setNewTime('');
    setNewEndTime('');
    setSubmitting(false);
  };

  const startEdit = (s: ScheduleEntry) => {
    setEditingId(s.schedule_id);
    if (s.channel_id) {
       setTargetType('channel');
       setNewChannelId(s.channel_id);
    } else if (s.is_all_units) {
       setTargetType('all');
       setNewUnitId(s.unit_id || user?.unit_id || '');
    } else {
       setTargetType('unit');
       setNewUnitId(s.unit_id || '');
    }
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
    setTargetType('unit');
    setNewUnitId(user?.unit_id || '');
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
    const key = s.channel_id ? (s.channel_name || 'Kênh không xác định') : (s.unit_name || (s.is_all_units ? 'Toàn đơn vị' : 'Đơn vị không xác định'));
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
                <label style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase' }}>Chọn đơn vị</label>
                <select 
                  className="premium-select" 
                  style={{ width: '100%', height: '42px' }}
                  value={targetType === 'all' ? 'all' : String(newUnitId)}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'all') {
                      setTargetType('all');
                      setNewUnitId(user?.unit_id || '');
                    } else {
                      setTargetType('unit');
                      setNewUnitId(val);
                    }
                  }}
                >
                  <option value="">-- Chọn đơn vị --</option>
                  {(user?.unit_id === 1 || user?.role_name?.toLowerCase() === 'admin' || user?.id === 1) && (
                    <option value="all">TẤT CẢ ĐƠN VỊ (GLOBAL)</option>
                  )}
                  {units
                    .filter((u: Unit) => {
                      // Level 5+ and has hardware
                      const hasLevel = u.level >= 5;
                      const hasDevices = devices.some((d: any) => Number(d.unit_id) === Number(u.id));
                      return hasLevel && hasDevices;
                    })
                    .map((u: Unit) => {
                      const unitDeviceCount = devices.filter((d: any) => Number(d.unit_id) === Number(u.id)).length;
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} ({unitDeviceCount} thiết bị)
                        </option>
                      );
                    })}
                </select>
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
                  
                  // Use local timezone base date
                  // Use local date instead of UTC ISO date to avoid being off by one day
                  let baseDate = selectedDate && selectedDate !== 'all' ? selectedDate : '';
                  if (!baseDate) {
                    baseDate = new Date().toLocaleDateString('en-CA');
                  }

                  try {
                    // Combine base date and time in local timezone, then convert to UTC ISO
                    const localDateObj = new Date(`${baseDate}T${time}:00`);
                    if (!isNaN(localDateObj.getTime())) {
                       setNewTime(localDateObj.toISOString());
                    } else {
                       setNewTime(`${baseDate}T${time}:00`);
                    }
                  } catch (err) {
                    setNewTime(`${baseDate}T${time}:00`);
                  }
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
                        {getStatusBadge(s.play_status, s.schedule_id)}
                      </div>
                      {!isReadOnly && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => startEdit(s)} className="hover-scale" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Edit3 size={13} />
                          </button>
                          {activeBroadcast?.schedule_id === s.schedule_id ? (
                            <button onClick={onStopBroadcast} className="hover-scale ani-pulse" style={{ background: '#ef4444', border: 'none', color: 'white', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                <div style={{ width: '3.5px', height: '12px', background: 'white', borderRadius: '1px' }} />
                                <div style={{ width: '3.5px', height: '12px', background: 'white', borderRadius: '1px' }} />
                              </div>
                            </button>
                          ) : (
                            <button onClick={() => onPlayNow(s.schedule_id)} className="hover-scale" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10b981', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Play size={13} fill="#10b981" />
                            </button>
                          )}
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
export default function ScheduleManagement({ 
  onLogout, 
  activeBroadcast, 
  onStopBroadcast, 
  onStartBroadcast,
  pendingRoutine,
  onRoutineHandled,
  user
}: { 
  onLogout?: () => void;
  activeBroadcast?: any;
  onStopBroadcast?: () => void;
  onStartBroadcast?: (data: any) => void;
  pendingRoutine?: { routineId: number, title: string } | null;
  onRoutineHandled?: () => void;
  user?: any;
}) {
  const [groupedContents, setGroupedContents] = useState<GroupedContent[]>([]);
  const { showNotification, confirm } = useNotification();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [radios, setRadios] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [routines, setRoutines] = useState<any[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Popup state
  const [viewingDetailOnly, setViewingDetailOnly] = useState(false);
  const [viewingItem, setViewingItem] = useState<GroupedContent | null>(null);

  // Create Schedule Modal state (for header button)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'news' | 'radio' | 'routine'>('news');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSchedule, setNewSchedule] = useState<any>({
    unit_id: '',
    is_all_units: false,
    content_id: '',
    radio_id: '',
    routine_id: '',
    scheduled_time: '',
    repeat_pattern: 'none',
    end_time: ''
  });
  const [targetType, setTargetType] = useState<'unit' | 'all'>('unit');
  const [contentSearchQuery, setContentSearchQuery] = useState('');
  const [isContentListOpen, setIsContentListOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Real-time clock and playback tracking
  const [currentTime, setCurrentTime] = useState(new Date());
  const [playPosition, setPlayPosition] = useState(0);

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePauseBroadcast = async (scheduleId: number) => {
    try {
      await fetch(`${API_URL}/schedules/${scheduleId}/pause`, { method: 'POST', headers: getHeaders() });
    } catch (err) { console.error("Pause error", err); }
  };

  const handleResumeBroadcast = async (scheduleId: number) => {
    try {
      await fetch(`${API_URL}/schedules/${scheduleId}/resume`, { method: 'POST', headers: getHeaders() });
    } catch (err) { console.error("Resume error", err); }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Playback timer effect
  useEffect(() => {
    let interval: any = null;
    
    if (activeBroadcast && !activeBroadcast.isPaused) {
      interval = setInterval(() => {
        setPlayPosition(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeBroadcast?.schedule_id, activeBroadcast?.isPaused]);

  // Reset play position when a new broadcast starts
  useEffect(() => {
    if (activeBroadcast) {
      setPlayPosition(0);
    }
  }, [activeBroadcast?.schedule_id]);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return { 'Authorization': token ? `Bearer ${token}` : '' };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [schedRes, chanRes, contRes, routRes, uRes, deviceRes, radioRes] = await Promise.all([
        fetch(`${API_URL}/schedules`, { headers: getHeaders() }),
        fetch(`${API_URL}/channels`, { headers: getHeaders() }),
        fetch(`${API_URL}/content?status=approved`, { headers: getHeaders() }),
        fetch(`${API_URL}/routines`, { headers: getHeaders() }),
        fetch(`${API_URL}/users/units`, { headers: getHeaders() }),
        fetch(`${API_URL}/devices`, { headers: getHeaders() }),
        fetch(`${API_URL}/radios`, { headers: getHeaders() })
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
      const routs = await routRes.json();
      const unitData = await uRes.json();
      const deviceData = await deviceRes.json();
      const radioData = await radioRes.json();

      console.log('[Schedules] flat schedules count:', Array.isArray(schedData) ? schedData.length : 'NOT ARRAY', schedData);

      // Group flat list by content_id client-side
      const flatList: FlatSchedule[] = Array.isArray(schedData) ? schedData : [];

      if (!Array.isArray(schedData)) {
        setError(`API trả về dữ liệu không hợp lệ: ${JSON.stringify(schedData).substring(0, 100)}`);
      }

      const map = new Map<string, GroupedContent>();
      for (const s of flatList) {
        const groupKey = s.content_id ? `c${s.content_id}` : s.radio_id ? `r${s.radio_id}` : `o${s.routine_id}`;
        if (!map.has(groupKey)) {
          map.set(groupKey, {
            content_id: s.content_id,
            radio_id: s.radio_id,
            routine_id: s.routine_id,
            content_title: s.radio_name ? `Radio: ${s.radio_name}` : s.routine_title ? `Hiệu lệnh: ${s.routine_title}` : (s.content_title || 'Nội dung không tên'),
            author_name: s.author_name || null,
            has_audio: s.has_audio || !!s.routine_id,
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
      setRoutines(Array.isArray(routs) ? routs : []);
      setUnits(Array.isArray(unitData) ? unitData : []);
      setDevices(Array.isArray(deviceData) ? deviceData : []);
      setRadios(Array.isArray(radioData) ? radioData : []);
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
    const socket = new WebSocket(WEBSOCKET_URL);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'broadcast-start') fetchData();
      } catch { }
    };
    return () => socket.close();
  }, []);

  useEffect(() => {
    if (pendingRoutine) {
      console.log('[Schedules] Handling pending routine from prop:', pendingRoutine);
      setScheduleType('routine');
      setNewSchedule((prev: any) => ({ 
        ...prev, 
        routine_id: pendingRoutine.routineId,
        unit_id: user?.unit_id || (units.length > 0 ? units[0].id.toString() : ''),
        content_id: null,
        radio_id: null,
        scheduled_time: new Date().toISOString()
      }));
      setContentSearchQuery(pendingRoutine.title);
      setIsModalOpen(true);
      
      // Notify parent that we've handled it
      if (onRoutineHandled) onRoutineHandled();
    }
  }, [pendingRoutine, onRoutineHandled]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.content-search-container')) setIsContentListOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePlayNow = async (scheduleId: number) => {
    if (!(await confirm('Bạn có chắc chắn muốn phát khung giờ này ngay lập tức?'))) return;
    setProcessingId(scheduleId);
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}/play`, { method: 'POST', headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        console.log('Play Now Success:', data);
        if (onStartBroadcast && data.broadcast) {
           onStartBroadcast(data.broadcast);
        }
        showNotification('success', 'Đã gửi lệnh phát sóng thành công!');
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        showNotification('error', `Lỗi (${res.status}): ${e.error || 'Máy chủ từ chối lệnh phát.'}`);
      }
    } catch (err) { 
      console.error('Play Now Error:', err);
      showNotification('error', 'Lỗi kết nối máy chủ'); 
    }
    finally { setProcessingId(null); }
  };

  const handlePlayAllChannels = async (contentId: number | null, radioId?: number | null, routineId?: number | null, title?: string) => {
    if (!(await confirm('Bạn có chắc chắn muốn phát nội dung này trên TẤT CẢ các kênh có lịch trong hôm nay?'))) return;
    const groupKey = contentId ? `c${contentId}` : radioId ? `r${radioId}` : `o${routineId}`;
    if (!groupKey) return;
    setProcessingId(groupKey);
    try {
      let url = '';
      if (contentId) url = `${API_URL}/schedules/content/${contentId}/play-all`;
      else if (radioId) url = `${API_URL}/schedules/radio/${radioId}/play-all`;
      else if (routineId) url = `${API_URL}/schedules/routine/${routineId}/play-all`;

      const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (onStartBroadcast) {
          onStartBroadcast({
            title: title || 'Phát sóng đa kênh',
            channel: data.message || 'Đang kích hoạt các kênh...',
            user: 'Hệ thống',
            content_id: contentId,
            radio_id: radioId
          });
        }
        showNotification('success', data.message || 'Đã gửi lệnh phát sóng đa kênh thành công!');
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        showNotification('error', `Lỗi (${res.status}): ${e.error || 'Máy chủ từ chối lệnh phát đa kênh.'}`);
      }
    } catch { showNotification('error', 'Lỗi kết nối máy chủ'); }
    finally { setProcessingId(null); }
  };

  const handleDeleteContent = async (contentId: number | null, radioId?: number | null, routineId?: number | null) => {
    const groupKey = contentId ? `c${contentId}` : radioId ? `r${radioId}` : `o${routineId}`;
    const item = groupedContents.find(g => (g.content_id ? `c${g.content_id}` : g.radio_id ? `r${g.radio_id}` : `o${g.routine_id}`) === groupKey);
    if (!item) return;
    if (!(await confirm(`Xóa toàn bộ ${item.schedules.length} lịch phát của "${item.content_title}"?`))) return;
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

  const onAddSlot = async (contentId: number | null, channelId: number | null, scheduledTime: string, repeatPattern: string, radioId?: number | null, duration?: number, routineId?: number | null, unitId?: number | null, isAllUnits?: boolean) => {
    try {
      const res = await fetch(`${API_URL}/schedules`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          unit_id: unitId,
          is_all_units: isAllUnits || false,
          content_id: contentId,
          radio_id: radioId,
          routine_id: routineId,
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

  const onUpdateSlot = async (scheduleId: number, channelId: number | null, scheduledTime: string, repeatPattern: string, duration?: number, unitId?: number | null, isAllUnits?: boolean) => {
    try {
      const res = await fetch(`${API_URL}/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_id: channelId,
          unit_id: unitId,
          is_all_units: isAllUnits || false,
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
        unit_id: s.unit_id,
        unit_name: s.unit_name,
        is_all_units: s.is_all_units,
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
    if (!(await confirm('Xóa khung giờ phát này?'))) return;
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
        setNewSchedule({ unit_id: '', content_id: '', scheduled_time: '', repeat_pattern: 'none', end_time: '' });
        fetchData();
      } else {
        const e = await res.json().catch(() => ({}));
        setError(e.error || 'Lỗi khi tạo lịch.');
      }
    } catch { setError('Lỗi kết nối.'); }
    finally { setIsSubmitting(false); }
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
      {/* Premium Clock with Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(to right, #f8fafc, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, letterSpacing: '-0.04em' }}>
            Lập lịch Phát thanh
          </h1>
          <div style={{ color: '#64748b', fontSize: '1rem', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} />
            {currentTime.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={{ textAlign: 'right', padding: '12px 28px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
           <div style={{ fontSize: '2.8rem', fontWeight: 950, color: '#f8fafc', letterSpacing: '2px', textShadow: '0 0 25px rgba(99,102,241,0.4)', marginBottom: '-8px', lineHeight: 1 }}>
              {currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
           </div>
           <span style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '4px' }}>Giờ chuẩn đơn vị</span>
        </div>
      </div>

      {/* Live Monitor Card (Enhanced) */}
      {activeBroadcast ? (
        <div className="glass-card animate-fade-in" style={{ 
          marginBottom: '2.5rem', 
          padding: '32px', 
          border: '1px solid rgba(99,102,241,0.2)', 
          background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.98))',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '30px'
        }}>
          {/* Animated Background Spectrum */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', display: 'flex', alignItems: 'flex-end', gap: '3px', opacity: 0.15, padding: '0 20px' }}>
             {Array.from({ length: 120 }).map((_, i) => (
                <div key={i} style={{ flex: 1, background: '#6366f1', height: `${10 + Math.random() * 90}%`, animation: `pulse-live ${0.8 + Math.random()}s infinite alternate ease-in-out` }} />
             ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
               <div style={{ width: '72px', height: '72px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', boxShadow: '0 0 20px rgba(99,102,241,0.2)' }}>
                  <Activity size={36} className="animate-pulse" />
               </div>
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ef4444', color: 'white', padding: '3px 12px', borderRadius: '30px', fontWeight: 900, fontSize: '0.75rem', animation: 'pulse-live 2s infinite' }}>
                       <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} /> TRỰC TIẾP
                    </div>
                    <span style={{ color: '#818cf8', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Kênh: {activeBroadcast.channel}</span>
                  </div>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', margin: 0, letterSpacing: '-0.02em' }}>{activeBroadcast.title}</h2>
                  <div style={{ fontSize: '0.95rem', color: '#94a3b8', marginTop: '6px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} /> Phụ trách: <span style={{ fontWeight: 800, color: '#f1f5f9' }}>{activeBroadcast.user}</span>
                    </div>
                    {activeBroadcast.start_time && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(99,102,241,0.1)', padding: '3px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} color="#818cf8" />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f8fafc' }}>{new Date(activeBroadcast.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div style={{ width: '8px', height: '1px', background: 'rgba(255,255,255,0.2)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981' }}>
                            {activeBroadcast.duration 
                              ? new Date(new Date(activeBroadcast.start_time).getTime() + activeBroadcast.duration * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                              : '--:--'}
                          </span>
                        </div>
                      </div>
                    )}
                    {activeBroadcast.file_size && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                        Dung lượng: <span style={{ fontWeight: 800, color: '#818cf8' }}>{activeBroadcast.file_size}</span>
                      </div>
                    )}
                  </div>
               </div>
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
               {activeBroadcast.isPaused ? (
                 <button onClick={() => handleResumeBroadcast(activeBroadcast.schedule_id)} className="btn-primary hover-scale" style={{ width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 10px 20px rgba(16,185,129,0.3)' }}>
                    <Play size={28} fill="white" />
                 </button>
               ) : (
                 <button onClick={() => handlePauseBroadcast(activeBroadcast.schedule_id)} className="btn-primary hover-scale" style={{ width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: 'none', boxShadow: '0 10px 20px rgba(251,191,36,0.3)' }}>
                    <Pause size={28} fill="white" />
                 </button>
               )}
               <button onClick={onStopBroadcast} className="btn-primary hover-scale" style={{ width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ef4444, #dc2626)', border: 'none', boxShadow: '0 10px 20px rgba(239,68,68,0.3)' }}>
                  <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '4px' }} />
               </button>
            </div>
          </div>
          
          {/* Progress Bar Container */}
          <div style={{ marginTop: '32px', position: 'relative', zIndex: 1 }}>
             <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ 
                  height: '100%', 
                  width: activeBroadcast.duration ? `${Math.min((playPosition / activeBroadcast.duration) * 100, 100)}%` : '0%', 
                  background: 'linear-gradient(to right, #6366f1, #a855f7)',
                  borderRadius: '10px',
                  boxShadow: '0 0 15px rgba(99,102,241,0.5)',
                  transition: 'width 1s linear'
                }} />
             </div>
             <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748b', marginTop: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                <span>{formatTime(playPosition)}</span>
                <span style={{ color: '#818cf8', animation: 'pulse-live 1s infinite' }}>
                   {activeBroadcast.isPaused ? 'ĐÃ TẠM DỪNG' : 'ĐANG TRUYỀN TÍN HIỆU...'}
                </span>
                <span>{activeBroadcast.duration ? formatTime(activeBroadcast.duration) : '--:--'}</span>
             </div>
          </div>
        </div>
      ) : (
        <div className="glass-card animate-fade-in" style={{ marginBottom: '2.5rem', padding: '40px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', borderRadius: '30px' }}>
           <div style={{ width: '64px', height: '64px', background: 'rgba(255,255,255,0.03)', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#475569' }}>
              <Radio size={32} />
           </div>
           <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Hệ thống sẵn sàng phát sóng</h3>
           <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '8px', maxWidth: '400px', margin: '8px auto 0' }}>Sẵn sàng nhận lệnh điều khiển. Chọn một bản tin từ danh sách phía dưới hoặc tạo lịch phát mới để bắt đầu.</p>
        </div>
      )}

      {/* Channel Monitor section removed based on user request */}

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
          <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', opacity: selectedDate === 'all' ? 0.9 : 0.6, letterSpacing: '1px', fontFamily: 'Outfit' }}>Lịch</span>
          <span style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '0.5px' }}>TẤT CẢ</span>
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

      {/* Layout Grid Container */}
      <section className="section-container" style={{ marginTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
             {searchTerm ? `Tìm thấy ${filtered.length} bản tin` : `${filtered.length} bản tin có lịch phát${selectedDate !== 'all' ? ' tương ứng' : ''}`}
          </span>
          <button
            onClick={() => {
              const now = new Date();
              let baseDate = selectedDate === 'all' ? now.toLocaleDateString('en-CA') : selectedDate;
              if (selectedDate === 'all') baseDate = now.toLocaleDateString('en-CA');
              const pad = (n: number) => String(n).padStart(2, '0');
              const localTimeStr = `${baseDate}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
              let utcIsoString = localTimeStr;
              try {
                const dt = new Date(localTimeStr);
                if (!isNaN(dt.getTime())) utcIsoString = dt.toISOString();
              } catch(e) {}
              setNewSchedule({ 
                unit_id: user?.unit_id?.toString() || (units.length > 0 ? units[0].id.toString() : ''), 
                content_id: '', 
                scheduled_time: utcIsoString, 
                repeat_pattern: 'none' 
              });
              setContentSearchQuery('');
              setIsContentListOpen(false);
              setIsModalOpen(true);
            }}
            className="btn-primary hover-scale"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}
          >
            <Plus size={20} />
            <span style={{ fontSize: '0.95rem', fontWeight: 900, fontFamily: 'Outfit', letterSpacing: '0.5px' }}>LẬP LỊCH MỚI</span>
          </button>
        </div>

        {loading ? (
          <div className="glass-card" style={{ padding: '6rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.01)' }}>
            <RefreshCw size={40} className="animate-spin" style={{ margin: '0 auto 1.5rem', color: '#6366f1', opacity: 0.6 }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Đang đồng bộ dữ liệu hệ thống...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: '6rem', textAlign: 'center', color: '#64748b', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)' }}>
            <Calendar size={60} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Không tìm thấy lịch phát nào cho khung giờ này.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '24px' }}>
            {paginated.map((item) => {
              const groupKey = item.content_id ? `c${item.content_id}` : item.radio_id ? `r${item.radio_id}` : `o${item.routine_id}`;
              const dateToFilter = selectedDate !== 'all' ? selectedDate : null;
              const relevantSchedules = dateToFilter ? item.schedules.filter(s => isScheduledOnDate(s, dateToFilter)) : item.schedules;
              const playedCount = relevantSchedules.filter(s => s.play_status === 'played').length;
              const pendingCount = relevantSchedules.filter(s => s.play_status === 'pending').length;
              const isItemLive = activeBroadcast && (activeBroadcast.content_id === item.content_id || activeBroadcast.radio_id === item.radio_id || activeBroadcast.routine_id === item.routine_id);

              return (
                <div 
                  key={groupKey} 
                  className="glass-card animate-scale-in" 
                  style={{ 
                    padding: '24px', 
                    border: isItemLive ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    background: isItemLive ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,78,59,0.1))' : 'rgba(255,255,255,0.02)',
                    display: 'flex', flexDirection: 'column', gap: '20px', borderRadius: '24px',
                    boxShadow: isItemLive ? '0 15px 30px -10px rgba(16,185,129,0.2)' : '0 10px 25px -5px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                     <div style={{ flex: 1, paddingRight: '12px' }}>
                       <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 900, marginBottom: '6px', letterSpacing: '1px' }}>#{item.content_id || item.radio_id || item.routine_id}</div>
                       <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: isItemLive ? '#10b981' : '#f8fafc', lineHeight: 1.3, letterSpacing: '-0.01em' }}>{item.content_title}</h4>
                       
                       {/* Next Scheduled Badge */}
                       {pendingCount > 0 && relevantSchedules.find(s => s.play_status === 'pending') && (() => {
                         const next = relevantSchedules.find(s => s.play_status === 'pending')!;
                         const sTime = new Date(next.scheduled_time);
                         const duration = next.duration ? parseInt(next.duration.toString()) : 0;
                         const eTime = duration > 0 ? new Date(sTime.getTime() + duration * 1000) : null;
                         
                         return (
                           <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '2px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, marginTop: '8px' }}>
                              <Clock size={10} /> Sắp tới: {sTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              {eTime && (
                                <>
                                  <span style={{ opacity: 0.5 }}>-</span>
                                  <span>{eTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                           </div>
                         );
                       })()}
                     </div>
                     {isItemLive ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: '30px', fontSize: '0.7rem', fontWeight: 950, animation: 'pulse-live 1.5s infinite' }}>
                          <div style={{ width: '8px', height: '8px', background: 'white', borderRadius: '50%' }} /> TRỰC TIẾP
                        </div>
                     ) : (
                        <button onClick={() => handleDeleteContent(item.content_id, item.radio_id, item.routine_id)} title="Xóa tất cả lịch" style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '4px', borderRadius: '8px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'}>
                           <Trash2 size={16} />
                        </button>
                     )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '0.85rem' }}>
                        <div style={{ width: '30px', height: '30px', background: 'rgba(255,255,255,0.04)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                           <User size={14} />
                        </div>
                        <span style={{ fontWeight: 600 }}>{item.author_name || 'Hệ thống'}</span>
                     </div>
                     <span style={{ padding: '3px 10px', background: item.has_audio ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '10px', color: item.has_audio ? '#10b981' : '#ef4444', fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.5px' }}>
                        {item.has_audio ? 'CÓ ÂM THANH' : 'CHƯA CÓ FILE'}
                     </span>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 -10px' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ textAlign: 'center' }}>
                           <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>{playedCount}</div>
                           <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Đã phát</div>
                        </div>
                        <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />
                        <div style={{ textAlign: 'center' }}>
                           <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fbbf24' }}>{pendingCount}</div>
                           <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Chờ phát</div>
                        </div>
                     </div>

                     <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isItemLive ? (
                          <>
                            {activeBroadcast.isPaused ? (
                              <button onClick={() => handleResumeBroadcast(activeBroadcast.schedule_id)} title="Tiếp tục" style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Play size={18} fill="#10b981" /></button>
                            ) : (
                              <button onClick={() => handlePauseBroadcast(activeBroadcast.schedule_id)} title="Tạm dừng" style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pause size={18} fill="#fbbf24" /></button>
                            )}
                            <button onClick={onStopBroadcast} title="Dừng phát" style={{ width: '38px', height: '38px', borderRadius: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '14px', height: '14px', background: '#ef4444', borderRadius: '2px' }} /></button>
                          </>
                        ) : (
                          item.has_audio && (
                            <button onClick={() => handlePlayAllChannels(item.content_id, item.radio_id, item.routine_id, item.content_title)} disabled={processingId === groupKey} className="btn-primary hover-scale" style={{ padding: '8px 18px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800, border: 'none', background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                              {processingId === groupKey ? <RefreshCw size={14} className="animate-spin" /> : 'PHÁT NGAY'}
                            </button>
                          )
                        )}
                        <button onClick={() => { setViewingItem(item); setViewingDetailOnly(false); }} className="btn-secondary" style={{ width: '38px', height: '38px', borderRadius: '12px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           <Calendar size={18} />
                        </button>
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '3rem', gap: '12px' }}>
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: currentPage === 1 ? '#475569' : '#cbd5e1', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={22} />
            </button>
            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button key={page} onClick={() => setCurrentPage(page)} style={{ width: '42px', height: '42px', borderRadius: '12px', background: currentPage === page ? '#6366f1' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: 'white', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>
                  {page}
                </button>
              ))}
            </div>
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: currentPage === totalPages ? '#475569' : '#cbd5e1', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={22} />
            </button>
          </div>
        )}
      </section>

      {/* Popups & Modals */}
      {viewingItem && (
        <ScheduleDetailPopup
          item={viewingItem as GroupedContent}
          channels={channels}
          units={units}
          devices={devices}
          user={user}
          onClose={() => setViewingItem(null)}
          onAddSlot={onAddSlot}
          onUpdateSlot={onUpdateSlot}
          onDeleteSlot={onDeleteSlot}
          onPlayNow={handlePlayNow}
          onStopBroadcast={onStopBroadcast || (() => {})}
          activeBroadcast={activeBroadcast}
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
              <div style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <button type="button" onClick={() => setScheduleType('news')} className={scheduleType === 'news' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>Bản tin</button>
                <button type="button" onClick={() => setScheduleType('radio')} className={scheduleType === 'radio' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>Radio</button>
                <button type="button" onClick={() => setScheduleType('routine')} className={scheduleType === 'routine' ? 'btn-primary' : 'btn-secondary'} style={{ flex: 1, padding: '8px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>Hiệu lệnh</button>
              </div>

              <div className="premium-form-group">
                <label className="premium-label"><Activity size={14} /> Phạm vi phát sóng</label>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => { 
                      setTargetType('all'); 
                      const isAdmin = user?.unit_id === 1 || user?.role_name?.toLowerCase() === 'admin' || user?.id === 1;
                      setNewSchedule({
                        ...newSchedule, 
                        is_all_units: isAdmin, 
                        unit_id: isAdmin ? '' : user.unit_id.toString()
                      }); 
                    }} 
                    className={targetType === 'all' ? 'btn-primary' : 'btn-secondary'} 
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.8rem', border: targetType === 'all' ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                  >
                    Tất cả đơn vị
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setTargetType('unit'); setNewSchedule({...newSchedule, is_all_units: false}); }} 
                    className={targetType === 'unit' ? 'btn-primary' : 'btn-secondary'} 
                    style={{ flex: 1, padding: '10px', borderRadius: '12px', fontSize: '0.8rem', border: targetType === 'unit' ? 'none' : '1px solid rgba(255,255,255,0.05)' }}
                  >
                    Từng đơn vị
                  </button>
                </div>
              </div>

              {targetType === 'unit' && (
                <div className="premium-form-group">
                  <label className="premium-label">Chọn Đơn vị</label>
                  <select 
                    className="premium-select" 
                    value={String(newSchedule.unit_id)} 
                    onChange={e => setNewSchedule({...newSchedule, unit_id: e.target.value})}
                  >
                    <option value="">-- Chọn đơn vị --</option>
                    {units
                      .filter(u => {
                        // 1. Must be Level 5 (Company) or Level 6 (Platoon)
                        const hasLevel = u.level >= 5;
                        // 2. Must have at least one device
                        const hasDevices = devices.some(d => Number(d.unit_id) === Number(u.id));
                        return hasLevel && hasDevices;
                      })
                      .map(u => {
                        const unitDeviceCount = devices.filter(d => Number(d.unit_id) === Number(u.id)).length;
                        return (
                          <option key={u.id} value={u.id}>
                            {u.name} ({unitDeviceCount} thiết bị)
                          </option>
                        );
                      })}
                  </select>
                </div>
              )}



              {scheduleType === 'news' && (
                <div className="premium-form-group content-search-container" style={{ position: 'relative' }}>
                  <label className="premium-label"><Layers size={14} /> Chọn Bản tin</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="premium-input"
                      placeholder="Tìm kiếm bản tin..."
                      value={contentSearchQuery || (contents.find(c => c.id === parseInt(newSchedule.content_id))?.title || '')}
                      onFocus={() => { setContentSearchQuery(''); setIsContentListOpen(true); }}
                      onChange={e => { setContentSearchQuery(e.target.value); setIsContentListOpen(true); }}
                      style={{ paddingRight: '40px' }}
                    />
                    <Search size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                    {isContentListOpen && (
                      <div className="glass-card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '5px', maxHeight: '200px', overflowY: 'auto', zIndex: 100, padding: '5px' }}>
                        {availableContents.map(c => (
                          <div key={c.id} onClick={() => { setNewSchedule({ ...newSchedule, content_id: c.id, radio_id: null, routine_id: null }); setContentSearchQuery(c.title); setIsContentListOpen(false); }} className="table-row-hover" style={{ padding: '10px 15px', borderRadius: '10px', cursor: 'pointer' }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{c.title}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {scheduleType === 'radio' && (
                <div className="premium-form-group">
                  <label className="premium-label"><Radio size={14} /> Chọn Đài Phát</label>
                  <select 
                    className="premium-select" 
                    value={newSchedule.radio_id || ''} 
                    onChange={e => {
                      const rId = e.target.value;
                      const rad = radios.find(r => r.id === parseInt(rId));
                      setNewSchedule({ ...newSchedule, radio_id: rId, content_id: null, routine_id: null });
                      setContentSearchQuery(rad?.name || '');
                    }}
                  >
                    <option value="">-- Chọn đài phát --</option>
                    {radios.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {scheduleType === 'routine' && (
                <div className="premium-form-group">
                  <label className="premium-label"><Clock size={14} /> Chọn Hiệu lệnh</label>
                  <select 
                    className="premium-select" 
                    value={newSchedule.routine_id || ''} 
                    onChange={e => {
                      const rId = e.target.value;
                      const rout = routines.find(r => r.id === parseInt(rId));
                      setNewSchedule({ ...newSchedule, routine_id: rId, content_id: null, radio_id: null });
                      setContentSearchQuery(rout?.title || '');
                    }}
                  >
                    <option value="">-- Chọn hiệu lệnh --</option>
                    {routines.map(r => (
                      <option key={r.id} value={r.id}>{r.title} {r.file_path ? '(Sẵn sàng)' : '(Chưa có file)'}</option>
                    ))}
                  </select>
                </div>
              )}

              {scheduleType === 'news' && (
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
              )}
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
                      const baseDate = selectedDate === 'all' ? new Date().toLocaleDateString('en-CA') : selectedDate;
                      const localDateObj = new Date(`${baseDate}T${time}:00`);
                      setNewSchedule({ ...newSchedule, scheduled_time: localDateObj.toISOString() });
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
