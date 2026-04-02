import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Settings,
  Users,
  Mic,
  LogOut,
  Calendar,
  Clock,
  Database,
  Bell,
  Cpu,
  Activity,
  Home,
  User,
  Shield,
  Key,
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  HardDrive,
  UserPlus,
  Sparkles,
  BookOpen,
  Languages,
  Plus,
  Trophy as TrophyIcon,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  Headphones,
} from 'lucide-react'
import './dashboardCSS.css'
import MediaLibrary from '../media/MediaLibrary'
import DeviceManagement from '../devices/DeviceManagement'
import UserManagement from '../users/UserManagement'
import ScheduleManagement from '../schedules/ScheduleManagement'
import SystemSettings from '../settings/SystemSettings'
import AIReview from '../ai/AIReview'
import ContentManagement from '../content/ContentManagement'
import MilitaryDictionary from '../settings/MilitaryDictionary'
import UserProfile from '../profile/UserProfile'
import Analytics from './Analytics'
import AuditLogs from '../settings/AuditLogs'
import ChannelMonitor from '../devices/ChannelMonitor'
import BroadcastHistory from '../reports/BroadcastHistory'
import RadioManagement from './RadioManagement'


interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  is_read: boolean;
  link?: string;
  sender_name?: string;
  priority?: 'low' | 'medium' | 'high';
  created_at: string;
}

interface DashboardStats {
  devices: { total: number; online: number };
  media: { total: number; totalSize: number };
  users: { total: number; pending: number };
  history: any[];
  proposals: number;
  pending_content: number;
}

