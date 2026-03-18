import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Calendar,
  Check,
  AlertCircle,
  RefreshCw,
  Search,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AISuggestion {
  id: number;
  content_id: number;
  content_title: string;
  suggestion_type: string;
  suggested_text: string;
  created_at: string;
}

export default function AIReview() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:3000/ai/suggestions');
      if (res.ok) {
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleApplySuggestion = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await fetch(`http://127.0.0.1:3000/ai/suggestions/${id}/apply`);
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== id));
        alert('Đã áp dụng lịch phát sóng thành công!');
      }
    } catch (error) {
      console.error('Error applying suggestion:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredSuggestions = suggestions.filter(s =>
    s.content_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.suggested_text?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredSuggestions.length / itemsPerPage);
  const paginatedSuggestions = filteredSuggestions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Kiểm duyệt & Trợ lý AI</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Sử dụng trí tuệ nhân tạo để tối ưu hóa nội dung và lịch phát sóng.</p>
        </div>
        <button
          onClick={fetchSuggestions}
          className="btn-secondary"
          style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Làm mới hệ thống</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2.5rem' }}>
        {/* Main Content: AI Suggestions */}
        <section>
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Sparkles size={20} color="#818cf8" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Đề xuất Lịch phát sóng</h3>
              </div>

              <div className="glass-card" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Lọc đề xuất..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.85rem', width: '180px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ minHeight: '450px' }}>
              {loading ? (
                <div style={{ padding: '6rem', textAlign: 'center', color: '#64748b' }}>
                  <RefreshCw size={40} className="animate-spin" style={{ opacity: 0.2, marginBottom: '1.5rem', color: '#6366f1' }} />
                  <p style={{ fontSize: '1.1rem' }}>AI đang rà soát dữ liệu bản tin...</p>
                </div>
              ) : filteredSuggestions.length === 0 ? (
                <div style={{ padding: '6rem', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Check size={40} style={{ color: '#10b981', opacity: 0.5 }} />
                  </div>
                  <h4 style={{ color: '#e2e8f0', margin: '0 0 8px 0' }}>Hoàn tất kiểm duyệt</h4>
                  <p>Hệ thống không phát hiện đề xuất mới nào.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {paginatedSuggestions.map((suggestion) => (
                    <div key={suggestion.id} className="table-row-hover" style={{ padding: '1.8rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                        <Calendar size={28} color="#6366f1" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{suggestion.content_title}</span>
                          <span style={{ fontSize: '0.65rem', color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '2px 10px', borderRadius: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{suggestion.suggestion_type}</span>
                        </div>
                        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6 }}>{suggestion.suggested_text}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '0.75rem', marginTop: '12px' }}>
                          <Clock size={12} />
                          Gợi ý lúc: {formatSafeDateTime(suggestion.created_at)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplySuggestion(suggestion.id)}
                        disabled={processingId === suggestion.id}
                        className="btn-primary"
                        style={{ padding: '10px 24px', borderRadius: '14px', fontSize: '0.9rem', flexShrink: 0 }}
                      >
                        {processingId === suggestion.id ? <RefreshCw size={16} className="animate-spin" /> : <Check size={18} />}
                        Chấp nhận
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pagination UI */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: '1.5rem',
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
        </section>

        {/* Sidebar: AI Stats & Tools */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))', padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.2rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} color="#10b981" />
              </div>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem' }}>OpenClaw Agent</h4>
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1px' }}>ACTIVE</div>
            <p style={{ margin: '12px 0 0 0', color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.5 }}>Trí tuệ nhân tạo đang rà soát và bảo vệ luồng thông tin 24/7.</p>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', margin: '1.5rem 0' }}>
              <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: '10px' }} />
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '2px' }}>Phân tích hiệu năng</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Đề xuất mới</span>
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#818cf8' }}>{suggestions.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Độ nhạy AI</span>
                <span style={{ fontWeight: 800, color: '#f59e0b' }}>HIGH</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Tin cậy</span>
                <span style={{ fontWeight: 800, color: '#10b981' }}>99.2%</span>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(245, 158, 11, 0.02)' }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ color: '#f59e0b', marginTop: '2px' }}><AlertCircle size={22} /></div>
              <div>
                <h5 style={{ margin: '0 0 6px 0', color: '#f59e0b', fontWeight: 700 }}>Lưu ý nghiệp vụ</h5>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                  Mọi đề xuất từ AI cần được cán bộ có thẩm quyền phê duyệt cuối cùng trước khi phát sóng chính thức.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
