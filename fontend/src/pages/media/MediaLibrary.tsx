import React, { useState, useEffect } from 'react'
import {
  Upload,
  FileAudio,
  Trash2,
  Play,
  AlertCircle,
  Search,
  Filter,
  MoreVertical,
  HardDrive,
  Download,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Link2,
  Radio
} from 'lucide-react'
import AudioPlayerModal from './AudioPlayerModal'

interface MediaFile {
  id: number
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  content_id: number | null
  content_title: string | null
  created_at: string
}

interface ContentItem {
  id: number
  title: string
}

export default function MediaLibrary({ onLogout }: { onLogout?: () => void }) {
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [uploadProgress, setUploadProgress] = useState<{ percent: number; loaded: number; total: number } | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  useEffect(() => {
    setCurrentPage(1)
    setSelectedIds([])
  }, [searchTerm])
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [playingFile, setPlayingFile] = useState<MediaFile | null>(null)
  const [contents, setContents] = useState<ContentItem[]>([])
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false)
  const [linkingFileId, setLinkingFileId] = useState<number | null>(null)

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  useEffect(() => {
    fetchFiles()
    fetchContents()

    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-menu-container')) {
        setMenuOpenId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/media`, {
        headers: getHeaders()
      })
      const data = await response.json()
      setFiles(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching files:', err)
      setError('Không thể tải danh sách bản tin.')
      setFiles([])
    } finally {
      setLoading(false)
    }
  }

  const fetchContents = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/content`, {
        headers: getHeaders()
      })
      const data = await response.json()
      setContents(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching contents:', err)
    }
  }

  const handleLinkMedia = async (fileId: number, contentId: number | null) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/media/${fileId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ content_id: contentId })
      })

      if (response.ok) {
        const { file } = await response.json()
        setFiles(prev => prev.map(f => f.id === fileId ? file : f))
        setIsLinkingModalOpen(false)
        setLinkingFileId(null)
      } else {
        setError('Không thể cập nhật liên kết.')
      }
    } catch (err) {
      setError('Lỗi kết nối.')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setUploadProgress({ percent: 0, loaded: 0, total: file.size })

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100)
        setUploadProgress({ percent, loaded: e.loaded, total: e.total })
      }
    })

    xhr.onload = () => {
      setUploading(false)
      setUploadProgress(null)
      if (xhr.status >= 200 && xhr.status < 300) {
        fetchFiles()
      } else {
        try {
          const resp = JSON.parse(xhr.responseText)
          setError(resp.error || 'Tải lên thất bại.')
        } catch {
          setError('Tải lên thất bại.')
        }
      }
    }

    xhr.onerror = () => {
      setUploading(false)
      setUploadProgress(null)
      setError('Lỗi kết nối server.')
    }

    xhr.open('POST', `http://${window.location.hostname}:3000/media/upload`)
    const token = localStorage.getItem('openclaw_token')
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }
    xhr.send(formData)
  }

  const handleDelete = async (id: number) => {
    console.log(`[FRONTEND] Attempting to delete file with ID: ${id}`);
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản tin này?')) return

    try {
      const response = await fetch(`http://${window.location.hostname}:3000/media/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      })
      console.log(`[FRONTEND] Response status: ${response.status}`);

      if (response.ok) {
        setFiles(prev => prev.filter(f => f.id !== id))
        setSelectedIds(prev => prev.filter(sid => sid !== id))
        if (playingFile?.id === id) {
          setPlayingFile(null)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(`Xóa thất bại (Mã: ${response.status}): ${errorData.error || 'Lỗi không xác định'}`)
      }
    } catch (err) {
      console.error('[FRONTEND] Delete error:', err);
      setError('Lỗi kết nối khi xóa file.')
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} bản tin đã chọn?`)) return

    setLoading(true)
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/media/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (response.ok) {
        setFiles(prev => prev.filter(f => !selectedIds.includes(f.id)))
        if (playingFile && selectedIds.includes(playingFile.id)) {
          setPlayingFile(null)
        }
        setSelectedIds([])
      } else {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Xóa hàng loạt thất bại.')
      }
    } catch (err) {
      console.error('Bulk delete error:', err)
      setError('Lỗi kết nối khi xóa hàng loạt.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedFiles.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedFiles.map(f => f.id))
    }
  }

  const toggleItemSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
    )
  }

  const formatSafeDate = (dateStr: string | undefined) => {
    if (!dateStr) return '--/--/----';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--/--/----';
    return d.toLocaleDateString('vi-VN');
  };

  const handleRename = async (id: number) => {
    if (!editValue.trim()) return

    try {
      const response = await fetch(`http://${window.location.hostname}:3000/media/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ file_name: editValue.trim() })
      })

      if (response.ok) {
        const { file } = await response.json()
        setFiles(prev => prev.map(f => f.id === id ? file : f))
        setEditingId(null)
      } else {
        setError('Không thể đổi tên.')
      }
    } catch (err) {
      setError('Lỗi kết nối.')
    }
  }

  const handleDownload = async (file: MediaFile) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/uploads/${file.file_path}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.file_name)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      const link = document.createElement('a')
      link.href = `http://${window.location.hostname}:3000/uploads/${file.file_path}`
      link.download = file.file_name
      link.click()
    }
  }

  const togglePlay = (file: MediaFile) => {
    setPlayingFile(file)
  }

  const handleBroadcast = async (file: MediaFile) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3000/media/${file.id}/broadcast`, {
        method: 'POST',
        headers: getHeaders()
      })

      if (response.ok) {
        alert('Kích hoạt phát sóng hệ thống thành công!')
      } else {
        const data = await response.json()
        setError(data.error || 'Lỗi khi kích hoạt phát sóng.')
      }
    } catch (err) {
      setError('Lỗi kết nối khi gửi lệnh phát sóng.')
    }
  }

  const itemsPerPage = 7
  const filteredFiles = files.filter(file =>
    file.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage)
  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0.00 KB'
    const kb = bytes / 1024
    if (kb >= 1024) {
      return `${(kb / 1024).toFixed(2)} MB`
    }
    return `${kb.toFixed(2)} KB`
  }

  return (
    <>
      {/* 1. Header Section */}
      <div className="animate-fade-in" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Thư viện Media</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Kho lưu trữ bản tin kỹ thuật số của hệ thống</p>
        </div>

        <label className="btn-primary" style={{ padding: '12px 28px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', height: 'fit-content', fontWeight: 700, boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)', position: 'relative', overflow: 'hidden' }}>
          <Upload size={20} style={{ zIndex: 2 }} />
          <span style={{ zIndex: 2 }}>{uploading ? 'Đang tải lên...' : 'Tải lên Audio'}</span>
          <input type="file" hidden accept="audio/*" onChange={handleFileUpload} disabled={uploading} />
        </label>
      </div>

      {uploading && uploadProgress && (
        <div className="glass-card animate-fade-in" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <RefreshCw size={20} className="animate-spin" color="#6366f1" />
              <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Đang xử lý tải lên...</span>
            </div>
            <span style={{ fontWeight: 800, color: '#6366f1', fontSize: '1.2rem' }}>{uploadProgress.percent}%</span>
          </div>

          <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '0.8rem' }}>
            <div style={{ width: `${uploadProgress.percent}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '10px', transition: 'width 0.2s ease-out' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>
            <span>Đã tải: {formatSize(uploadProgress.loaded)}</span>
            <span>Tổng dung lượng: {formatSize(uploadProgress.total)}</span>
          </div>
        </div>
      )}

      {/* 2. Stats Grid Section */}
      <section className="section-container animate-fade-in" style={{ width: '100%' }}>
        <div className="stats-grid">
          <div className="stat-card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileAudio size={28} color="#6366f1" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#6366f1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Thư viện tệp</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Tổng số bản tin lưu trữ</p>
            <div className="stat-value" style={{ fontSize: '2.8rem' }}>{files.length}</div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Tập tin âm thanh đã sẵn sàng</p>
          </div>

          <div className="stat-card" style={{ padding: '1.8rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '55px', height: '55px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={28} color="#10b981" />
              </div>
              <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Dung lượng bộ nhớ</span>
            </div>
            <p style={{ color: '#94a3b8', marginTop: '1.2rem', marginBottom: '0.4rem', fontWeight: 500, fontSize: '0.95rem' }}>Dung lượng đã sử dụng</p>
            <div className="stat-value" style={{ fontSize: '2.8rem', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              {(() => {
                const totalBytes = files.reduce((acc, f) => acc + Number(f.file_size), 0);
                const kb = totalBytes / 1024;
                const mb = kb / 1024;
                return mb >= 1 ? mb.toFixed(2) : kb.toFixed(2);
              })()}
              <span style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 600 }}>
                {(() => {
                  const totalBytes = files.reduce((acc, f) => acc + Number(f.file_size), 0);
                  return (totalBytes / 1024 / 1024) >= 1 ? 'MB' : 'KB';
                })()}
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', marginTop: '1.2rem', overflow: 'hidden' }}>
              <div style={{ width: '25%', height: '100%', background: 'linear-gradient(90deg, #10b981, #34d399)', borderRadius: '10px' }} />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <section className="section-container animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1rem', borderRadius: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{error}</span>
          </div>
        </section>
      )}

      {/* 3. Toolbar Section */}
      <section className="section-container animate-fade-in" style={{ marginBottom: '1.5rem', width: '100%' }}>
        <div className="glass-card" style={{
          padding: '0 8px 0 0',
          display: 'flex',
          alignItems: 'center',
          height: '50px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', height: '100%' }}>
            <Search size={18} style={{ marginLeft: '16px', color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên bản tin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                padding: '0 16px',
                color: 'white',
                fontSize: '0.9rem',
                outline: 'none',
                height: '100%'
              }}
            />
          </div>

          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)', margin: '0 8px' }} />

          <button style={{
            padding: '0 20px',
            height: '34px',
            background: 'transparent',
            border: 'none',
            borderRadius: '8px',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#cbd5e1';
            }}
          >
            <Filter size={16} />
            <span>Lọc</span>
          </button>
        </div>

        {selectedIds.length > 0 && (
          <div className="animate-fade-in" style={{
            marginTop: '1.5rem',
            padding: '1rem 1.5rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f87171', fontWeight: 600 }}>
              <Trash2 size={20} />
              <span>Đã chọn {selectedIds.length} bản tin</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setSelectedIds([])}
                className="btn-secondary"
                style={{ padding: '6px 16px', fontSize: '0.9rem' }}
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn-primary"
                style={{ background: '#ef4444', padding: '6px 16px', fontSize: '0.9rem', border: 'none' }}
              >
                Xóa tất cả đã chọn
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 4. Media List Section */}
      <section className="section-container animate-fade-in" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>Danh sách Media</h2>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{filteredFiles.length} tệp tin</span>
        </div>

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải dữ liệu...</div>
          ) : filteredFiles.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <FileAudio size={40} style={{ opacity: 0.2, marginBottom: '0.8rem' }} />
              <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>Chưa có bản tin nào.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{
                padding: '0.6rem 1.2rem',
                background: 'rgba(255,255,255,0.01)',
                display: 'flex',
                color: '#475569',
                fontSize: '0.7rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                borderBottom: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginatedFiles.length > 0 && selectedIds.length === paginatedFiles.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </div>
                <span style={{ flex: 1.5 }}>Thông tin</span>
                <span style={{ flex: 1.2 }}>Bản tin liên kết</span>
                <span style={{ flex: 0.8 }}>Kích thước</span>
                <span style={{ flex: 0.8 }}>Ngày tạo</span>
                <span style={{ width: '120px', textAlign: 'right' }}>Thao tác</span>
              </div>

              {paginatedFiles.map((file) => (
                <div
                  key={file.id}
                  className="table-row-hover"
                  style={{
                    padding: '0.8rem 1.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease',
                    background: selectedIds.includes(file.id) ? 'rgba(99, 102, 241, 0.05)' : 'transparent'
                  }}
                >
                  <div style={{ width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(file.id)}
                      onChange={() => toggleItemSelect(file.id)}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </div>
                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      onClick={() => togglePlay(file)}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Play size={16} color="#94a3b8" />
                    </div>
                    <div style={{ flex: 1 }}>
                      {editingId === file.id ? (
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', width: '100%' }}>
                          <input
                            autoFocus
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRename(file.id)
                              if (e.key === 'Escape') setEditingId(null)
                            }}
                            style={{
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid #6366f1',
                              borderRadius: '4px',
                              color: 'white',
                              padding: '2px 8px',
                              fontSize: '0.9rem',
                              flex: 1
                            }}
                          />
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRename(file.id); }}
                            style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                            style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <h4 style={{
                          margin: 0,
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          color: '#f1f5f9',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }} title={file.file_name}>
                          {file.file_name}
                        </h4>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <p style={{ margin: 0, color: '#475569', fontSize: '0.75rem' }}>ID: {file.id} • {file.mime_type.split('/')[1]}</p>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: file.content_title ? '#818cf8' : '#475569',
                      fontWeight: file.content_title ? 600 : 400,
                      maxWidth: '180px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {file.content_title || 'Thủ công/Chưa gắn'}
                    </div>
                    <span style={{ fontSize: '0.65rem', color: '#475569' }}>CID: {file.content_id || '--'}</span>
                  </div>

                  <div style={{ flex: 0.8, color: '#94a3b8', fontSize: '0.85rem' }}>
                    {formatSize(file.file_size)}
                  </div>

                  <div style={{ flex: 0.8, color: '#64748b', fontSize: '0.85rem' }}>
                    {formatSafeDate(file.created_at)}
                  </div>

                  <div style={{ width: '120px', display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                      className="btn-icon-hover"
                      title="Xóa"
                      style={{
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '8px',
                        borderRadius: '8px'
                      }}
                    >
                      <Trash2 size={16} />
                    </button>

                    <div className="action-menu-container" style={{ position: 'relative' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === file.id ? null : file.id); }}
                        className="btn-icon-hover"
                        style={{
                          background: menuOpenId === file.id ? 'rgba(255,255,255,0.08)' : 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>

                      {menuOpenId === file.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: '8px',
                          width: '180px',
                          background: 'rgba(15, 23, 42, 0.95)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '12px',
                          padding: '6px',
                          zIndex: 100,
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)'
                        }} className="animate-fade-in">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBroadcast(file)
                              setMenuOpenId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              border: 'none',
                              color: '#818cf8',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              transition: 'all 0.2s',
                              fontWeight: 700,
                              marginBottom: '4px'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)'
                              e.currentTarget.style.color = '#a5b4fc'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)'
                              e.currentTarget.style.color = '#818cf8'
                            }}
                          >
                            <Radio size={14} />
                            <span>Phát qua loa HT</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(file)
                              setMenuOpenId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: 'none',
                              border: 'none',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                              e.currentTarget.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'none'
                              e.currentTarget.style.color = '#cbd5e1'
                            }}
                          >
                            <Download size={14} />
                            <span>Tải xuống</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(file.id)
                              setEditValue(file.file_name)
                              setMenuOpenId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: 'none',
                              border: 'none',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                              e.currentTarget.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'none'
                              e.currentTarget.style.color = '#cbd5e1'
                            }}
                          >
                            <Edit3 size={14} />
                            <span>Chỉnh sửa tên</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLinkingFileId(file.id)
                              setIsLinkingModalOpen(true)
                              setMenuOpenId(null)
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: 'none',
                              border: 'none',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              textAlign: 'left',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                              e.currentTarget.style.color = 'white'
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'none'
                              e.currentTarget.style.color = '#cbd5e1'
                            }}
                          >
                            <Link2 size={14} />
                            <span>Liên kết bản tin</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Pagination UI */}
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
              onClick={() => setCurrentPage(prev => prev - 1)}
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
              onMouseOver={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== 1) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
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
                  onMouseOver={(e) => {
                    if (currentPage !== page) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (currentPage !== page) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
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
              onMouseOver={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseOut={(e) => {
                if (currentPage !== totalPages) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </section>

      <AudioPlayerModal
        file={playingFile}
        isOpen={!!playingFile}
        onClose={() => setPlayingFile(null)}
      />

      {/* Linking Modal */}
      {isLinkingModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
            maxWidth: '500px',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white', margin: 0 }}>Liên kết bản tin</h3>
              <button
                onClick={() => setIsLinkingModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '0.95rem' }}>
              Chọn bản tin mà bạn muốn liên kết với tệp âm thanh này.
            </p>

            <div style={{ marginBottom: '32px' }}>
              <select
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  color: 'white',
                  fontSize: '1rem',
                  outline: 'none'
                }}
                onChange={(e) => setEditValue(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>-- Chọn bản tin --</option>
                <option value="null">Gỡ liên kết (Chưa gắn)</option>
                {contents.map(item => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setIsLinkingModalOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (linkingFileId) {
                    const cid = editValue === 'null' ? null : parseInt(editValue)
                    handleLinkMedia(linkingFileId, cid)
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3)'
                }}
              >
                Lưu liên kết
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
