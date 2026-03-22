import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.js';
import { Scissors, Merge, Play, Pause, Save, RefreshCw, ListMusic } from 'lucide-react';

interface AudioEditorProps {
  fileId: number;
  fileName: string;
  fileUrl: string;
  duration: number;
  contentId: number;
  onClose: () => void;
  onSuccess: (newFileId: number) => void;
}

export default function AudioEditor({ fileId, fileName, fileUrl, duration, contentId, onClose, onSuccess }: AudioEditorProps) {
  const [activeTab, setActiveTab] = useState<'trim' | 'merge'>('trim');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [trimRange, setTrimRange] = useState({ start: 0, end: duration });
  
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const regionsPluginRef = useRef<any>(null);

  // For Merge
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    if (waveformRef.current && activeTab === 'trim') {
      // Initialize Wavesurfer
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(99, 102, 241, 0.4)',
        progressColor: '#6366f1',
        cursorColor: '#f87171',
        barWidth: 2,
        height: 100,
        url: fileUrl,
      });

      // Register Regions plugin
      const regions = wavesurfer.current.registerPlugin(RegionsPlugin.create());
      regionsPluginRef.current = regions;

      wavesurfer.current.on('ready', () => {
        const dur = wavesurfer.current?.getDuration() || duration;
        setTrimRange({ start: 0, end: dur });
        
        // Add initial region covering everything
        regions.addRegion({
          start: 0,
          end: dur,
          color: 'rgba(99, 102, 241, 0.2)',
          drag: true,
          resize: true,
        });
      });

      // Handle region updates
      regions.on('region-updated', (region: any) => {
        setTrimRange({ start: region.start, end: region.end });
      });

      wavesurfer.current.on('play', () => setIsPlaying(true));
      wavesurfer.current.on('pause', () => setIsPlaying(false));

      return () => {
        if (wavesurfer.current) {
          wavesurfer.current.destroy();
        }
      };
    }
  }, [fileUrl, activeTab]);

  useEffect(() => {
    if (activeTab === 'merge') {
      fetchMediaFiles();
    }
  }, [activeTab]);

  const fetchMediaFiles = async () => {
    try {
      const token = localStorage.getItem('openclaw_token');
      // Use the updated endpoint with content_id filter
      const res = await fetch(`http://${window.location.hostname}:3000/media?content_id=${contentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMediaFiles(Array.isArray(data) ? data : []);
      // Pre-select current file if it exists in the list
      if (fileId) setSelectedIds([fileId]);
    } catch (err) {
      console.error("Failed to fetch media:", err);
    }
  };

  const handlePlayPause = () => {
    wavesurfer.current?.playPause();
  };

  const handleTrim = async () => {
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('openclaw_token');
      const res = await fetch(`http://${window.location.hostname}:3000/media/trim`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          id: fileId, 
          startTime: trimRange.start, 
          endTime: trimRange.end 
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert('Cắt đoạn thành công!');
        onSuccess(data.fileId);
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi cắt đoạn');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMerge = async () => {
    if (selectedIds.length < 2) {
      alert('Vui lòng chọn ít nhất 2 file để ghép');
      return;
    }
    setIsProcessing(true);
    try {
      const token = localStorage.getItem('openclaw_token');
      const res = await fetch(`http://${window.location.hostname}:3000/media/merge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          ids: selectedIds, 
          content_id: contentId 
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        alert('Ghép file thành công!');
        onSuccess(data.fileId);
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi khi ghép file');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối máy chủ');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Chỉnh sửa Âm thanh</h3>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
          <button 
            onClick={() => setActiveTab('trim')}
            style={{ 
              padding: '6px 12px', border: 'none', background: activeTab === 'trim' ? '#6366f1' : 'none',
              color: activeTab === 'trim' ? 'white' : '#94a3b8', cursor: 'pointer', borderRadius: '6px',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', fontSize: '0.85rem'
            }}
          >
            <Scissors size={16} />
            <span>Cắt đoạn</span>
          </button>
          <button 
            onClick={() => setActiveTab('merge')}
            style={{ 
              padding: '6px 12px', border: 'none', background: activeTab === 'merge' ? '#6366f1' : 'none',
              color: activeTab === 'merge' ? 'white' : '#94a3b8', cursor: 'pointer', borderRadius: '6px',
              display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s', fontSize: '0.85rem'
            }}
          >
            <Merge size={16} />
            <span>Ghép file</span>
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Đang chỉnh sửa: <span style={{ color: '#cbd5e1' }}>{fileName}</span></p>
        
        {activeTab === 'trim' ? (
          <div className="animate-fade-in">
            <div ref={waveformRef} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
              <button 
                onClick={handlePlayPause}
                style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#6366f1', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: '4px' }} />}
              </button>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
                  {formatTime(trimRange.start)} - {formatTime(trimRange.end)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                  Độ dài đoạn cắt: {Math.round(trimRange.end - trimRange.start)} giây
                </div>
              </div>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }} 
              onClick={handleTrim}
              disabled={isProcessing}
            >
              {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
              <span>Lưu đoạn đã cắt</span>
            </button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Chọn ít nhất 2 file để ghép nối theo thứ tự được đánh số:</p>
            <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              {mediaFiles.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: '0.85rem' }}>Không tìm thấy file audio nào khác.</div>
              ) : (
                mediaFiles.map((file) => (
                  <div 
                    key={file.id}
                    onClick={() => {
                      if (selectedIds.includes(file.id)) {
                        setSelectedIds(selectedIds.filter(id => id !== file.id));
                      } else {
                        setSelectedIds([...selectedIds, file.id]);
                      }
                    }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer',
                      background: selectedIds.includes(file.id) ? 'rgba(99, 102, 241, 0.1)' : 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: '24px', height: '24px', borderRadius: '6px', border: '1.5px solid #6366f1',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem',
                      fontWeight: 800, background: selectedIds.includes(file.id) ? '#6366f1' : 'none',
                      color: selectedIds.includes(file.id) ? 'white' : '#6366f1'
                    }}>
                      {selectedIds.includes(file.id) ? selectedIds.indexOf(file.id) + 1 : ''}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 500 }}>{file.file_name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Length: {file.duration || '--'}</div>
                    </div>
                    <ListMusic size={16} style={{ color: '#475569' }} />
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <button 
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center', background: '#10b981' }} 
                onClick={handleMerge}
                disabled={isProcessing || selectedIds.length < 2}
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={20} /> : <Merge size={20} />}
                <span>Ghép nối {selectedIds.length} file</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <button 
        onClick={onClose}
        style={{ width: '100%', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
        disabled={isProcessing}
      >
        Hủy bỏ & Đóng
      </button>

      <style>{`
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
