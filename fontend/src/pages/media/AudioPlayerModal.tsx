import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

interface MediaFile {
  id: number;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

interface AudioPlayerModalProps {
  file: MediaFile | null;
  isOpen: boolean;
  onClose: () => void;
}

const API_URL = 'http://127.0.0.1:3000';

export default function AudioPlayerModal({ file, isOpen, onClose }: AudioPlayerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState('00:00');
  const [duration, setDuration] = useState('00:00');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !file || !containerRef.current) return;

    setIsLoading(true);
    const audioUrl = `${API_URL}/uploads/${file.file_path}`;

    waveSurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(99, 102, 241, 0.4)',
      progressColor: '#6366f1',
      cursorColor: '#818cf8',
      barWidth: 3,
      barGap: 3,
      barRadius: 3,
      height: 80,
      normalize: true,
      url: audioUrl,
    });

    waveSurferRef.current.on('ready', () => {
      setIsLoading(false);
      const totalDuration = waveSurferRef.current!.getDuration();
      setDuration(formatTime(totalDuration));
      
      // Auto play on open
      waveSurferRef.current!.play();
      setIsPlaying(true);
    });

    waveSurferRef.current.on('audioprocess', (time) => {
      setCurrentTime(formatTime(time));
    });

    waveSurferRef.current.on('play', () => setIsPlaying(true));
    waveSurferRef.current.on('pause', () => setIsPlaying(false));
    waveSurferRef.current.on('finish', () => setIsPlaying(false));

    return () => {
      if (waveSurferRef.current) {
        waveSurferRef.current.destroy();
        waveSurferRef.current = null;
      }
    };
  }, [isOpen, file]);

  const togglePlay = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.playPause();
    }
  };

  const toggleMute = () => {
    if (waveSurferRef.current) {
      const muted = !isMuted;
      waveSurferRef.current.setVolume(muted ? 0 : 1);
      setIsMuted(muted);
    }
  };

  const skipForward = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.skip(5);
    }
  };

  const skipBackward = () => {
    if (waveSurferRef.current) {
      waveSurferRef.current.skip(-5);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen || !file) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div className="animate-scale-in" style={{
        background: '#1e293b',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '600px',
        padding: '2rem',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc' }}>{file.file_name}</h2>
            <p style={{ margin: '8px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>Đang phát bản tin âm thanh</p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              border: 'none', 
              color: '#94a3b8', 
              padding: '8px', 
              borderRadius: '50%', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#94a3b8';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Waveform Container */}
        <div style={{ 
          background: 'rgba(15, 23, 42, 0.5)', 
          borderRadius: '16px', 
          padding: '1.5rem', 
          marginBottom: '1.5rem',
          position: 'relative'
        }}>
          {isLoading && (
            <div style={{ 
              position: 'absolute', 
              top: '50%', 
              left: '50%', 
              transform: 'translate(-50%, -50%)',
              color: '#6366f1',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
               <span className="loader" style={{ width: '16px', height: '16px', border: '2px solid #6366f1', borderBottomColor: 'transparent', borderRadius: '50%', display: 'inline-block', boxSizing: 'border-box', animation: 'rotation 1s linear infinite' }}></span>
               Đang phân tích phổ âm...
            </div>
          )}
          <div ref={containerRef} style={{ width: '100%', opacity: isLoading ? 0 : 1, transition: 'opacity 0.3s' }}></div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginTop: '10px', fontWeight: 500, opacity: isLoading ? 0 : 1 }}>
            <span>{currentTime}</span>
            <span>{duration}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
          <button 
            onClick={toggleMute}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '10px' }}
          >
            {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>

          <button 
            onClick={skipBackward}
            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '10px' }}
          >
            <SkipBack size={24} />
          </button>

          <button 
            onClick={togglePlay}
            style={{ 
              background: '#6366f1', 
              border: 'none', 
              color: 'white', 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
            }}
          >
            {isPlaying ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: '4px' }} />}
          </button>

          <button 
            onClick={skipForward}
            style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: '10px' }}
          >
            <SkipForward size={24} />
          </button>

          <div style={{ width: '44px' }}></div> {/* Spacer for symmetry */}
        </div>
      </div>
    </div>
  );
}