export default function Dashboard({ user, onLogout }: { user: any, onLogout: () => void }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [auditLogInitialTab, setAuditLogInitialTab] = useState<'audit' | 'notifications'>('audit');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isEmergency, setIsEmergency] = useState(false)
  const [isLiveBroadcasting, setIsLiveBroadcasting] = useState(false);
  const [liveStream, setLiveStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [activeBroadcast, setActiveBroadcast] = useState<{ title: string, channel: string, user: string, channel_id?: number, schedule_id?: number, radio_id?: number, needsUnlock?: boolean, isPaused?: boolean, isHidden?: boolean } | null>(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const controlWsRef = useRef<WebSocket | null>(null);
  const isAudioEnabledRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const hlsRef = useRef<any>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    chung: true,
    vanhanh: true,
    bientap: true,
    quantri: false
  });
  const [radioOpsTab, setRadioOpsTab] = useState<'monitor' | 'mgmt'>('monitor');
  const [systemOpsTab, setSystemOpsTab] = useState<'schedule' | 'devices'>('schedule');
  const [contentMgmtTab, setContentMgmtTab] = useState<'content' | 'ai'>('content');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [showLocalMonitor, setShowLocalMonitor] = useState(false);

  const normalizeBroadcastData = (data: any) => {
    if (!data) return null;
    const content = data.content || data;
    return {
      title: data.title || data.content_title || (data.radio_name ? `Radio: ${data.radio_name}` : null) || content.title || content.content_title || 'Bản tin không tên',
      channel: data.channel || data.channel_name || content.channel || content.channel_name || 'Kênh hệ thống',
      user: data.user || data.author_name || data.created_by_name || content.user || content.author_name || 'Hệ thống',
      channel_id: data.channel_id || content.channel_id,
      schedule_id: data.schedule_id || content.schedule_id,
      radio_id: data.radio_id || content.radio_id,
      isPaused: data.isPaused || false,
      needsUnlock: false
    };
  };

  const handleStartBroadcast = (data: any) => {
    const normalized = normalizeBroadcastData(data);
    if (normalized) setActiveBroadcast(normalized);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    isAudioEnabledRef.current = isAudioEnabled;
    if (isAudioEnabled) {
      console.log('Dashboard: Audio mode enabled (unlocked)');
    }
  }, [isAudioEnabled]);

  console.log('Dashboard rendering', { activeTab, hasStats: !!stats, user, activeBroadcast })

  const dropdownRef = useRef<HTMLDivElement>(null)
  const notificationRef = useRef<HTMLDivElement>(null)

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  const fetchNotifications = async () => {
    try {
      const [notifsRes, countRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3000/notifications`, { headers: getHeaders() }),
        fetch(`http://${window.location.hostname}:3000/notifications/unread-count`, { headers: getHeaders() })
      ]);
      if (notifsRes.status === 401 || countRes.status === 401) {
        onLogout();
        return;
      }
      if (!notifsRes.ok || !countRes.ok) throw new Error('Failed to fetch notifications');
      const notifsData = await notifsRes.json();
      const countData = await countRes.json();
      setNotifications(Array.isArray(notifsData) ? notifsData : []);
      setUnreadCount(countData?.count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/dashboard/stats`, { headers: getHeaders() });
      if (!res.ok) {
        if (res.status === 401) {
          onLogout();
          return;
        }
        throw new Error(`Failed to fetch stats: ${res.status}`);
      }
      const data = await res.json();
      if (data && !data.error) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchTodaySchedules = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/schedules`, {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const today = new Date().toISOString().split('T')[0];
          const filtered = data.filter((s: any) => {
            const sDate = s.scheduled_time.split('T')[0];
            if (sDate === today) return true;
            if (s.repeat_pattern === 'daily') return sDate <= today;
            if (s.repeat_pattern === 'weekly') {
              const sDay = new Date(sDate).getDay();
              const targetDay = new Date(today).getDay();
              return sDate <= today && sDay === targetDay;
            }
            return false;
          });
          setTodaySchedules(filtered.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)));
        }
      }
    } catch (err) {
      console.error('Error fetching schedules:', err);
    }
  };

  const fetchEmergencyStatus = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/schedules/emergency/status`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setIsEmergency(data.active);
      }
    } catch (error) {
      console.error('Error fetching emergency status:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchStats();
    fetchTodaySchedules();
    fetchEmergencyStatus();
    const interval = setInterval(() => {
      fetchNotifications();
      fetchEmergencyStatus();
      if (activeTab === 'overview') {
        fetchStats();
        fetchTodaySchedules();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleNotificationClick = async (notif: Notification) => {
    // 1. Mark as read if not already
    if (!notif.is_read) {
      try {
        await fetch(`http://${window.location.hostname}:3000/notifications/${notif.id}/read`, {
          method: 'PATCH',
          headers: getHeaders()
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // 2. Navigate if link exists
    if (notif.link) {
      setActiveTab(notif.link);
      setIsNotificationOpen(false);
      console.log(`Navigating to tab: ${notif.link}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`http://${window.location.hostname}:3000/notifications/read-all`, {
        method: 'PATCH',
        headers: getHeaders()
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  useEffect(() => {
    const handleBroadcastStart = (data: any) => {
      console.log('Dashboard: [DEBUG] broadcast-start received:', data);

      const broadcastData = normalizeBroadcastData(data);
      const fileUrl = data.file_url || (data.content && data.content.file_url) || (data.radio && data.radio.url);
      
      if (broadcastData) setActiveBroadcast(broadcastData);

      if (!fileUrl) {
        console.warn('Dashboard: [DEBUG] Missing file_url in data!');
        return;
      }

      console.log('Dashboard: [DEBUG] Setting audio src:', fileUrl);
      if (audioRef.current) {
        const audio = audioRef.current;

        // Clean up previous HLS instance if any
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }

        // Check if it's an HLS stream (.m3u8)
        if (fileUrl.endsWith('.m3u8') && (window as any).Hls) {
          console.log('Dashboard: [DEBUG] HLS.js detected, initializing stream...');
          const hls = new (window as any).Hls();
          hls.loadSource(fileUrl);
          hls.attachMedia(audio);
          hlsRef.current = hls;

          hls.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
            audio.play().catch(err => {
              if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
                console.warn('Dashboard: [DEBUG] HLS Playback error:', err.message);
              }
              setIsAudioEnabled(false);
              isAudioEnabledRef.current = false;
              // Show notification or visual cue that audio is blocked
              setUnreadCount(prev => prev + 1);
              setNotifications(prev => [{
                id: Date.now(),
                title: 'Âm thanh bị chặn',
                message: 'Trình duyệt đã chặn tự động phát. Vui lòng nhấn "Nhấn để nghe" trên thanh trạng thái.',
                type: 'warning',
                is_read: false,
                created_at: new Date().toISOString()
              }, ...prev]);
            });
          });
        } else {
          // Standard MP3/WAV playback
          audio.src = fileUrl;
          audio.load();

          audio.play().then(() => {
            console.log('Dashboard: [DEBUG] ✅ Autoplay success!');
            setIsAudioEnabled(true);
            isAudioEnabledRef.current = true;
          }).catch((err) => {
            if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
              console.warn('Dashboard: [DEBUG] ❌ Playback error:', err.message);
            }
            setIsAudioEnabled(false);
            isAudioEnabledRef.current = false;
          });
        }
      }
    };

    const handleBroadcastStop = () => {
      const audio = audioRef.current;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audio && audio.src) {
        audio.pause();
        audio.src = '';
      }
      setActiveBroadcast(null);
    };

    const handleBroadcastPause = () => {
      if (audioRef.current) audioRef.current.pause();
      setActiveBroadcast(prev => prev ? { ...prev, isPaused: true } : null);
    };

    const handleBroadcastResume = () => {
      if (audioRef.current && isAudioEnabledRef.current) {
        audioRef.current.play().catch(() => {});
      }
      setActiveBroadcast(prev => prev ? { ...prev, isPaused: false } : null);
    };

    let statusWs: WebSocket | null = null;
    let shouldReconnect = true;

    const connectWS = () => {
      if (!shouldReconnect) return;

      const wsUrl = `ws://127.0.0.1:3000/ws`;
      console.log('Dashboard: Connecting to status WebSocket:', wsUrl);
      statusWs = new WebSocket(wsUrl);

      statusWs.onopen = () => {
        console.log('Dashboard: WebSocket status connected');
        setWsStatus('online');
        controlWsRef.current = statusWs;
      };

      statusWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'broadcast-start') {
            handleBroadcastStart(data);
          } else if (data.type === 'broadcast-pause') {
            handleBroadcastPause();
          } else if (data.type === 'broadcast-resume') {
            handleBroadcastResume();
          } else if (data.type === 'broadcast-stop' || data.type === 'emergency_status_change') {
            if (data.type === 'emergency_status_change') setIsEmergency(data.active);
            handleBroadcastStop();
          }
        } catch (err) {
          console.error('Dashboard: WS parse error', err);
        }
      };

      statusWs.onclose = (event) => {
        if (shouldReconnect) {
          console.warn('Dashboard: WebSocket disconnected, retrying in 3s...', event.code);
          setWsStatus('offline');
          setTimeout(connectWS, 3000);
        } else {
          console.log('Dashboard: WebSocket closed intentionally');
        }
      };

      statusWs.onerror = (err) => {
        console.error('Dashboard: WebSocket error', err);
        setWsStatus('offline');
      };
    };

    connectWS();

    return () => {
      console.log('Dashboard: Cleaning up WebSocket effect');
      shouldReconnect = false;
      if (statusWs) {
        statusWs.onclose = null; // Prevent onclose from firing during cleanup
        statusWs.close();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (ws) ws.close();
      if (liveStream) liveStream.getTracks().forEach(track => track.stop());
    };
  }, [ws, liveStream])

  const startLiveBroadcast = async () => {
    let currentStream: MediaStream | null = null;
    let currentWs: WebSocket | null = null;
    let audioCtx: AudioContext | null = null;

    try {
      console.log('STEP 1: Requesting microphone access...');
      currentStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // STEP 1.1: Bridge through AudioContext to "clean" the hardware stream
      // This solves many "NotSupportedError" issues by normalizing the stream
      console.log('STEP 1.2: Normalizing stream through AudioContext bridge...');
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 });
      const source = audioCtx.createMediaStreamSource(currentStream);
      const destination = audioCtx.createMediaStreamDestination();
      source.connect(destination);

      const cleanStream = destination.stream;
      setLiveStream(currentStream);

      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:3000/ws`;
      console.log(`STEP 3: Connecting to ${wsUrl}`);
      currentWs = new WebSocket(wsUrl);

      currentWs.onopen = async () => {
        try {
          console.log('STEP 4: WebSocket Connected. Initializing recorder with CLEAN stream...');
          setIsLiveBroadcasting(true);
          currentWs?.send(JSON.stringify({ type: 'broadcast-start', user: user?.full_name || 'Admin' }));

          await new Promise(resolve => setTimeout(resolve, 500));

          // Select simplest supported type
          let options: any = {};
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            options = { mimeType: 'audio/webm;codecs=opus' };
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
          }

          console.log('STEP 5: Starting MediaRecorder with bridged stream...');
          const recorder = new MediaRecorder(cleanStream, options);

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && currentWs?.readyState === WebSocket.OPEN) {
              currentWs.send(event.data);
            }
          };

          recorder.start(1000);

          setMediaRecorder(recorder);
          setWs(currentWs);
          console.log('STEP 6: BROADCAST ACTIVE');
        } catch (error: any) {
          console.error('STEP 4.F: Bridge/Start Failure:', error);
          alert(`Lỗi khởi động (Bridge Error: ${error.name}): ${error.message}\n\nMẹo: Bạn hãy thử cắm lại Micro hoặc sử dụng trình duyệt Chrome/Edge bản mới nhất.`);
          cleanup();
        }
      };

      currentWs.onclose = () => cleanup();
      currentWs.onerror = () => cleanup();

    } catch (err: any) {
      console.error('Final Error Catch:', err);
      alert(`Không thể kích hoạt: ${err.message}`);
      cleanup();
    }

    function cleanup() {
      setIsLiveBroadcasting(false);
      if (currentWs) currentWs.close();
      if (currentStream) currentStream.getTracks().forEach(t => t.stop());
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
      setWs(null);
      setLiveStream(null);
      setMediaRecorder(null);
    }
  };

  const stopLiveBroadcast = () => {
    if (mediaRecorder) mediaRecorder.stop();
    if (ws) {
      ws.send(JSON.stringify({ type: 'broadcast-stop' }));
      ws.close();
    }
    if (liveStream) liveStream.getTracks().forEach(track => track.stop());

    setWs(null);
    setMediaRecorder(null);
    setLiveStream(null);
    setIsLiveBroadcasting(false);
  };
  
  const stopBroadcast = () => {
    if (controlWsRef.current && controlWsRef.current.readyState === WebSocket.OPEN) {
      controlWsRef.current.send(JSON.stringify({ 
        type: 'broadcast-stop',
        channel_id: activeBroadcast?.channel_id || 0 // Default to global if not known
      }));
      setActiveBroadcast(null);
    } else {
      alert('Không thể kết nối tới máy chủ để dừng phát.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('openclaw_token')
    onLogout()
    navigate('/login')
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} color="#10b981" />;
      case 'warning': return <AlertTriangle size={18} color="#f59e0b" />;
      case 'error': return <XCircle size={18} color="#ef4444" />;
      default: return <Info size={18} color="#6366f1" />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSafeTime = (dateStr: string | undefined) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('vi-VN');
  };

  const formatSafeDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--/--/--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--/--/--';
    return d.toLocaleDateString('vi-VN');
  };

  const formatSafeDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('vi-VN');
  };

  return (
    <div className="dashboard-container ani-fade-in">
      {isEmergency && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.9)',
          backdropFilter: 'blur(20px)',
          color: 'white',
          padding: '16px',
          textAlign: 'center',
          fontWeight: 900,
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 10px 30px rgba(239, 68, 68, 0.3)',
          zIndex: 2000,
          position: 'sticky',
          top: 0
        }} className="ani-pulse">
          <AlertTriangle size={28} className="ani-bounce" />
          <span style={{ letterSpacing: '2px' }}>CẢNH BÁO: HỆ THỐNG ĐANG TRONG TRẠNG THÁI PHÁT BÁO ĐỘNG KHẨN CẤP!</span>
          <AlertTriangle size={28} className="ani-bounce" />
        </div>
      )}
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)'
          }}>
            <Radio size={32} className="text-blue-400 ani-pulse" />
          </div>
          <div>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-1px', display: 'block', lineHeight: 1, color: 'white' }}>OpenClaw</span>
            <span style={{ fontSize: '0.75rem', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, marginTop: '4px', display: 'block' }}>VNI BROADCAST V2.1</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* WebSocket Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`Kết nối máy chủ: ${wsStatus}`}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: wsStatus === 'online' ? '#10b981' : wsStatus === 'connecting' ? '#f59e0b' : '#ef4444',
              boxShadow: wsStatus === 'online' ? '0 0 8px #10b981' : 'none'
            }} />
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 600 }}>WS</span>
          </div>

          {activeBroadcast && activeBroadcast.isHidden && (
            <button 
              onClick={() => setActiveBroadcast(prev => prev ? { ...prev, isHidden: false } : null)}
              className="ani-pulse hover-scale"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.5)',
                padding: '6px 12px',
                borderRadius: '10px',
                color: '#10b981',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem'
              }}
              title="Mở lại điều khiển phát thanh"
            >
              <Radio size={16} /> Đang phát...
            </button>
          )}

          <div style={{ position: 'relative' }} ref={notificationRef}>
            <div style={{ cursor: 'pointer' }} onClick={() => setIsNotificationOpen(!isNotificationOpen)}>
              <Bell size={24} color={unreadCount > 0 ? "#818cf8" : "#94a3b8"} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '-5px', right: '-5px', width: '18px', height: '18px',
                  background: '#f87171', borderRadius: '50%', border: '2px solid #000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 800, color: 'white'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </div>

            {isNotificationOpen && (
              <div className="profile-dropdown ani-scale-in" style={{ width: '380px', right: '0', top: '50px' }}>
                <div className="dropdown-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Thông báo</h3>
                  <button onClick={handleMarkAllAsRead} style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Đánh dấu đã đọc</button>
                </div>
                <div className="dropdown-divider" />
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      <Bell size={32} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                      <p>Không có thông báo mới</p>
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className="dropdown-item notification-item"
                        style={{
                          padding: '1.2rem 1.5rem',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          background: notif.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.05)',
                          borderLeft: notif.priority === 'high' ? '4px solid #ef4444' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => handleNotificationClick(notif)}>
                        <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '4px' }}>
                          <div style={{ marginTop: '2px' }}>{getNotifIcon(notif.type)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: notif.is_read ? '#94a3b8' : '#f8fafc' }}>{notif.title}</div>
                              {notif.priority === 'high' && <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>KHẨN</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px', lineHeight: 1.4 }}>{notif.message}</div>
                            {notif.sender_name && (
                              <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={12} /> {notif.sender_name}
                              </div>
                            )}
                          </div>
                          {!notif.is_read && <div style={{ width: '8px', height: '8px', background: '#6366f1', borderRadius: '50%', marginTop: '6px' }} />}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#475569', marginLeft: '30px', marginTop: '4px' }}>
                          {formatSafeTime(notif.created_at)} • {formatSafeDate(notif.created_at)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="dropdown-divider" />
                <div
                  className="dropdown-item"
                  style={{ justifyContent: 'center', color: '#6366f1', fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {
                    setAuditLogInitialTab('notifications');
                    setActiveTab('audit-logs');
                    setIsNotificationOpen(false);
                  }}
                >
                  Xem tất cả hoạt động
                </div>
              </div>
            )}
          </div>

          <div className="user-profile-container" ref={dropdownRef}>
            <div className="user-profile-trigger" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{user?.full_name || 'Admin'}</p>
                <p style={{ margin: 0, color: '#6366f1', fontSize: '0.75rem', fontWeight: 700 }}>{user?.rank || 'Operator'}</p>
              </div>
              <div className="user-avatar">{user?.username?.substring(0, 1)?.toUpperCase() || 'A'}</div>
            </div>

            {isDropdownOpen && (
              <div className="profile-dropdown ani-scale-in" style={{ top: '60px' }}>
                <div className="dropdown-header">
                  <p className="dropdown-name">{user?.full_name || 'Admin'}</p>
                  <p className="dropdown-email">{user?.email || 'admin@openclaw.com'}</p>
                </div>
                <div className="dropdown-divider" />
                <div className="dropdown-item" onClick={() => { setActiveTab('profile'); setIsDropdownOpen(false); }}><User size={18} /><span>Thông tin cá nhân</span></div>
                <div className="dropdown-item"><Shield size={18} /><span>Quyền hạn: {user?.rank || 'Admin'}</span></div>
                <div className="dropdown-item" onClick={() => { setActiveTab('profile'); setIsDropdownOpen(false); }}><Key size={18} /><span>Đổi mật khẩu</span></div>
                <div className="dropdown-divider" />
                <div className="dropdown-item logout" onClick={handleLogout}><LogOut size={18} /><span>Đăng xuất</span></div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{ position: 'relative' }}>
          {/* Nút Toggle thu gọn Sidebar */}
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="sidebar-toggle-btn"
            title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isSidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* NHÓM 1: CHUNG */}
            {!isSidebarCollapsed && (
              <div className="sidebar-section-header" onClick={() => toggleSection('chung')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Chung</span>
                {expandedSections.chung ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            )}
            <AnimatePresence initial={false}>
              {(expandedSections.chung || isSidebarCollapsed) && (
                <motion.div
                  initial={isSidebarCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} title={isSidebarCollapsed ? "Tổng quan" : ""}>
                    <Home size={20} />
                    {!isSidebarCollapsed && <span>Tổng quan</span>}
                  </div>
                  <div className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')} title={isSidebarCollapsed ? "Thi đua & Thống kê" : ""}>
                    <TrophyIcon size={20} />
                    {!isSidebarCollapsed && <span>Thi đua & Thống kê</span>}
                  </div>
                  {(user?.role_name === 'admin') && (
                    <div className={`nav-item ${activeTab === 'audit-logs' ? 'active' : ''}`} onClick={() => setActiveTab('audit-logs')} title={isSidebarCollapsed ? "Nhật ký Hoạt động" : ""}>
                      <Database size={20} />
                      {!isSidebarCollapsed && <span>Nhật ký Hoạt động</span>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* NHÓM 2: VẬN HÀNH */}
            {!isSidebarCollapsed && (
              <div className="sidebar-section-header" onClick={() => toggleSection('vanhanh')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <span>Vận hành</span>
                {expandedSections.vanhanh ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            )}
            <AnimatePresence initial={false}>
              {(expandedSections.vanhanh || isSidebarCollapsed) && (
                <motion.div
                  initial={isSidebarCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  {(user?.role_name === 'admin' || user?.role_name === 'technician' || user?.role_name === 'commander') && (
                    <div className={`nav-item ${activeTab === 'system-ops' ? 'active' : ''}`} onClick={() => setActiveTab('system-ops')} title={isSidebarCollapsed ? "Vận hành Hệ thống" : ""}>
                      <Cpu size={20} />
                      {!isSidebarCollapsed && <span>Vận hành Hệ thống</span>}
                    </div>
                  )}
                   {(user?.role_name === 'admin' || user?.role_name === 'technician' || user?.role_name === 'commander' || user?.role_name === 'broadcaster') && (
                    <div className={`nav-item ${activeTab === 'radio-ops' ? 'active' : ''}`} onClick={() => setActiveTab('radio-ops')} title={isSidebarCollapsed ? "Điều hành Kênh & Radio" : ""}>
                      <Radio size={20} />
                      {!isSidebarCollapsed && <span>Điều hành Kênh & Radio</span>}
                    </div>
                  )}
                  {(user?.role_name === 'admin' || user?.role_name === 'technician' || user?.role_name === 'commander') && (
                    <div className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')} title={isSidebarCollapsed ? "Lịch sử & Báo cáo" : ""}>
                      <Info size={20} />
                      {!isSidebarCollapsed && <span>Lịch sử & Báo cáo</span>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* NHÓM 3: BIÊN TẬP */}
            {!isSidebarCollapsed && (
              <div className="sidebar-section-header" onClick={() => toggleSection('bientap')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <span>Biên tập</span>
                {expandedSections.bientap ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            )}
            <AnimatePresence initial={false}>
              {(expandedSections.bientap || isSidebarCollapsed) && (
                <motion.div
                  initial={isSidebarCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  {(user?.role_name === 'admin' || user?.role_name === 'editor' || user?.role_name === 'commander') && (
                    <div className={`nav-item ${activeTab === 'content-mgmt' ? 'active' : ''}`} onClick={() => setActiveTab('content-mgmt')} title={isSidebarCollapsed ? "Quản Lý Nội dung" : ""}>
                      <BookOpen size={20} />
                      {!isSidebarCollapsed && <span>Quản Lý Nội dung</span>}
                    </div>
                  )}
                   {(user?.role_name === 'admin' || user?.role_name === 'technician' || user?.role_name === 'commander' || user?.role_name === 'broadcaster') && (
                    <div className={`nav-item ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')} title={isSidebarCollapsed ? "Thư viện Media" : ""}>
                      <Database size={20} />
                      {!isSidebarCollapsed && <span>Thư viện Media</span>}
                    </div>
                  )}
                  {(user?.role_name === 'admin' || user?.role_name === 'editor') && (
                    <div className={`nav-item ${activeTab === 'dictionary' ? 'active' : ''}`} onClick={() => setActiveTab('dictionary')} title={isSidebarCollapsed ? "Từ điển Quân sự" : ""}>
                      <Languages size={20} />
                      {!isSidebarCollapsed && <span>Từ điển Quân sự</span>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* NHÓM 4: QUẢN TRỊ */}
            {!isSidebarCollapsed && (
              <div className="sidebar-section-header" onClick={() => toggleSection('quantri')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                <span>Quản trị</span>
                {expandedSections.quantri ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
            )}
            <AnimatePresence initial={false}>
              {(expandedSections.quantri || isSidebarCollapsed) && (
                <motion.div
                  initial={isSidebarCollapsed ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  {(user?.role_name === 'admin' || user?.role_name === 'commander') && (
                    <div className={`nav-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')} title={isSidebarCollapsed ? "Quản lý nhân sự" : ""}>
                      <Users size={20} />
                      {!isSidebarCollapsed && <span>Quản lý nhân sự</span>}
                    </div>
                  )}
                  {(user?.role_name === 'admin') && (
                    <div className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')} title={isSidebarCollapsed ? "Cấu hình hệ thống" : ""}>
                      <Settings size={20} />
                      {!isSidebarCollapsed && <span>Cấu hình hệ thống</span>}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </nav>
          <div className="nav-item" onClick={handleLogout} style={{ color: '#f87171', marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', background: 'transparent' }}><LogOut size={20} /><span>Đăng xuất</span></div>
        </aside>

        <main className="main-content" style={{ position: 'relative', overflowX: 'hidden' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ width: '100%', height: '100%' }}
            >
              {activeBroadcast && !activeBroadcast.isHidden && (
                <div className="animate-slide-down" style={{ marginBottom: '1.5rem' }}>
                  <div className="action-card" style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(99, 102, 241, 0.08))',
                    border: '1px solid rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1.5rem',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '16px',
                    boxShadow: '0 8px 32px -4px rgba(0,0,0,0.2)'
                  }}>
                    <div className="mic-pulse active-recording" style={{ 
                      background: '#10b981', 
                      width: '38px', 
                      height: '38px', 
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '12px'
                    }}>
                      <Radio size={18} color="white" className="ani-pulse" />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ padding: '1px 6px', background: '#10b981', borderRadius: '4px', fontSize: '0.55rem', fontWeight: 900, color: 'white', letterSpacing: '0.5px' }}>LIVE</span>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{activeBroadcast.title}</h3>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
                        <span>Kênh: <strong style={{ color: '#94a3b8' }}>{activeBroadcast.channel}</strong></span>
                        <span style={{ opacity: 0.3 }}>|</span>
                        <span>Bởi: <strong style={{ color: '#94a3b8' }}>{activeBroadcast.user}</strong></span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>


                      {activeBroadcast.isPaused ? (
                        <button
                          onClick={() => {
                            if (controlWsRef.current?.readyState === WebSocket.OPEN) {
                              controlWsRef.current.send(JSON.stringify({ 
                                type: 'broadcast-resume', 
                                channel_id: activeBroadcast.channel_id || 0 
                              }));
                            }
                          }}
                          className="hover-scale"
                          style={{ 
                            padding: '6px 20px', 
                            fontSize: '0.85rem', 
                            background: 'linear-gradient(135deg, #10b981, #059669)', 
                            border: 'none',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                            color: 'white',
                            fontWeight: 700,
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            height: '38px',
                            cursor: 'pointer'
                          }}
                        >
                          <Play size={16} fill="white" /> TIẾP TỤC
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (controlWsRef.current?.readyState === WebSocket.OPEN) {
                              controlWsRef.current.send(JSON.stringify({ 
                                type: 'broadcast-pause', 
                                channel_id: activeBroadcast.channel_id || 0 
                              }));
                            }
                          }}
                          className="hover-scale"
                          style={{ 
                            padding: '6px 20px', 
                            fontSize: '0.85rem', 
                            background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                            border: 'none',
                            borderRadius: '10px',
                            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                            color: 'white',
                            fontWeight: 700,
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            height: '38px',
                            cursor: 'pointer'
                          }}
                        >
                          <Pause size={16} fill="white" /> TẠM DỪNG
                        </button>
                      )}
                      
                      <button
                        onClick={stopBroadcast}
                        className="btn-danger"
                        style={{ padding: '6px 16px', fontSize: '0.8rem', background: '#ef4444', height: '36px' }}
                      >
                        Dừng phát
                      </button>
                      <button
                        onClick={() => setActiveBroadcast(prev => prev ? { ...prev, isHidden: true } : null)}
                        style={{ 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid rgba(255,255,255,0.1)', 
                          color: '#94a3b8', 
                          padding: '6px 16px', 
                          fontSize: '0.8rem', 
                          borderRadius: '8px', 
                          cursor: 'pointer',
                          height: '36px'
                        }}
                      >
                        Ẩn
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {(() => {
                try {
                  console.log('Rendering content for tab:', activeTab);
                  switch (activeTab) {
                    case 'overview':
                      return (
                        <div className="animate-fade-in">
                          <div style={{ marginBottom: '2.5rem' }}>
                            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Chào buổi chiều, {user?.full_name?.split(' ')?.pop() || 'bạn'}!</h1>
                            <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.5rem' }}>Hệ thống đang sẵn sàng cho các lượt truyền tin tiếp theo.</p>
                          </div>


                          <section className="section-container">
                            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
                              <div className="stat-card" style={{ cursor: 'pointer', borderTop: '4px solid #10b981' }} onClick={() => setActiveTab('devices')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ width: '50px', height: '50px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={28} color="#10b981" /></div>
                                  <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 800, background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>ONLINE</span>
                                </div>
                                <p style={{ color: '#94a3b8', marginTop: '2rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>CỤM LOA TRỰC TUYẾN</p>
                                <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #10b981 100%)', WebkitBackgroundClip: 'text' }}>{stats?.devices?.online || 0} / {stats?.devices?.total || 0}</div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Thiết bị đang sẵn sàng phát tin</p>
                              </div>
                              <div className="stat-card" style={{ cursor: 'pointer', borderTop: '4px solid #6366f1' }} onClick={() => setActiveTab('media')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ width: '50px', height: '50px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><HardDrive size={28} color="#6366f1" /></div>
                                  <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>{stats ? formatBytes(stats.media.totalSize) : '--'}</span>
                                </div>
                                <p style={{ color: '#94a3b8', marginTop: '2rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>KHO BẢN TIN MEDIA</p>
                                <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #6366f1 100%)', WebkitBackgroundClip: 'text' }}>{stats?.media?.total || 0}</div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '1rem', overflow: 'hidden' }}>
                                  <div className="ani-pulse" style={{ width: '35%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '10px' }} />
                                </div>
                              </div>
                              <div className="stat-card" style={{ cursor: 'pointer', borderTop: '4px solid #f59e0b' }} onClick={() => setActiveTab('users')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ width: '50px', height: '50px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><UserPlus size={28} color="#f59e0b" /></div>
                                  {(stats?.users?.pending || 0) > 0 ? (
                                    <span className="ani-bounce" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 800, background: '#ef4444', padding: '4px 12px', borderRadius: '20px' }}>{stats?.users?.pending} CHỜ DUYỆT</span>
                                  ) : (
                                    <span style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 800, background: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>NHÂN SỰ</span>
                                  )}
                                </div>
                                <p style={{ color: '#94a3b8', marginTop: '2rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>NHÂN SỰ HỆ THỐNG</p>
                                <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text' }}>{stats?.users?.total || 0}</div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Tổng số vận hành viên & quản trị</p>
                              </div>
                              <div className="stat-card" style={{ cursor: 'pointer', borderTop: '4px solid #6366f1' }} onClick={() => setActiveTab('system-ops')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ width: '50px', height: '50px', background: 'rgba(99, 102, 241, 0.15)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={28} color="#6366f1" /></div>
                                  <span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 800, background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>HÔM NAY</span>
                                </div>
                                <p style={{ color: '#94a3b8', marginTop: '2rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>KHUNG GIỜ ĐÃ ĐẶT</p>
                                <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #6366f1 100%)', WebkitBackgroundClip: 'text' }}>{todaySchedules.length}</div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Tổng số lượt phát sóng trong ngày</p>
                              </div>
                              <div className="stat-card" style={{ cursor: 'pointer', borderTop: '4px solid #ec4899' }} onClick={() => setActiveTab('content-mgmt')}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ width: '50px', height: '50px', background: 'rgba(236, 72, 153, 0.15)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sparkles size={28} color="#ec4899" /></div>
                                  {(stats?.pending_content || 0) > 0 ? (
                                    <span className="ani-pulse" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 800, background: '#ec4899', padding: '4px 12px', borderRadius: '20px' }}>{stats?.pending_content} CẦN DUYỆT</span>
                                  ) : (
                                    <span style={{ fontSize: '0.85rem', color: '#ec4899', fontWeight: 800, background: 'rgba(236, 72, 153, 0.1)', padding: '4px 12px', borderRadius: '20px' }}>KIỂM DUYỆT</span>
                                  )}
                                </div>
                                <p style={{ color: '#94a3b8', marginTop: '2rem', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', letterSpacing: '1px' }}>Duyệt bản tin AI</p>
                                <div className="stat-value" style={{ background: 'linear-gradient(135deg, #fff 0%, #ec4899 100%)', WebkitBackgroundClip: 'text' }}>{stats?.pending_content || 0}</div>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Bản tin cần rà soát & phê duyệt</p>
                              </div>
                            </div>
                          </section>

                          <section className="section-container">
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Clock size={24} color="#6366f1" /> Lịch phát hôm nay
                            </h2>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                              {todaySchedules.length === 0 ? (
                                <div className="stat-card" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                                  Chưa có lịch phát nào được thiết lập cho hôm nay.
                                </div>
                              ) : (
                                todaySchedules.slice(0, 5).map((s, idx) => (
                                  <div key={idx} className="stat-card schedule-item-mini" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', borderLeft: '4px solid #6366f1' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                      <div className="schedule-time-badge" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#6366f1', minWidth: '60px' }}>
                                        {new Date(s.scheduled_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                      <div>
                                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f1f5f9' }}>{s.content_title}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Radio size={12} /> {s.channel_name}</span>
                                          <span>• {s.repeat_pattern === 'daily' ? 'Hàng ngày' : s.repeat_pattern === 'weekly' ? 'Hàng tuần' : 'Một lần'}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <button 
                                      className="btn-secondary" 
                                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }}
                                      onClick={() => {
                                        setActiveTab('system-ops');
                                        setSystemOpsTab('schedule');
                                      }}
                                    >
                                      Chi tiết
                                    </button>
                                  </div>
                                ))
                              )}
                              {todaySchedules.length > 5 && (
                                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                  <button 
                                    style={{ background: 'transparent', border: 'none', color: '#6366f1', fontSize: '0.9rem', padding: '10px', cursor: 'pointer', fontWeight: 700 }}
                                    onClick={() => {
                                      setActiveTab('system-ops');
                                      setSystemOpsTab('schedule');
                                    }}
                                  >
                                    Xem tất cả {todaySchedules.length} khung giờ...
                                  </button>
                                </div>
                              )}
                            </div>
                          </section>

                          <section className="section-container">
                            <div className="action-card relative overflow-hidden" style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3rem',
                              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}>
                              {/* Animated background decoration */}
                              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl transition-all duration-700"></div>

                              <div className={`mic-pulse ${isLiveBroadcasting ? 'active-recording' : ''}`} style={{ width: '80px', height: '80px', borderRadius: '24px' }}>
                                <Mic size={40} color="white" />
                              </div>
                              <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                                <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
                                  {isLiveBroadcasting ? 'ĐANG PHÁT TRỰC TIẾP...' : 'Phát thanh Thông báo'}
                                </h3>
                                <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '8px', maxWidth: '600px', lineHeight: 1.6 }}>
                                  {isLiveBroadcasting ? 'Giọng nói của bạn đang được truyền tải tới toàn bộ hệ thống loa với độ trễ cực thấp.' : 'Sử dụng Microphone để thông báo nhanh tới tất cả các khu vực trong đơn vị.'}
                                </p>
                              </div>
                              <button
                                className={`btn-primary ${isLiveBroadcasting ? 'btn-danger' : ''}`}
                                onClick={isLiveBroadcasting ? stopLiveBroadcast : startLiveBroadcast}
                                style={{
                                  padding: '16px 40px',
                                  borderRadius: '18px',
                                  fontSize: '1.1rem',
                                  fontWeight: 900,
                                  boxShadow: isLiveBroadcasting ? '0 15px 30px rgba(239, 68, 68, 0.3)' : '0 15px 30px rgba(99, 102, 241, 0.3)',
                                  background: isLiveBroadcasting ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                  position: 'relative',
                                  zIndex: 10
                                }}
                              >
                                {isLiveBroadcasting ? 'DỪNG PHÁT THÔNG BÁO' : 'KÍCH HOẠT MICROPHONE'}
                              </button>
                            </div>
                          </section>

                          <section className="section-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, color: 'white' }}>Lịch sử phát sóng gần đây</h2>
                              <button onClick={() => setActiveTab('schedule')} className="flex items-center gap-2" style={{ color: '#818cf8', background: 'rgba(129, 140, 248, 0.1)', border: 'none', padding: '8px 16px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.3s' }}>
                                Xem tất cả <Plus size={16} />
                              </button>
                            </div>
                            <div className="glass-card overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              {!stats?.history?.length ? (
                                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                                  <Radio size={48} style={{ margin: '0 auto 1rem', opacity: 0.1 }} />
                                  <p style={{ fontSize: '1.1rem' }}>Hệ thống chưa ghi nhận lượt phát sóng nào gần đây.</p>
                                </div>
                              ) : (
                                stats.history.map((record: any) => (
                                  <div key={record.id} className="transition-all duration-300" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{
                                      width: '50px',
                                      height: '50px',
                                      borderRadius: '16px',
                                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1))',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      border: '1px solid rgba(99, 102, 241, 0.2)'
                                    }}>
                                      <Radio size={24} color="#818cf8" className="transition-transform" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem', color: '#f8fafc' }}>{record.content_title}</p>
                                      <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: '#818cf8', fontWeight: 600 }}>#{record.channel_name}</span>
                                        <span>•</span>
                                        <span style={{ opacity: 0.8 }}>{formatSafeDateTime(record.start_time)}</span>
                                      </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                      <span style={{
                                        fontSize: '0.75rem',
                                        color: '#10b981',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        padding: '6px 14px',
                                        borderRadius: '12px',
                                        fontWeight: 800,
                                        border: '1px solid rgba(16, 185, 129, 0.2)'
                                      }}>ĐÃ HOÀN TẤT</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </section>
                        </div>
                      );
                    case 'schedule': return <ScheduleManagement onLogout={onLogout} activeBroadcast={activeBroadcast} onStopBroadcast={stopBroadcast} onStartBroadcast={handleStartBroadcast} />;
                    case 'content': return <ContentManagement user={user} onLogout={onLogout} />;
                    case 'media': return <MediaLibrary onLogout={onLogout} />;
                    case 'system-ops':
                      return (
                        <div className="animate-fade-in">
                          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setSystemOpsTab('schedule')} className={systemOpsTab === 'schedule' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', minWidth: '140px' }}>Lịch phát thanh</button>
                            <button onClick={() => setSystemOpsTab('devices')} className={systemOpsTab === 'devices' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', minWidth: '140px' }}>Quản lý Thiết bị</button>
                          </div>
                          {systemOpsTab === 'schedule' ? <ScheduleManagement onLogout={onLogout} activeBroadcast={activeBroadcast} onStopBroadcast={stopBroadcast} onStartBroadcast={handleStartBroadcast} /> : <DeviceManagement onLogout={onLogout} />}
                        </div>
                      );
                    case 'radio-ops':
                      return (
                        <div className="animate-fade-in">
                          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setRadioOpsTab('monitor')} className={radioOpsTab === 'monitor' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', minWidth: '140px' }}>Giám sát Kênh</button>
                            <button onClick={() => setRadioOpsTab('mgmt')} className={radioOpsTab === 'mgmt' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', minWidth: '140px' }}>Quản lý Radio</button>
                          </div>
                          {radioOpsTab === 'monitor' ? <ChannelMonitor onLogout={onLogout} /> : <RadioManagement onLogout={onLogout} />}
                        </div>
                      );
                    case 'content-mgmt':
                      return (
                        <div className="animate-fade-in">
                          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '14px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <button onClick={() => setContentMgmtTab('content')} className={contentMgmtTab === 'content' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', minWidth: '140px' }}>Quản lý Bản tin</button>
                            <button onClick={() => setContentMgmtTab('ai')} className={contentMgmtTab === 'ai' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 24px', borderRadius: '10px', fontSize: '0.9rem', minWidth: '140px' }}>Kiểm duyệt & Phê duyệt</button>
                          </div>
                          {contentMgmtTab === 'content' ? <ContentManagement user={user} onLogout={onLogout} /> : <AIReview user={user} onLogout={onLogout} />}
                        </div>
                      );
                    case 'devices': return <DeviceManagement onLogout={onLogout} />;
                    case 'users': return <UserManagement user={user} onLogout={onLogout} />;
                    case 'ai': return <AIReview user={user} onLogout={onLogout} />;
                    case 'dictionary': return <MilitaryDictionary onLogout={onLogout} />;
                    case 'settings': return <SystemSettings onLogout={onLogout} />;
                    case 'profile': return <UserProfile onLogout={onLogout} />;
                    case 'analytics': return <Analytics onLogout={onLogout} />;
                    case 'reports': return <BroadcastHistory onLogout={onLogout} />;

                    case 'audit-logs': return <AuditLogs initialTab={auditLogInitialTab} />;
                    default: return <div>Tab không hợp lệ: {activeTab}</div>;
                  }
                } catch (err: any) {
                  console.error('Lỗi khi render tab ' + activeTab + ':', err);
                  return (
                    <div style={{ padding: '3rem', textAlign: 'center' }}>
                      <h2 style={{ color: '#ef4444' }}>Đã xảy ra lỗi khi hiển thị nội dung</h2>
                      <p style={{ color: '#94a3b8' }}>{err.message || 'Lỗi không xác định'}</p>
                      <button onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: '1rem' }}>Tải lại trang</button>
                    </div>
                  );
                }
              })()}
            </motion.div>
          </AnimatePresence>

         
        </main>

        {/* Thẻ audio ẩn để đảm bảo tính thương thích cao nhất */}
        <audio ref={audioRef} style={{ display: 'none' }} />
        
        <style>{`
          .hover-scale {
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }
          .hover-scale:hover {
            transform: scale(1.05);
            filter: brightness(1.1);
          }
          .hover-scale:active {
            transform: scale(0.95);
          }
        `}</style>
      </div>
    </div>
  )
}
