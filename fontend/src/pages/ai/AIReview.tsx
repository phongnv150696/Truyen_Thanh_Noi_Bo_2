import { useState, useEffect } from 'react';
import {
  Check,
  RefreshCw,
  Clock,
  FileText,
  User,
  ThumbsUp,
  ThumbsDown,
  Eye,
  X,
  Volume2
} from 'lucide-react';


interface ContentItem {
  id: number;
  title: string;
  summary: string;
  body: string;
  created_at: string;
  author_id?: number;
  author_name?: string;
  author_rank?: string;
  unit_name?: string;
  audio_path?: string;
}

interface AIReviewProps {
  user: any;
}

export default function AIReview({ user: _user }: AIReviewProps) {
  const [pendingNews, setPendingNews] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedNews, setSelectedNews] = useState<ContentItem | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [penRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3000/content/pending`, { headers: getHeaders() })
      ]);
      
      if (penRes.ok) {
        const data = await penRes.json();
        setPendingNews(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenReview = (news: ContentItem) => {
    setSelectedNews(news);
    setIsReviewModalOpen(true);
  };

  const handleApproveNews = async (id: number) => {
    console.log('Approve clicked for ID:', id);
    setApprovingId(id);
    try {
      const token = localStorage.getItem('openclaw_token');
      const res = await fetch(`http://${window.location.hostname}:3000/content/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'approved', comments: reviewComment })
      });
      if (res.ok) {
        setPendingNews(prev => prev.filter(n => n.id !== id));
        setIsReviewModalOpen(false);
        setSelectedNews(null);
      }
    } catch (error) {
      console.error('Error approving news:', error);
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectNews = async (id: number) => {
    console.log('Reject clicked for ID:', id);
    setRejectingId(id);
    try {
      const token = localStorage.getItem('openclaw_token');
      const res = await fetch(`http://${window.location.hostname}:3000/content/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected', comments: reviewComment })
      });
      if (res.ok) {
        setPendingNews(prev => prev.filter(n => n.id !== id));
        setIsReviewModalOpen(false);
        setSelectedNews(null);
      }
    } catch (error) {
      console.error('Error rejecting news:', error);
    } finally {
      setRejectingId(null);
    }
  };

  const formatSafeDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return '--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleString('vi-VN');
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Phê duyệt Bản tin</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Rà soát và phê duyệt nội dung thủ công trước khi phát sóng.</p>
        </div>
        <button
          onClick={fetchData}
          className="btn-secondary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Section 1: Manual News Review */}
          <section className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={20} color="#10b981" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Bản tin Chờ phê duyệt ({pendingNews.length})</h3>
              </div>
            </div>

            <div style={{ minHeight: '200px' }}>
              {loading ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải danh sách chờ duyệt...</div>
              ) : pendingNews.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                  <Check size={32} style={{ color: '#10b981', opacity: 0.3, marginBottom: '1rem' }} />
                  <p>Không có bản tin nào đang chờ phê duyệt.</p>
                </div>
              ) : (
                pendingNews.map(news => (
                  <div key={news.id} className="table-row-hover" style={{ padding: '1.2rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fff', marginBottom: '4px' }}>{news.title}</div>
                      <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.85rem', maxWidth: '500px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {news.summary || 'Chưa có tóm tắt...'}
                      </p>
                      <div style={{ display: 'flex', gap: '15px', marginTop: '8px', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> {formatSafeDateTime(news.created_at)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {news.author_name ? `${news.author_rank || ''} ${news.author_name}` : `ID: ${news.author_id}`}</span>
                        {news.unit_name && <span style={{ padding: '2px 8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '4px', color: '#818cf8' }}>{news.unit_name}</span>}
                        {news.audio_path && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}><Volume2 size={12} /> Có âm thanh</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleOpenReview(news)}
                      className="btn-primary"
                      style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '10px 18px', borderRadius: '12px', fontSize: '0.85rem' }}
                    >
                      <Eye size={18} />
                      Phê duyệt
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
      {/* Review Modal */}
      {isReviewModalOpen && selectedNews && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', padding: 0 }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={18} color="#818cf8" />
                </div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Rà soát Bản tin</h2>
              </div>
              <button onClick={() => setIsReviewModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            
            <div style={{ padding: '2.5rem' }}>
              <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '12px', lineHeight: 1.3 }}>{selectedNews.title}</h1>
                <div style={{ display: 'flex', gap: '20px', color: '#64748b', fontSize: '0.9rem', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={16} /> {formatSafeDateTime(selectedNews.created_at)}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <User size={16} color="#818cf8" />
                    <span style={{ color: '#fff', fontWeight: 600 }}>
                      {selectedNews.author_name ? `${selectedNews.author_rank || ''} ${selectedNews.author_name}` : `ID: ${selectedNews.author_id}`}
                    </span>
                    {selectedNews.unit_name && (
                      <span style={{ marginLeft: '8px', paddingLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', color: '#818cf8', fontWeight: 700 }}>
                        {selectedNews.unit_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {selectedNews.summary && (
                <div style={{ padding: '1.2rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', borderLeft: '4px solid #6366f1', marginBottom: '2rem' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px' }}>Tóm tắt:</h4>
                  <p style={{ margin: 0, color: '#cbd5e1', lineHeight: 1.6 }}>{selectedNews.summary}</p>
                </div>
              )}

              {selectedNews.audio_path && (
                <div style={{ marginBottom: '2.5rem', padding: '1.5rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
                    <Volume2 size={20} color="#10b981" />
                    <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase' }}>Nghe thử âm thanh:</h4>
                  </div>
                  <audio controls style={{ width: '100%', height: '40px' }}>
                    <source src={`http://${window.location.hostname}:3000${selectedNews.audio_path.startsWith('/') ? '' : '/'}${selectedNews.audio_path}`} type="audio/mpeg" />
                    Trình duyệt của bạn không hỗ trợ phát âm thanh.
                  </audio>
                </div>
              )}

              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '2.5rem' }}>
                <h4 style={{ margin: '0 0 1.2rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Nội dung chi tiết:</h4>
                <div style={{ fontSize: '1.05rem', color: '#fff', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {selectedNews.body || 'Không có nội dung chi tiết.'}
                </div>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Nhận xét & Phản hồi:</h4>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Ghi chú lý do từ chối hoặc góp ý sửa đổi (ví dụ: Sai lỗi chính tả, âm thanh nhỏ...)"
                  style={{ 
                    width: '100%', minHeight: '100px', background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', 
                    padding: '1rem', color: '#fff', fontSize: '0.95rem', resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '2rem' }}>
                <button 
                  onClick={() => { setIsReviewModalOpen(false); setReviewComment(''); }} 
                  style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, pointerEvents: 'auto' }}
                >
                  Đóng lại
                </button>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                      onClick={() => { console.log('Rejecting ID:', selectedNews.id); handleRejectNews(selectedNews.id); }}
                      disabled={rejectingId !== null || approvingId !== null}
                      className="btn-secondary"
                      style={{ padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.2)', fontWeight: 700, cursor: 'pointer', position: 'relative', pointerEvents: 'auto' }}
                    >
                      {rejectingId === selectedNews.id ? <RefreshCw size={18} className="animate-spin" /> : <ThumbsDown size={18} />}
                      Từ chối
                    </button>
                    <button
                      onClick={() => { console.log('Approving ID:', selectedNews.id); handleApproveNews(selectedNews.id); }}
                      disabled={approvingId !== null || rejectingId !== null}
                      className="btn-primary"
                      style={{ background: '#10b981', padding: '12px 32px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, cursor: 'pointer', border: 'none', position: 'relative', pointerEvents: 'auto' }}
                    >
                      {approvingId === selectedNews.id ? <RefreshCw size={18} className="animate-spin" /> : <ThumbsUp size={18} />}
                      Phê chuẩn
                    </button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
