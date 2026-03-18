import { useState, useEffect } from 'react'
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
  ChevronRight
} from 'lucide-react'

interface ContentItem {
  id: number;
  title: string;
  summary: string;
  body: string;
  status: 'draft' | 'pending_review' | 'approved' | 'published' | 'archived';
  tags: string[];
  created_at: string;
}

export default function ContentManagement() {
  const [contents, setContents] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [processingAI, setProcessingAI] = useState<number | null>(null)
  const [processingTTS, setProcessingTTS] = useState<number | null>(null)
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false)
  const [rawAIInput, setRawAIInput] = useState('')
  const [generatingScript, setGeneratingScript] = useState(false)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7
  
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    body: '',
    status: 'draft',
    tags: ''
  })

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://127.0.0.1:3000/content', {
        headers: getHeaders()
      })
      const data = await res.json()
      setContents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch contents:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (item?: ContentItem) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        title: item.title,
        summary: item.summary || '',
        body: item.body,
        status: item.status,
        tags: item.tags?.join(', ') || ''
      })
    } else {
      setEditingItem(null)
      setFormData({
        title: '',
        summary: '',
        body: '',
        status: 'draft',
        tags: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingItem 
      ? `http://127.0.0.1:3000/content/${editingItem.id}` 
      : 'http://127.0.0.1:3000/content'
    const method = editingItem ? 'PUT' : 'POST'

    const payload = {
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t !== '')
    }

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchContents()
      }
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bản tin này?')) return
    try {
      const res = await fetch(`http://127.0.0.1:3000/content/${id}`, { 
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) fetchContents()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const handleAIReview = async (id: number) => {
    setProcessingAI(id)
    try {
      const res = await fetch(`http://127.0.0.1:3000/ai/review/${id}`, {
        headers: getHeaders()
      })
      if (res.ok) {
        const result = await res.json()
        alert(`Kiểm duyệt hoàn tất!\nĐiểm AI: ${result.analysis.score}\n${result.analysis.summary}`)
        fetchContents()
      } else {
        alert('Lỗi khi gửi AI rà soát.')
      }
    } catch (err) {
      console.error('AI Review failed:', err)
      alert('Không thể kết nối tới dịch vụ AI.')
    } finally {
      setProcessingAI(null)
    }
  }

  const handleGenerateTTS = async (item: ContentItem) => {
    setProcessingTTS(item.id)
    try {
      const res = await fetch('http://127.0.0.1:3000/media/tts', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ 
          text: item.body, 
          file_name: `TTS_${item.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp3` 
        })
      })
      if (res.ok) {
        alert('Tạo file âm thanh thành công! Đã lưu vào Thư viện Media.')
      } else {
        alert('Lỗi khi tạo TTS.')
      }
    } catch (err) {
      console.error('TTS generation failed:', err)
      alert('Không thể kết nối tới dịch vụ TTS.')
    } finally {
      setProcessingTTS(null)
    }
  }

  const handleGenerateScript = async () => {
    if (!rawAIInput.trim()) return;
    setGeneratingScript(true);
    try {
      const res = await fetch('http://127.0.0.1:3000/ai/generate-script', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ rawText: rawAIInput })
      });
      if (res.ok) {
        const result = await res.json();
        setFormData({
          ...formData,
          title: result.title,
          body: result.script,
          summary: `Tóm tắt tự động: ${result.title}. Thời lượng dự kiến: ${result.estimatedDuration}.`
        });
        setIsAIAssistantOpen(false);
        setRawAIInput('');
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle2 size={16} color="#10b981" />
      case 'pending_review': return <Clock size={16} color="#f59e0b" />
      case 'draft': return <FileText size={16} color="#94a3b8" />
      default: return <AlertCircle size={16} color="#ef4444" />
    }
  }

  const filteredContents = contents.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.summary?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} />
          <span>Tạo bản tin mới</span>
        </button>
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
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TIÊU ĐỀ & TÓM TẮT</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TRẠNG THÁI</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>CHỦ ĐỀ/TAGS</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>NGÀY TẠO</th>
                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
              ) : filteredContents.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Không tìm thấy bản tin nào.</td></tr>
              ) : (
                paginatedContents.map(item => (
                  <tr key={item.id} className="table-row">
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>{item.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.summary || 'Chưa có tóm tắt...'}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                        {getStatusIcon(item.status)}
                        <span style={{ textTransform: 'capitalize' }}>
                          {item.status === 'pending_review' ? 'Chờ duyệt' : item.status === 'published' ? 'Đã phát' : 'Nháp'}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {item.tags?.slice(0, 2).map((tag, idx) => (
                          <span key={idx} style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem' }}>{tag}</span>
                        )) || '--'}
                        {item.tags?.length > 2 && <span style={{ color: '#475569', fontSize: '0.7rem' }}>+{item.tags.length - 2}</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className="icon-btn ai" 
                          title="Gửi AI rà soát" 
                          onClick={() => handleAIReview(item.id)}
                          disabled={processingAI === item.id}
                        >
                          <Sparkles size={18} className={processingAI === item.id ? 'animate-spin' : ''} />
                        </button>
                        <button 
                          className="icon-btn tts" 
                          title="Chuyển đổi TTS" 
                          onClick={() => handleGenerateTTS(item)}
                          disabled={processingTTS === item.id}
                        >
                          <Mic size={18} className={processingTTS === item.id ? 'animate-spin' : ''} />
                        </button>
                        <button className="icon-btn" title="Xem" onClick={() => handleOpenModal(item)}><Eye size={18} /></button>
                        <button className="icon-btn" title="Sửa" onClick={() => handleOpenModal(item)}><Edit2 size={18} /></button>
                        <button className="icon-btn delete" title="Xóa" onClick={() => handleDelete(item.id)}><Trash2 size={18} /></button>
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
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{editingItem ? 'Chỉnh sửa Bản tin' : 'Tạo Bản tin mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Tiêu đề</label>
                <input 
                  type="text" 
                  required
                  placeholder="Tiêu đề bản tin..." 
                  className="glass-input"
                  style={{ width: '100%' }}
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Tóm tắt</label>
                <textarea 
                  placeholder="Mô tả ngắn gọn nội dung..." 
                  className="glass-input"
                  style={{ width: '100%', minHeight: '80px' }}
                  value={formData.summary}
                  onChange={(e) => setFormData({...formData, summary: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nội dung chi tiết</label>
                  <button 
                    type="button" 
                    onClick={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '6px', 
                      fontSize: '0.75rem', background: 'rgba(168, 85, 247, 0.15)', 
                      color: '#a855f7', border: '1px solid rgba(168, 85, 247, 0.3)',
                      padding: '4px 10px', borderRadius: '6px', cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Trợ lý AI viết kịch bản</span>
                  </button>
                </div>

                {isAIAssistantOpen && (
                  <div style={{ 
                    background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)', 
                    borderRadius: '10px', padding: '1rem', marginBottom: '1rem', animation: 'slide-down 0.3s' 
                  }}>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#a855f7', fontWeight: 600 }}>Dán thông tin thô vào đây để AI biên tập thành bản tin:</p>
                    <textarea 
                      placeholder="Ví dụ: Đơn vị tổ chức lễ ra quân vào sáng thứ 2, yêu cầu mặc quân phục chỉnh tề..." 
                      className="glass-input"
                      style={{ width: '100%', minHeight: '100px', fontSize: '0.85rem', marginBottom: '10px', borderColor: 'rgba(168, 85, 247, 0.2)' }}
                      value={rawAIInput}
                      onChange={(e) => setRawAIInput(e.target.value)}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button type="button" onClick={() => setIsAIAssistantOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.8rem', cursor: 'pointer' }}>Hủy</button>
                      <button 
                        type="button" 
                        onClick={handleGenerateScript}
                        disabled={generatingScript || !rawAIInput.trim()}
                        className="btn-primary" 
                        style={{ background: '#a855f7', padding: '6px 15px', fontSize: '0.8rem' }}
                      >
                        {generatingScript ? 'Đang soạn thảo...' : 'Biên tập tự động'}
                      </button>
                    </div>
                  </div>
                )}

                <textarea 
                  required
                  placeholder="Nội dung phát thanh..." 
                  className="glass-input"
                  style={{ width: '100%', minHeight: '200px', lineHeight: '1.6' }}
                  value={formData.body}
                  onChange={(e) => setFormData({...formData, body: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Trạng thái</label>
                  <select 
                    className="glass-input" 
                    style={{ width: '100%', background: '#1e293b' }}
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="pending_review">Chờ duyệt</option>
                    <option value="published">Đã phát</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Nhãn (phân cách bởi dấu phẩy)</label>
                  <input 
                    type="text" 
                    placeholder="Chính trị, Quân sự, Tin nóng..." 
                    className="glass-input"
                    style={{ width: '100%' }}
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy bỏ</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2rem' }}>Lưu thông tin</button>
              </div>
            </form>
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
    </div>
  )
}
