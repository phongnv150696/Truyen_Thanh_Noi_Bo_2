import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Sparkles,
  Mic,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Volume2,
  Settings,
  Play,
  MoreVertical
} from 'lucide-react'
import AudioRecorder from '../../components/media/AudioRecorder'
import AudioEditor from '../../components/media/AudioEditor'

const API_URL = `http://${window.location.hostname}:3000`;

interface ContentItem {
  id: number;
  title: string;
  summary: string;
  body: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
  tags: string[];
  created_at: string;
  author_id: number | null;
  author_name?: string | null;
  is_scheduled?: boolean;
  has_audio?: boolean;
}

interface ContentManagementProps {
  user: any;
  onLogout?: () => void;
}

export default function ContentManagement({ user, onLogout }: ContentManagementProps) {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [processingTTS, setProcessingTTS] = useState<number | null>(null)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [rawAIInput, setRawAIInput] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
  const [playingId, setPlayingId] = useState<number | null>(null)

  // New AI & TTS State
  const [isTTSModalOpen, setIsTTSModalOpen] = useState(false)
  const [targetTTSItem, setTargetTTSItem] = useState<ContentItem | null>(null)
  const [ttsOptions, setTtsOptions] = useState({
    voice: 'vi-VN-HoaiMyNeural',
    rate: '+0%',
    pitch: '+0Hz'
  })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<{ feedback?: string, isSensitive?: boolean, violations?: string[] } | null>(null)
  const [showHighlightPreview, setShowHighlightPreview] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const [importingWord, setImportingWord] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [uploadedAudio, setUploadedAudio] = useState<{ id?: number, name: string, duration: number, url?: string } | null>(null)
  const [isRecorderOpen, setIsRecorderOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [ttsProgress, setTtsProgress] = useState(0)

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7

  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    body: '',
    status: 'pending_review',
    tags: '',
    author_id: null as number | null
  })

  const getHeaders = (hasBody: boolean = false, isMultipart: boolean = false) => {
    const token = localStorage.getItem('openclaw_token')
    const headers: any = {
      'Authorization': token ? `Bearer ${token}` : ''
    }
    if (hasBody && !isMultipart) {
      headers['Content-Type'] = 'application/json'
    }
    return headers
  }

  useEffect(() => {
    fetchContents()
  }, [])

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow

    if (isModalOpen || isTTSModalOpen || isDeleteModalOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [isModalOpen, isTTSModalOpen, isDeleteModalOpen])
  
  // Handle outside click for action menu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.action-menu-container')) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handlePlayNow = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn phát bản tin này lên loa toàn đơn vị ngay lập tức?')) return;
    setPlayingId(id);
    try {
      const res = await fetch(`${API_URL}/content/${id}/play`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Đã kích hoạt phát sóng thành công!');
      } else {
        alert('Lỗi: ' + (data.error || 'Không thể phát bản tin. Hãy đảm bảo bản tin đã được duyệt và có file âm thanh.'));
      }
    } catch (err) {
      console.error('Play now error:', err);
      alert('Lỗi kết nối máy chủ');
    } finally {
      setPlayingId(null);
    }
  }

  const fetchContents = async () => {
    try {
      setLoading(true)
      const res = await fetch(`http://${window.location.hostname}:3000/content`, {
        headers: getHeaders(false)
      })
      if (!res.ok) {
        if (res.status === 401) {
          onLogout?.();
          return;
        }
      }
      const data = await res.json()
      setContents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch contents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = async (item?: ContentItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title,
        summary: item.summary || '',
        body: item.body,
        status: item.status,
        tags: item.tags?.join(', ') || '',
        author_id: item.author_id
      })
      if (item.has_audio) {
        // Fetch specific media info
        try {
          const res = await fetch(`http://${window.location.hostname}:3000/media?content_id=${item.id}`, {
            headers: getHeaders(false)
          });
          const media = await res.json();
          if (media && media.length > 0) {
            const latest = media[0];
            setUploadedAudio({
              id: latest.id,
              name: latest.file_name,
              duration: parseFloat(latest.duration?.seconds || latest.duration || 0),
              url: `http://${window.location.hostname}:3000/uploads/${latest.file_path}`
            });
          } else {
            setUploadedAudio({ name: 'Âm thanh hiện tại', duration: 0 });
          }
        } catch (err) {
          setUploadedAudio({ name: 'Âm thanh hiện tại', duration: 0 });
        }
      } else {
        setUploadedAudio(null)
      }
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        summary: '',
        body: '',
        status: 'pending_review',
        tags: '',
        author_id: user?.id || null
      })
      setUploadedAudio(null)
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure author_id is set for new content
    const finalData = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      author_id: editingItem ? formData.author_id : user?.id
    }

    setLoading(true)
    try {
      const url = `http://${window.location.hostname}:3000/content${editingItem ? `/${editingItem.id}` : ''}`
      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: getHeaders(true),
        body: JSON.stringify(finalData)
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchContents()
        alert(editingItem ? 'Cập nhật bản tin thành công!' : 'Tạo bản tin thành công!')
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }))
        alert(`Lỗi: ${errorData.message || 'Không thể lưu bản tin'}`)
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (item: ContentItem) => {
    setItemToDelete(item)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/content/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: getHeaders(false)
      })
      if (res.ok) {
        fetchContents()
        setIsDeleteModalOpen(false)
        setItemToDelete(null)
      } else {
        const errorData = await res.json().catch(() => ({ message: 'Lỗi không xác định' }))
        alert(`Không thể xóa bản tin: ${errorData.message || 'Xảy ra lỗi phía máy chủ'}`)
        setIsDeleteModalOpen(false) // Đóng modal để tránh treo
      }
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Không thể kết nối tới máy chủ để xóa bản tin.')
      setIsDeleteModalOpen(false)
    }
  }


  const slugify = (str: string) => {
    return str
      .normalize('NFD') // Tách các dấu tiếng Việt
      .replace(/[\u0300-\u036f]/g, '') // Xóa các dấu
      .replace(/[đĐ]/g, 'd') // Xử lý chữ đ
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_') // Thay các ký tự lạ bằng _
      .replace(/_+/g, '_') // Gộp nhiều _ liên tiếp
      .replace(/^_|_$/g, '') // Xóa _ ở đầu và cuối
      .substring(0, 50); // Giới hạn chiều dài
  }

  const handleOpenTTSModal = (item: ContentItem) => {
    setTargetTTSItem(item)
    setIsTTSModalOpen(true)
  }

  const handleGenerateTTS = async () => {
    if (!targetTTSItem) return;
    setProcessingTTS(targetTTSItem.id)
    setTtsProgress(5) // Start at 5%

    // Simulate progress
    const progressInterval = setInterval(() => {
      setTtsProgress(prev => {
        if (prev >= 90) return prev;
        return prev + 5;
      })
    }, 400);

    try {
      const slug = slugify(targetTTSItem.title)
      const res = await fetch(`http://${window.location.hostname}:3000/media/tts`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          text: targetTTSItem.body,
          file_name: `TTS_${slug}.mp3`,
          content_id: targetTTSItem.id,
          ...ttsOptions
        })
      })
      if (res.ok) {
        setTtsProgress(100)
        setTimeout(() => {
          setIsTTSModalOpen(false)
          alert('Tạo file âm thanh thành công! Đã lưu vào Thư viện Media.')
        }, 300)
      } else {
        alert('Lỗi khi tạo TTS.')
      }
    } catch (err) {
      console.error('TTS generation failed:', err)
      alert('Không thể kết nối tới dịch vụ TTS.')
    } finally {
      clearInterval(progressInterval)
      setProcessingTTS(null)
      setTtsProgress(0)
    }
  }
  const uploadAudioBlob = async (blob: Blob | File, fileName: string) => {
    setUploadingAudio(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', blob, fileName);
    if (editingItem) formDataUpload.append('content_id', editingItem.id.toString());

    try {
      const res = await fetch(`http://${window.location.hostname}:3000/media/upload`, {
        method: 'POST',
        headers: getHeaders(true, true),
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedAudio({
          id: data.fileId,
          name: fileName,
          duration: data.duration,
          url: data.fileId ? `http://${window.location.hostname}:3000/uploads/${data.filePath || ''}` : undefined // filePath might need to be returned if new
        });
        alert(`Tải lên thành công! Thời lượng: ${Math.round(data.duration)} giây.`);
        fetchContents();
        setIsRecorderOpen(false);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi tải file");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Không thể kết nối tới máy chủ.");
    } finally {
      setUploadingAudio(false);
    }
  };

  const handleUploadAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      alert("File quá lớn. Vui lòng chọn file dưới 20MB.");
      return;
    }

    await uploadAudioBlob(file, file.name);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const handleImportWord = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Vui lòng chỉ chọn tệp định dạng .docx');
      return;
    }

    setImportingWord(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const res = await fetch(`http://${window.location.hostname}:3000/content/import-word`, {
        method: 'POST',
        headers: getHeaders(false),
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({
          ...formData,
          title: formData.title || data.title,
          body: data.text
        });
        alert('Đã nhập nội dung từ file Word thành công!');
      } else {
        const error = await res.json();
        alert(`Lỗi: ${error.error || 'Không thể nhập file Word'}`);
      }
    } catch (err) {
      console.error('Import Word failed:', err);
      alert('Không thể kết nối tới máy chủ.');
    } finally {
      setImportingWord(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const handleQuickSummarize = async () => {
    if (!formData.body.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/ai/summarize`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ text: formData.body })
      });
      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, summary: data.summary });
      }
    } catch (err) {
      console.error('Summarize failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleAnalyzePolicy = async () => {
    if (!formData.body.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/ai/analyze-policy`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ text: formData.body })
      });

      if (res.ok) {
        const data = await res.json();
        setAiAnalysis({
          isSensitive: data.hasViolations,
          feedback: data.feedback,
          violations: data.violations || []
        });
        if (data.hasViolations) setShowHighlightPreview(true);
      }
    } catch (err) {
      console.error('Policy check failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }

  const handleGenerateScript = async () => {
    if (!rawAIInput.trim()) return;
    setGeneratingScript(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/ai/generate-script`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ rawText: rawAIInput })
      });
      if (res.ok) {
        const data = await res.json(); // Assuming the response contains title, script, wordCount, estimatedDuration
        // Populate the form with AI generated content and current user ID
        setFormData({
          ...formData,
          title: data.title,
          body: data.script,
          summary: `Bản tin tự động (${data.wordCount} từ, ~${data.estimatedDuration})`,
          author_id: user?.id
        })
        setIsAIAssistantOpen(false)
        setEditingItem(null)
        setIsModalOpen(true)
      } else {
        alert('Lỗi khi gọi AI trợ lý.');
      }
    } catch (err) {
      console.error('AI generation failed:', err);
      alert('Không thể kết nối dịch vụ AI.');
    } finally {
      setGeneratingScript(false);
    }
  }

  const renderHighlightedText = () => {
    if (!formData.body) return null;
    if (!aiAnalysis?.violations || aiAnalysis.violations.length === 0) return formData.body;

    let text = formData.body;
    // Create a regex to match all violations (case-insensitive)
    const sortedViolations = [...aiAnalysis.violations].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${sortedViolations.join('|')})`, 'gi');

    const parts = text.split(pattern);

    return parts.map((part, index) => {
      const isMatch = sortedViolations.some(v => v.toLowerCase() === part.toLowerCase());
      if (isMatch) {
        return (
          <mark key={index} style={{
            background: 'rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            padding: '2px 4px',
            borderRadius: '4px',
            borderBottom: '2px solid #ef4444',
            fontWeight: 700
          }}>
            {part}
          </mark>
        );
      }
      return part;
    });
  }

  const getStatusIcon = (item: ContentItem) => {
    if (item.is_scheduled) return <Clock size={16} color="#3b82f6" />
    switch (item.status) {
      case 'published':
      case 'approved': return <CheckCircle2 size={16} color="#10b981" />
      case 'pending_review': return <Clock size={16} color="#f59e0b" />
      case 'draft': return <FileText size={16} color="#94a3b8" />
      case 'rejected': return <X size={16} color="#ef4444" />
      default: return <AlertCircle size={16} color="#ef4444" />
    }
  }

  const filteredContents = contents.filter(c => {
    // Search filter
    const matchesSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role filter: Editor only sees their own content
    if (user?.role_name === 'editor') {
      return matchesSearch && (c.author_id === user.id);
    }
    
    return matchesSearch;
  })

  // Pagination Logic
  const totalPages = Math.ceil(filteredContents.length / itemsPerPage)
  const paginatedContents = filteredContents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Quản lý Bản tin</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.4rem' }}>Soạn thảo và quản lý các nội dung phát thanh trong hệ thống.</p>
        </div>
        {(user?.role_name === 'admin' || user?.role_name === 'editor' || user?.role_name === 'commander') && (
          <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} />
            <span>Tạo bản tin mới</span>
          </button>
        )}
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề hoặc tóm tắt..."
              className="glass-input"
              style={{ paddingLeft: '40px', width: '100%' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, width: '60px' }}>ID</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TIÊU ĐỀ & TÓM TẮT</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TRẠNG THÁI</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TÁC GIẢ</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>CHỦ ĐỀ/TAGS</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>NGÀY TẠO</th>
                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                      <div className="animate-spin" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%' }}></div>
                      <span>Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredContents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ opacity: 0.5 }}>
                      <Search size={40} style={{ marginBottom: '1rem' }} />
                      <p>Không tìm thấy bản tin nào phù hợp.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedContents.map(item => (
                  <tr key={item.id} className="table-row">
                    <td style={{ padding: '1.2rem 1.5rem', color: '#64748b', fontSize: '0.85rem', fontWeight: 700 }}>#{item.id}</td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.title}
                        {item.tags?.includes('Khẩn') && (
                          <span style={{
                            background: '#ef4444', color: 'white', fontSize: '0.65rem',
                            padding: '2px 6px', borderRadius: '4px', fontWeight: 900,
                            letterSpacing: '0.5px'
                          }}>
                            KHẨN
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.summary || 'Chưa có tóm tắt...'}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        {getStatusIcon(item)}
                        <span style={{
                          textTransform: 'capitalize',
                          color: item.is_scheduled ? '#3b82f6' : (item.status === 'approved' ? '#10b981' : (item.status === 'rejected' ? '#ef4444' : 'inherit')),
                          fontWeight: item.is_scheduled || item.status === 'approved' || item.status === 'rejected' ? 600 : 400,
                          whiteSpace: 'nowrap'
                        }}>
                          {item.is_scheduled
                            ? 'Đã lên lịch'
                            : item.status === 'pending_review' ? 'Chờ duyệt' : item.status === 'approved' ? 'Đã duyệt' : item.status === 'published' ? 'Đã phát' : item.status === 'rejected' ? 'Bị từ chối' : 'Nháp'}
                        </span>
                        {item.has_audio && (
                          <Volume2 size={14} style={{ color: '#10b981', marginLeft: '4px' }} />
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', color: '#cbd5e1', fontSize: '0.85rem' }}>
                      {item.author_name || 'Hệ thống'}
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {item.tags?.slice(0, 3).map((tag, idx) => (
                          <span key={idx} style={{
                            background: tag === 'Khẩn' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.1)',
                            color: tag === 'Khẩn' ? '#ef4444' : '#818cf8',
                            padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem',
                            fontWeight: tag === 'Khẩn' ? 800 : 400,
                            border: tag === 'Khẩn' ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                          }}>{tag}</span>
                        )) || '--'}
                        {item.tags?.length > 3 && <span style={{ color: '#475569', fontSize: '0.7rem' }}>+{item.tags.length - 3}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center' }}>
                        <button className="icon-btn" title="Xem" style={{ color: '#818cf8', background: 'rgba(99, 102, 241, 0.1)' }} onClick={() => handleOpenModal(item)}><Eye size={18} /></button>
                        {(user?.role_name === 'admin' || user?.role_name === 'editor' || user?.role_name === 'commander') && (
                          <button className="icon-btn delete" title="Xóa" style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)' }} onClick={() => handleDelete(item)}><Trash2 size={18} /></button>
                        )}
                        
                        <div className="action-menu-container" style={{ position: 'relative' }}>
                          <button 
                            className="icon-btn" 
                            style={{ 
                              background: menuOpenId === item.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)', 
                              color: menuOpenId === item.id ? 'white' : '#94a3b8' 
                            }}
                            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          {menuOpenId === item.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              zIndex: 100,
                              minWidth: '180px',
                              background: '#1e293b',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              padding: '6px',
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                              marginTop: '8px'
                            }}>
                              {item.status === 'approved' && item.has_audio && (
                                <button
                                  className="menu-item"
                                  style={{ 
                                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', 
                                    display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', 
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                  onClick={() => { handlePlayNow(item.id); setMenuOpenId(null); }}
                                >
                                  <Play size={16} /> Phát lên loa
                                </button>
                              )}
                              <button
                                className="menu-item"
                                style={{ 
                                  width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', 
                                  display: 'flex', alignItems: 'center', gap: '10px', color: '#fbbf24', 
                                  background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem'
                                }}
                                onClick={() => { handleOpenTTSModal(item); setMenuOpenId(null); }}
                              >
                                <Mic size={16} /> Chuyển TTS
                              </button>
                               {(user?.role_name === 'admin' || user?.role_name === 'editor' || user?.role_name === 'commander') && (
                                <button 
                                  className="menu-item"
                                  style={{ 
                                    width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: '8px', 
                                    display: 'flex', alignItems: 'center', gap: '10px', color: '#818cf8', 
                                    background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem'
                                  }}
                                  onClick={() => { handleOpenModal(item); setMenuOpenId(null); }}
                                >
                                  <Edit2 size={16} /> Sửa thông tin
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination UI */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '2rem',
          gap: '12px'
        }}>
          <button
            disabled={currentPage === 1}
            onClick={() => handlePageChange(currentPage - 1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: currentPage === 1 ? '#475569' : '#cbd5e1',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: currentPage === page ? '#6366f1' : 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => handlePageChange(currentPage + 1)}
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              color: currentPage === totalPages ? '#475569' : '#cbd5e1',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Modal - Glassmorphism Style */}
      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '1100px', maxHeight: '92vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{editingItem ? 'Chỉnh sửa Bản tin' : 'Tạo Bản tin mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', minHeight: '70vh' }}>
                {/* Sidebar - Media & AI Tools */}
                <div style={{
                  width: '320px',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  background: 'rgba(255,255,255,0.01)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2rem'
                }}>
                  {/* Media Hub */}
                  <section>
                    <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Volume2 size={14} />
                      Media Hub
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input type="file" ref={audioInputRef} style={{ display: 'none' }} accept=".mp3,.wav" onChange={handleUploadAudio} />
                      <button type="button" onClick={() => audioInputRef.current?.click()} disabled={uploadingAudio} className="glass-btn-sidebar" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <Mic size={16} />
                        <span>{uploadingAudio ? 'Đang tải...' : 'Upload Audio'}</span>
                      </button>

                      <button type="button" onClick={() => setIsRecorderOpen(true)} className="glass-btn-sidebar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                        <Mic size={16} className={isRecorderOpen ? 'animate-pulse' : ''} />
                        <span>Ghi âm trực tiếp</span>
                      </button>

                      {uploadedAudio && (
                        <div className="media-status-card">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{uploadedAudio.name}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{Math.round(uploadedAudio.duration)} giây</span>
                            <div style={{ display: 'flex', gap: '5px' }}>
                              {uploadedAudio.id && (
                                <button type="button" onClick={() => setIsEditorOpen(true)} className="mini-icon-btn"><Edit2 size={12} /></button>
                              )}
                              <button type="button" onClick={() => setUploadedAudio(null)} className="mini-icon-btn delete"><X size={12} /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* AI Assistant Section */}
                  <section>
                    <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Sparkles size={14} />
                      AI Assistant
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button type="button" onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)} className="glass-btn-sidebar" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <Sparkles size={16} />
                        <span>Viết kịch bản AI</span>
                      </button>
                      <button type="button" onClick={handleQuickSummarize} disabled={isAnalyzing || !formData.body} className="glass-btn-sidebar" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
                        <FileText size={16} />
                        <span>{isAnalyzing ? '...' : 'Tóm tắt nội dung'}</span>
                      </button>
                      <button type="button" onClick={handleAnalyzePolicy} disabled={isAnalyzing || !formData.body} className="glass-btn-sidebar" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
                        <AlertTriangle size={16} />
                        <span>Kiểm tra nội quy</span>
                      </button>

                      {aiAnalysis && (
                        <div style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', background: aiAnalysis.isSensitive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ fontSize: '0.75rem', color: aiAnalysis.isSensitive ? '#ef4444' : '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {aiAnalysis.isSensitive ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                            <span style={{ fontWeight: 600 }}>Cảnh báo AI:</span>
                          </div>
                          <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '5px 0 0 0', lineHeight: '1.4' }}>{aiAnalysis.feedback}</p>
                          {aiAnalysis.isSensitive && (
                            <button
                              type="button"
                              onClick={() => setShowHighlightPreview(!showHighlightPreview)}
                              style={{
                                marginTop: '10px', width: '100%', padding: '8px', borderRadius: '8px',
                                background: showHighlightPreview ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                                color: showHighlightPreview ? '#f87171' : '#94a3b8',
                                fontSize: '0.7rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                              }}
                            >
                              <Search size={14} />
                              {showHighlightPreview ? 'QUAY LẠI SOẠN THẢO' : 'XEM VỊ TRÍ LỖI'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Utils Section */}
                  <section>
                    <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Plus size={14} />
                      Công cụ khác
                    </h4>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".docx" onChange={handleImportWord} />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={importingWord} className="glass-btn-sidebar" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                      <FileText size={16} />
                      <span>{importingWord ? 'Đang nhập...' : 'Dẫn file Word'}</span>
                    </button>
                  </section>

                  {/* Settings & Status Section - MOVED HERE */}
                  <section style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Settings size={14} />
                      Cấu hình & Trạng thái
                    </h4>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Trạng thái</label>
                        <select className="glass-input" style={{ width: '100%', background: 'rgba(15, 23, 42, 0.8)', padding: '10px 12px', fontSize: '0.85rem' }} value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                          <option value="draft">Bản nháp 📝</option>
                          <option value="pending_review">Chờ duyệt ⏳</option>
                          <option value="published">Đã phát 📡</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', color: '#64748b', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Chủ đề / Nhãn</label>
                        <input type="text" placeholder="Thêm nhãn..." className="glass-input" style={{ width: '100%', padding: '10px 12px', fontSize: '0.85rem' }} value={formData.tags} onChange={(e) => setFormData({ ...formData, tags: e.target.value })} />
                      </div>

                      {/* Emergency Toggle Section */}
                      <div style={{
                        padding: '1rem',
                        background: formData.tags.includes('Khẩn') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${formData.tags.includes('Khẩn') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                        borderRadius: '12px',
                        display: 'flex',
                        gap: '12px',
                        transition: 'all 0.3s'
                      }}>
                        <input type="checkbox" id="sidebar-emergency" checked={formData.tags.includes('Khẩn')} onChange={(e) => {
                          const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
                          if (e.target.checked) {
                            if (!tagsArray.includes('Khẩn')) tagsArray.push('Khẩn');
                          } else {
                            const index = tagsArray.indexOf('Khẩn');
                            if (index > -1) tagsArray.splice(index, 1);
                          }
                          setFormData({ ...formData, tags: tagsArray.join(', ') });
                        }} style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px' }} />
                        <label htmlFor="sidebar-emergency" style={{ cursor: 'pointer', flex: 1 }}>
                          <div style={{ fontWeight: 800, color: formData.tags.includes('Khẩn') ? '#ef4444' : '#94a3b8', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {formData.tags.includes('Khẩn') ? <AlertTriangle size={14} className="animate-pulse" /> : <Clock size={14} />}
                            PHÁT KHẨN CẤP
                          </div>
                          <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', color: '#64748b', lineHeight: '1.3' }}>Tự động duyệt hỏa tốc.</p>
                        </label>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Main Contents - Form Editor */}
                <div style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
                  <div style={{ maxWidth: '850px', margin: '0 auto' }}>
                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tiêu đề bản tin</label>
                      <input type="text" required placeholder="Nhập tiêu đề hấp dẫn..." className="glass-input-premium" style={{ width: '100%', fontSize: '1.25rem', padding: '14px 18px', fontWeight: 700 }} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tóm tắt ngắn</label>
                      <textarea placeholder="Mô tả nội dung chính trong vài câu..." className="glass-input-premium" style={{ width: '100%', minHeight: '90px', padding: '14px 18px', fontSize: '0.95rem' }} value={formData.summary} onChange={(e) => setFormData({ ...formData, summary: e.target.value })} />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nội dung chi tiết</label>

                      {isAIAssistantOpen && (
                        <div className="ai-assistant-panel">
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 700 }}>AI Đang trợ giúp viết kịch bản...</span>
                            <button type="button" onClick={() => setIsAIAssistantOpen(false)} className="mini-icon-btn"><X size={14} /></button>
                          </div>
                          <textarea
                            placeholder="Dán thông tin thô hoặc ý tưởng vào đây..."
                            className="glass-input"
                            style={{ width: '100%', minHeight: '120px', fontSize: '0.85rem', marginBottom: '12px', background: 'rgba(0,0,0,0.2)' }}
                            value={rawAIInput}
                            onChange={(e) => setRawAIInput(e.target.value)}
                          />
                          <button type="button" onClick={handleGenerateScript} disabled={generatingScript || !rawAIInput.trim()} className="btn-primary" style={{ width: '100%', background: '#a855f7' }}>
                            {generatingScript ? 'Đang thực hiện...' : 'Biên tập tự động'}
                          </button>
                        </div>
                      )}

                      <div style={{ position: 'relative' }}>
                        {showHighlightPreview ? (
                          <div
                            style={{
                              width: '100%', minHeight: '400px', padding: '20px', lineHeight: '1.8', fontSize: '1rem',
                              background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)',
                              color: '#cbd5e1', whiteSpace: 'pre-wrap', overflowY: 'auto'
                            }}
                            onClick={() => setShowHighlightPreview(false)}
                            title="Bấm để quay lại chế độ soạn thảo"
                          >
                            {renderHighlightedText()}
                          </div>
                        ) : (
                          <textarea required placeholder="Bắt đầu soạn thảo ở đây..." className="glass-input-premium" style={{ width: '100%', minHeight: '400px', padding: '20px', lineHeight: '1.8', fontSize: '1rem' }} value={formData.body} onChange={(e) => setFormData({ ...formData, body: e.target.value })} />
                        )}
                        {aiAnalysis?.isSensitive && !showHighlightPreview && (
                          <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ef4444', color: 'white', fontSize: '0.6rem', padding: '2px 8px', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }} onClick={() => setShowHighlightPreview(true)}>
                            PHÁT HIỆN LỖI
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div style={{
                padding: '1.5rem 3rem',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1.5rem',
                background: 'rgba(255,255,255,0.02)'
              }}>
                <button type="button" onClick={() => { setIsModalOpen(false); setAiAnalysis(null); }} className="btn-secondary" style={{ padding: '0.8rem 1.5rem', fontSize: '0.85rem', fontWeight: 600 }}>Hủy bỏ</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.8rem 3rem', fontSize: '0.85rem', fontWeight: 800, letterSpacing: '0.5px' }}>{editingItem ? 'CẬP NHẬT BẢN TIN' : 'ĐĂNG BẢN TIN'}</button>
              </div>
            </form>

            {/* Overlays for Recording/Editing - Absolute position within modal */}
            {isRecorderOpen && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div style={{ width: '100%', maxWidth: '500px' }}>
                  <AudioRecorder onSave={(blob) => uploadAudioBlob(blob, `Record_${new Date().getTime()}.mp3`)} onCancel={() => setIsRecorderOpen(false)} />
                </div>
              </div>
            )}

            {isEditorOpen && uploadedAudio?.id && (
              <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
                <div style={{ width: '100%', maxWidth: '600px' }}>
                  <AudioEditor fileId={uploadedAudio.id} fileName={uploadedAudio.name} fileUrl={uploadedAudio.url || ''} duration={uploadedAudio.duration} contentId={editingItem?.id || 0} onClose={() => setIsEditorOpen(false)} onSuccess={() => { fetchContents(); handleOpenModal(editingItem || undefined); }} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TTS Advanced Selection Modal */}
      {isTTSModalOpen && targetTTSItem && (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mic color="#10b981" /> Tùy chọn giọng đọc AI
        </h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.8rem' }}>Chọn vùng miền & giới tính</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              className={`voice-opt ${ttsOptions.voice === 'vi-VN-HoaiMyNeural' ? 'active' : ''}`}
              onClick={() => setTtsOptions({ ...ttsOptions, voice: 'vi-VN-HoaiMyNeural' })}
            >
              Bắc (Nữ)
            </button>
            <button
              className={`voice-opt ${ttsOptions.voice === 'vi-VN-NamMinhNeural' ? 'active' : ''}`}
              onClick={() => setTtsOptions({ ...ttsOptions, voice: 'vi-VN-NamMinhNeural' })}
            >
              Bắc (Nam)
            </button>
            <button
              className={`voice-opt ${ttsOptions.voice === 'south-female' ? 'active' : ''}`}
              disabled
              title="Sắp ra mắt"
              style={{ opacity: 0.5 }}
            >
              Nam (Nữ)
            </button>
            <button
              className={`voice-opt ${ttsOptions.voice === 'south-male' ? 'active' : ''}`}
              disabled
              title="Sắp ra mắt"
              style={{ opacity: 0.5 }}
            >
              Nam (Nam)
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.8rem' }}>Phong cách giọng đọc</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className={`voice-opt ${ttsOptions.rate === '+0%' ? 'active' : ''}`}
              onClick={() => setTtsOptions({ ...ttsOptions, rate: '+0%', pitch: '+0Hz' })}
            >
              Dõng dạc
            </button>
            <button
              className={`voice-opt ${ttsOptions.rate === '-10%' ? 'active' : ''}`}
              onClick={() => setTtsOptions({ ...ttsOptions, rate: '-10%', pitch: '+2Hz' })}
            >
              Truyền cảm
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '2rem' }}>
          <button
            onClick={() => setIsTTSModalOpen(false)}
            className="glass-input"
            style={{ flex: 1, cursor: 'pointer' }}
          >
            Hủy
          </button>
          <button
            onClick={handleGenerateTTS}
            disabled={processingTTS === targetTTSItem.id}
            className="btn-primary"
            style={{
              flex: 2,
              background: '#10b981',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '200px'
            }}
          >
            {processingTTS === targetTTSItem.id ? (
              <>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${ttsProgress}%`, background: 'rgba(255,255,255,0.2)',
                  transition: 'width 0.3s ease-out'
                }} />
                <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <Volume2 size={16} className="animate-pulse" />
                  Đang xử lý: {ttsProgress}%
                </span>
              </>
            ) : 'Bắt đầu chuyển đổi'}
          </button>
        </div>

        <style>{`
              .voice-opt {
                background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
                color: #94a3b8; padding: 10px; borderRadius: 8px; font-size: 0.85rem;
                cursor: pointer; transition: all 0.2s;
              }
              .voice-opt:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: white; }
              .voice-opt.active { background: rgba(16, 185, 129, 0.1); border-color: #10b981; color: #10b981; font-weight: 700; }
            `}</style>
      </div>
    </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && itemToDelete && (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '450px',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '20px',
          background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px'
        }}>
          <AlertTriangle size={36} />
        </div>

        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
          Xác nhận xóa?
        </h3>

        <p style={{ color: '#94a3b8', marginBottom: '32px', lineHeight: '1.6' }}>
          Bạn có chắc chắn muốn xóa bản tin <strong style={{ color: '#f1f5f9' }}>{itemToDelete.title}</strong>?<br />
          Hành động này không thể hoàn tác.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setIsDeleteModalOpen(false)}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => confirmDelete()}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px',
              background: '#ef4444', border: 'none',
              color: 'white', fontWeight: 600, cursor: 'pointer',
              boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Xóa ngay
          </button>
        </div>
      </div>
    </div>
  )}

<style>{`
        .table-row { border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s; }
        .table-row:hover { background: rgba(255,255,255,0.02); }
        .icon-btn { 
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #94a3b8; 
          padding: 8px; borderRadius: 8px; cursor: pointer; transition: all 0.2s; 
          display: flex; alignItems: center; justifyContent: center;
        }
        .icon-btn:hover { background: rgba(99, 102, 241, 0.1); color: #818cf8; border-color: rgba(99, 102, 241, 0.2); }
        .icon-btn.ai:hover { background: rgba(168, 85, 247, 0.1); color: #a855f7; border-color: rgba(168, 85, 247, 0.2); }
        .icon-btn.tts:hover { background: rgba(16, 185, 129, 0.1); color: #10b981; border-color: rgba(16, 185, 129, 0.2); }
        .icon-btn.delete:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
        .glass-input {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1);
          color: white; padding: 12px; borderRadius: 10px; font-size: 0.9rem;
          outline: none; transition: border-color 0.2s;
        }
        .glass-input:focus { border-color: #6366f1; background: rgba(255,255,255,0.05); }
      `}</style>
    </div >
  )
}
