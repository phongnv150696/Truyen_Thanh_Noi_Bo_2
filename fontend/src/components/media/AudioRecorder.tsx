import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Save, Pause, RotateCcw } from 'lucide-react';

interface AudioRecorderProps {
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

export default function AudioRecorder({ onSave, onCancel }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stopStream();
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      visualize(stream);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập Microphone. Vui lòng kiểm tra cài đặt trình duyệt và cấp quyền.");
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const visualize = (stream: MediaStream) => {
    if (!canvasRef.current) return;
    
    // Cleanup old context
    if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;

        // Gradient color for a premium look
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#ef4444'); // Red Top
        gradient.addColorStop(1, '#6366f1'); // Indigo Bottom
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = () => {
    if (audioBlob) {
      onSave(audioBlob);
    }
  };

  return (
    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        
        {/* Visualizer & Timer */}
        <div style={{ position: 'relative', width: '100%', height: '100px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', overflow: 'hidden' }}>
          <canvas ref={canvasRef} width="600" height="100" style={{ width: '100%', height: '100%' }} />
          <div style={{ 
            position: 'absolute', top: '10px', right: '15px', 
            fontSize: '1.5rem', fontWeight: 700, color: isRecording ? '#ef4444' : '#94a3b8',
            textShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
          }}>
            {formatTime(recordingTime)}
          </div>
          {isRecording && (
            <div style={{ 
              position: 'absolute', top: '15px', left: '15px', 
              width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444',
              animation: 'pulse 1.5s infinite'
            }} />
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
          {!isRecording && !audioBlob ? (
            <button 
              type="button"
              onClick={startRecording}
              className="btn-primary"
              style={{ padding: '12px 24px', borderRadius: '50px', background: '#ef4444', border: 'none', display: 'flex', gap: '8px', color: 'white', fontWeight: 600, cursor: 'pointer' }}
            >
              <Mic size={20} />
              <span>Bắt đầu ghi âm</span>
            </button>
          ) : isRecording ? (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <button 
                type="button"
                onClick={pauseRecording}
                style={{ padding: '12px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title={isPaused ? "Tiếp tục" : "Tạm dừng"}
              >
                {isPaused ? <Mic size={24} /> : <Pause size={24} />}
              </button>
              <button 
                type="button"
                onClick={stopRecording}
                style={{ padding: '18px', borderRadius: '50%', background: '#ef4444', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)' }}
                title="Dừng và hoàn tất"
              >
                <Square size={28} fill="white" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
              <audio src={audioUrl || ''} controls style={{ width: '100%', filter: 'invert(1)' }} />
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button 
                  type="button"
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'rgba(255, 255, 255, 0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  <RotateCcw size={16} />
                  <span>Ghi lại</span>
                </button>
                <button 
                  type="button"
                  onClick={handleSave}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 28px', fontSize: '0.95rem' }}
                >
                  <Save size={20} />
                  <span>Lưu bản ghi</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Close */}
        {!isRecording && (
          <button 
            type="button"
            onClick={onCancel}
            style={{ fontSize: '0.85rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', marginTop: '0.5rem' }}
          >
            Hủy bỏ
          </button>
        )}
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
