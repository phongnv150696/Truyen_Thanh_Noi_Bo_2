import { useState, useEffect } from 'react'
import { 
  Languages,
  Plus,
  Search,
  Edit2,
  Trash2,
  Volume2,
  X,
  Book,
  ChevronLeft,
  ChevronRight,
  Users,
  Crosshair,
  Map,
  Shield
} from 'lucide-react'
import CustomSelect from '../../components/CustomSelect'

interface DictionaryEntry {
  id: number;
  word: string;
  phonetic_reading: string;
  category: string;
  created_at: string;
}

export default function MilitaryDictionary() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<DictionaryEntry | null>(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 7
  
  const [formData, setFormData] = useState({
    word: '',
    phonetic_reading: '',
    category: 'Thuật ngữ'
  })

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  useEffect(() => {
    fetchEntries()
  }, [])

  const fetchEntries = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://127.0.0.1:3000/dictionary', {
        headers: getHeaders()
      })
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to fetch dictionary:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (entry?: DictionaryEntry) => {
    if (entry) {
      setEditingEntry(entry)
      setFormData({
        word: entry.word,
        phonetic_reading: entry.phonetic_reading,
        category: entry.category
      })
    } else {
      setEditingEntry(null)
      setFormData({
        word: '',
        phonetic_reading: '',
        category: 'Thuật ngữ'
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = editingEntry 
      ? `http://127.0.0.1:3000/dictionary/${editingEntry.id}` 
      : 'http://127.0.0.1:3000/dictionary'
    const method = editingEntry ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setIsModalOpen(false)
        fetchEntries()
      }
    } catch (err) {
      console.error('Save failed:', err)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa từ này khỏi từ điển?')) return
    try {
      const res = await fetch(`http://127.0.0.1:3000/dictionary/${id}`, { 
        method: 'DELETE',
        headers: getHeaders()
      })
      if (res.ok) fetchEntries()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const filteredEntries = entries.filter(e => 
    e.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.phonetic_reading.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Pagination Logic
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const paginatedEntries = filteredEntries.slice(
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ width: '50px', height: '50px', background: 'rgba(99,102,241,0.1)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Languages size={28} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>Từ điển Quân sự</h1>
            <p style={{ color: '#94a3b8', marginTop: '0.4rem' }}>Chỉnh sửa phiên âm để AI đọc chính xác các thuật ngữ chuyên ngành.</p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={20} />
          <span>Thêm thuật ngữ</span>
        </button>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'visible' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={20} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm từ hoặc phiên âm..." 
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
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>TỪ / CỤM TỪ</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>CÁCH PHIÊN ÂM (CHO AI)</th>
                <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>PHÂN LOẠI</th>
                <th style={{ textAlign: 'right', padding: '1rem 1.5rem', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</td></tr>
              ) : filteredEntries.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Từ điển trống.</td></tr>
              ) : (
                paginatedEntries.map(entry => (
                  <tr key={entry.id} className="table-row">
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Book size={16} color="#6366f1" />
                        {entry.word}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontWeight: 600 }}>
                        <Volume2 size={16} />
                        {entry.phonetic_reading}
                      </div>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem' }}>
                      <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                        {entry.category}
                      </span>
                    </td>
                    <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="icon-btn" title="Sửa" onClick={() => handleOpenModal(entry)}><Edit2 size={18} /></button>
                        <button className="icon-btn delete" title="Xóa" onClick={() => handleDelete(entry.id)}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination UI */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1.5rem',
            gap: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
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
      </div>

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0 }}>{editingEntry ? 'Sửa thuật ngữ' : 'Thêm thuật ngữ mới'}</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Từ / Cụm từ gốc</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: QK7, LLVT..." 
                  className="glass-input"
                  style={{ width: '100%' }}
                  value={formData.word}
                  onChange={(e) => setFormData({...formData, word: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Cách AI nên phát âm (Phonetic)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Quân khu bảy, Lực lượng vũ trang..." 
                  className="glass-input"
                  style={{ width: '100%' }}
                  value={formData.phonetic_reading}
                  onChange={(e) => setFormData({...formData, phonetic_reading: e.target.value})}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Phân loại</label>
                <CustomSelect
                  value={formData.category}
                  onChange={(val) => setFormData({...formData, category: val})}
                  options={[
                    { value: 'Thuật ngữ', label: 'Thuật ngữ', icon: <Book size={16} color="#6366f1" /> },
                    { value: 'Đơn vị', label: 'Đơn vị', icon: <Users size={16} color="#10b981" /> },
                    { value: 'Vũ khí', label: 'Vũ khí', icon: <Crosshair size={16} color="#ef4444" /> },
                    { value: 'Chiến thuật', label: 'Chiến thuật', icon: <Map size={16} color="#f59e0b" /> },
                    { value: 'Cấp bậc', label: 'Cấp bậc', icon: <Shield size={16} color="#a855f7" /> },
                  ]}
                  placeholder="Chọn phân loại..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '0.8rem 1.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}>Hủy bỏ</button>
                <button type="submit" className="btn-primary" style={{ padding: '0.8rem 2rem' }}>Lưu thuật ngữ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .table-row { border-bottom: 1px solid rgba(255,255,255,0.03); transition: all 0.2s; }
        .table-row:hover { background: rgba(255,255,255,0.02); }
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
