import { useState, useEffect, useRef } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Radio, 
  Activity, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  Clock,
  User,
  Music
} from 'lucide-react';

const SOCKET_URL = `ws://${window.location.hostname}:3000/ws`;

const BroadcastTerminal = () => {
  const [status, setStatus] = useState<'standby' | 'playing' | 'error'>('standby');
  const [connected, setConnected] = useState(false);
  const [activated, setActivated] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [lastRawMessage, setLastRawMessage] = useState<string>('None');
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [identifiedChannelId, setIdentifiedChannelId] = useState<number | null>(null);
  const [lastMsgType, setLastMsgType] = useState<string>('None');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchChannels();
    connectSocket();
    return () => {
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  const fetchChannels = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/channels`);
      const data = await response.json();
      setChannels(Array.isArray(data) ? data : []);
      // Set first channel as default if none selected
      if (Array.isArray(data) && data.length > 0 && !selectedChannelId) {
        setSelectedChannelId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  };

  const connectSocket = () => {
    try {
      const ws = new WebSocket(SOCKET_URL);
      socketRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        setError(null);
        console.log('Connected to Broadcast Server');
        
        // Auto identify if channel is already selected
        if (selectedChannelId) {
          sendIdentify(selectedChannelId);
        }
      };

      ws.onmessage = (event) => {
        setLastRawMessage(event.data);
        try {
          const data = JSON.parse(event.data);
          handleSocketMessage(data);
        } catch (e) {
          console.error('Failed to parse socket message', e);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        // Retry connection after 5 seconds
        setTimeout(connectSocket, 5000);
      };

      ws.onerror = () => {
        setConnected(false);
        setError('Lỗi kết nối Server');
      };
    } catch (e) {
      console.error('Socket connection error', e);
    }
  };

  const handleSocketMessage = (data: any) => {
    setLastMsgType(data.type);
    if (data.type === 'broadcast-start' || data.type === 'emergency-start') {
      console.log(`Received broadcast for channel ${data.channel_id}`);
      
      setNowPlaying(data);
      setStatus('playing');
      if (activated && data.file_url) {
        playMedia(data.file_url);
        setError(null);
      } else if (activated && !data.file_url && data.type === 'broadcast-start') {
        setError('Bản tin này không có tệp âm thanh đính kèm!');
        stopMedia();
      } else if (!activated) {
        setError('Đã nhận tín hiệu nhưng Loa chưa được kích hoạt!');
      }
    } else if (data.type === 'broadcast-stop' || data.type === 'emergency-stop') {
      stopMedia();
    } else if (data.type === 'identified') {
      setIdentifiedChannelId(data.channel_id);
      console.log('Confirmed identity as Channel:', data.channel_id);
    }
  };

  const sendIdentify = (channelId: number) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'identify',
        channel_id: channelId,
        device_id: 999, // Virtual Terminal ID
        device_name: 'Browser Terminal'
      }));
    }
  };

  useEffect(() => {
    if (connected && selectedChannelId) {
      sendIdentify(selectedChannelId);
    }
  }, [selectedChannelId, connected]);

  const playMedia = (url: string) => {
    if (!audioRef.current) return;
    
    // Check if URL is local/relative or absolute
    let finalUrl = url;
    if (url && !url.startsWith('http')) {
        finalUrl = `http://${window.location.hostname}:3000${url.startsWith('/') ? '' : '/'}${url}`;
    }

    audioRef.current.src = finalUrl;
    audioRef.current.volume = volume;
    audioRef.current.play()
      .then(() => {
        setStatus('playing');
        setError(null);
      })
      .catch((err) => {
        console.error('Playback failed', err);
        setStatus('error');
        setError('Không thể tự động phát. Hãy nhấn "Kích hoạt Loa"');
      });
  };

  const stopMedia = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    // Notify server that playback stopped/finished
    if (status === 'playing' && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'broadcast-complete'
      }));
    }

    setStatus('standby');
    setNowPlaying(null);
  };

  const handleAudioEnded = () => {
    console.log('Playback finished normally');
    stopMedia();
  };

  const handleAudioError = () => {
    console.error('Audio playback error occurred');
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'broadcast-error',
        message: 'Audio playback error in browser'
      }));
    }
    setStatus('error');
    setError('Lỗi khi phát tệp âm thanh!');
  };

  const toggleActivate = () => {
    const newActivated = !activated;
    setActivated(newActivated);
    if (newActivated) {
      setError(null);
      // Dummy play to unlock audio on browser
      const dummy = new Audio();
      dummy.play().catch(() => {});
      
      // If a broadcast is already happening, start playing it now
      if (nowPlaying && nowPlaying.file_url) {
        playMedia(nowPlaying.file_url);
      }
    } else {
      stopMedia();
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a', 
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Background decoration */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(99, 102, 241, 0.1)', filter: 'blur(120px)', borderRadius: '50%', zIndex: 0 }}></div>
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(168, 85, 247, 0.1)', filter: 'blur(120px)', borderRadius: '50%', zIndex: 0 }}></div>

      <div className="glass-card" style={{ 
        width: '100%', 
        maxWidth: '500px', 
        padding: '3rem 2rem', 
        textAlign: 'center',
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(255,255,255,0.1)',
        overflow: 'hidden'
      }}>
        {/* Debug Info */}
        <div style={{ 
          position: 'absolute', 
          bottom: '8px', 
          left: '0', 
          right: '0', 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '15px', 
          fontSize: '0.6rem', 
          color: '#475569', 
          opacity: 0.6 
        }}>
          <span>TYPE: {lastMsgType}</span>
          <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            RAW: {lastRawMessage}
          </span>
        </div>
        {/* Connection Status */}
        <div style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '25px', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          fontSize: '0.75rem',
          color: connected ? '#10b981' : '#ef4444',
          fontWeight: 600
        }}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </div>

        {/* Brand/Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '2.5rem' }}>
          <div style={{ 
            width: '48px', 
            height: '48px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px -4px rgba(99, 102, 241, 0.5)'
          }}>
            <Radio size={24} color="white" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.5px' }}>BROADCAST TERMINAL</h1>
            <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>THIẾT BỊ NHẬN LỆNH VIRTUAL</p>
          </div>
        </div>

        {/* Channel Selection */}
        <div style={{ marginBottom: '2rem', textAlign: 'left' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'block' }}>KÊNH ĐANG NGHE (LISTENING ON):</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <select 
              value={selectedChannelId || ''}
              onChange={(e) => setSelectedChannelId(parseInt(e.target.value))}
              style={{ 
                flex: 1, 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '10px', 
                padding: '10px 15px', 
                color: '#818cf8', 
                fontWeight: 700,
                fontSize: '0.9rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">-- Chọn kênh --</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id} style={{ color: 'black' }}>{ch.name}</option>
              ))}
            </select>
          </div>
          {identifiedChannelId && (
            <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700 }}>
                ĐÃ ĐỊNH DANH: {channels.find(c => c.id === identifiedChannelId)?.name || `ID ${identifiedChannelId}`}
              </span>
            </div>
          )}
        </div>

        {/* Main Interface */}
        <div style={{ marginBottom: '3rem' }}>
          {status === 'playing' ? (
            <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                background: 'rgba(99, 102, 241, 0.1)',
                border: '4px solid #6366f1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
                position: 'relative'
              }}>
                <Activity size={48} color="#6366f1" />
                <div style={{ 
                  position: 'absolute', 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '50%', 
                  border: '2px solid #6366f1',
                  animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite'
                }}></div>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#f1f5f9' }}>
                ĐANG PHÁT SÓNG
              </h2>
              {nowPlaying && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '12px 20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  width: '100%'
                }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 700, color: '#818cf8' }}>{nowPlaying.title}</p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '0.8rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Music size={12} /> {nowPlaying.channel}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><User size={12} /> {nowPlaying.user}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: connected ? 1 : 0.5 }}>
              <div style={{ 
                width: '120px', 
                height: '120px', 
                borderRadius: '50%', 
                background: 'rgba(255,255,255,0.02)',
                border: '2px dashed rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem'
              }}>
                <Radio size={40} color="#475569" />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#94a3b8' }}>
                {connected ? 'CHẾ ĐỘ CHỜ' : 'ĐANG KẾT NỐI...'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', maxWidth: '300px' }}>
                {connected ? 'Hệ thống đã sẵn sàng nhận lệnh từ máy chủ.' : 'Vui lòng kiểm tra kết nối mạng và Server.'}
              </p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={toggleActivate}
            className={activated ? 'btn-secondary' : 'btn-primary'}
            style={{ 
              width: '100%', 
              padding: '14px', 
              borderRadius: '14px', 
              fontSize: '1rem', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            {activated ? <VolumeX size={20} /> : <Volume2 size={20} />}
            {activated ? 'TẮT LOA THIẾT BỊ' : 'KÍCH HOẠT LOA (ON)'}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 10px' }}>
             <Volume2 size={16} color="#64748b" />
             <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                value={volume} 
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setVolume(v);
                  if (audioRef.current) audioRef.current.volume = v;
                }}
                style={{ flex: 1, accentColor: '#6366f1' }}
             />
             <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, width: '30px' }}>{Math.round(volume * 100)}%</span>
          </div>
        </div>

        {error && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '12px', 
            background: 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '10px',
            color: '#ef4444',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div style={{ marginTop: '2.5rem', fontSize: '0.7rem', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12} /> {new Date().toLocaleTimeString('vi-VN')}</span>
          <span>OpenClaw Terminal v2.1</span>
        </div>
      </div>

      <audio 
        ref={audioRef} 
        style={{ display: 'none' }} 
        onEnded={handleAudioEnded}
        onError={handleAudioError}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ping {
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .8; }
        }
        .glass-card {
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 30px;
        }
        input[type=range] {
          cursor: pointer;
        }
      `}} />
    </div>
  );
};

export default BroadcastTerminal;
