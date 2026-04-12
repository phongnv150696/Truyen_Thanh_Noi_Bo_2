import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Radio, Clock, Trophy, Medal, Award, FileDown, AlertTriangle, RefreshCcw, CheckCircle2 } from 'lucide-react';

import { API_URL } from '../../config'

interface AnalyticsData {
  contentStats: { draft: number; pending_review: number; approved: number };
  deviceStatsByStatus: { name: string; value: number; status: string }[];
  deviceStatsByType: { name: string; value: number; type: string }[];
  broadcastTrends: { date: string; broadcasts: number }[];
  topContents: { name: string; value: number }[];
  durationTrends: { date: string; duration: number }[];
}

interface UnitScore {
  id: number;
  name: string;
  level: number;
  parent_id: number | null;
  content_points: number;
  broadcast_points: number;
  recording_points: number;
  total_score: number;
}



export default function Analytics({ onLogout }: { onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'analysis' | 'logs'>('leaderboard');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [unitScores, setUnitScores] = useState<UnitScore[]>([]);
  const [filterUnitId, setFilterUnitId] = useState<number | null>(null);
  const [parentName, setParentName] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [errorLoading, setErrorLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    channelId: 'all',
    status: 'all'
  });

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`${API_URL}/analytics/history?${query}`, { headers: getHeaders() });
      if (res.status === 401) {
        onLogout?.();
        return;
      }
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchErrorLogs = async () => {
    setErrorLoading(true);
    try {
      const res = await fetch(`${API_URL}/analytics/history?status=failed`, { headers: getHeaders() });
      if (res.ok) {
        setErrorLogs(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch error logs:', err);
    } finally {
      setErrorLoading(false);
    }
  };

  const handleRetry = async (sessionId: number) => {
    if (!confirm('Bạn có chắc chắn muốn phát lại bản tin này ngay lập tức?')) return;
    
    setRetryingId(sessionId);
    try {
      const res = await fetch(`${API_URL}/analytics/retry/${sessionId}`, {
        method: 'POST',
        headers: getHeaders()
      });
      
      const result = await res.json();
      if (res.ok) {
        alert('Đã gửi lệnh phát lại thành công!');
        fetchErrorLogs(); // Refresh list
      } else {
        alert('Lỗi: ' + (result.error || 'Không thể phát lại bản tin'));
      }
    } catch (err) {
      alert('Lỗi kết nối máy chủ');
    } finally {
      setRetryingId(null);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await fetch(`${API_URL}/analytics/channels`, { headers: getHeaders() });
      if (res.ok) {
        setChannels(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch channels:', err);
    }
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [overviewRes, scoresRes] = await Promise.all([
          fetch(`${API_URL}/analytics/overview`, { headers: getHeaders() }),
          fetch(`${API_URL}/analytics/unit-scores`, { headers: getHeaders() })
        ]);

        if (overviewRes.ok) {
          setData(await overviewRes.json());
        }
        
        if (scoresRes.ok) {
          setUnitScores(await scoresRes.json());
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
    fetchChannels();
  }, []);

  useEffect(() => {
    if (activeTab === 'analysis') {
      fetchHistory();
    } else if (activeTab === 'logs') {
      fetchErrorLogs();
    }
  }, [activeTab, filters]);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Activity size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <p>Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  if (!data) return null;

  const formatDuration = (seconds: number | null) => {
    if (seconds === null || seconds === undefined) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>✅ Thành công</span>;
      case 'failed':
        return <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>❌ Lỗi</span>;
      case 'broadcasting':
        return <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }} className="animate-pulse">📻 Đang phát...</span>;
      default:
        return <span style={{ background: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Thống kê tin bài</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Theo dõi hiệu suất và lịch sử hoạt động phát thanh.</p>
        </div>
        
        {/* Tab Navigation */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto', maxWidth: '100%' }}>
          {[
            { id: 'leaderboard', label: 'Thi đua & Tổng quan', icon: <Trophy size={16} /> },
            { id: 'analysis', label: 'Phân tích & Lịch sử', icon: <Activity size={16} /> },
            { id: 'logs', label: 'Nhật ký lỗi', icon: <AlertTriangle size={16} /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: activeTab === tab.id ? '#6366f1' : 'transparent',
                color: activeTab === tab.id ? 'white' : '#94a3b8',
                cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'analysis' && (
        <div className="animate-slide-up">
          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase' }}>Từ ngày</label>
              <input 
                type="date" 
                className="glass-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase' }}>Đến ngày</label>
              <input 
                type="date" 
                className="glass-input" 
                style={{ width: '100%', padding: '10px' }} 
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase' }}>Kênh phát</label>
              <select 
                className="glass-input" 
                style={{ width: '100%', padding: '10px' }}
                value={filters.channelId}
                onChange={(e) => setFilters({ ...filters, channelId: e.target.value })}
              >
                <option value="all">Tất cả kênh</option>
                {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', color: '#64748b', fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.6rem', textTransform: 'uppercase' }}>Trạng thái</label>
              <select 
                className="glass-input" 
                style={{ width: '100%', padding: '10px' }}
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="all">Tất cả</option>
                <option value="completed">Thành công</option>
                <option value="failed">Lỗi phát</option>
                <option value="broadcasting">Đang phát</option>
              </select>
            </div>
            <button 
              onClick={fetchHistory}
              className="btn-primary"
              style={{ padding: '11px 24px', borderRadius: '10px', fontWeight: 700 }}
            >
              Lọc dữ liệu
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* Top 10 Contents Bar Chart - 12 cols now for more space */}
            <div className="glass-card" style={{ gridColumn: 'span 12', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
                <Trophy size={20} color="#f59e0b" /> Top 10 Nội dung phát nhiều nhất (Lượt)
              </h3>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  <BarChart data={data.topContents} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <XAxis type="number" stroke="#64748b" hide />
                    <YAxis dataKey="name" type="category" stroke="#64748b" width={120} tick={{fill: '#94a3b8', fontSize: 11}} />
                    <Tooltip 
                      cursor={{fill: 'rgba(255,255,255,0.02)'}}
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="value" name="Số lần phát" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Duration Chart - 12 cols */}
            <div className="glass-card" style={{ gridColumn: 'span 12', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                  <Clock size={20} color="#10b981" /> Tổng thời lượng phát thanh hàng ngày (Phút)
                </h3>
                <div style={{ padding: '6px 14px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '10px', fontSize: '0.8rem', fontWeight: 700 }}>
                   7 ngày qua
                </div>
              </div>
              
              <div style={{ width: '100%', height: '250px' }}>
                <ResponsiveContainer>
                  <AreaChart data={data.durationTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} />
                    <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} unit="m" />
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#10b981', fontWeight: 700 }}
                    />
                    <Area type="monotone" dataKey="duration" name="Tổng thời lượng" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDuration)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Danh sách phát sóng chi tiết</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                   Kết quả lọc: {history.length} lượt
                </div>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>THỜI GIAN</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>NỘI DUNG / BẢN TIN</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>KÊNH PHÁT</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>THỜI LƯỢNG</th>
                    <th style={{ textAlign: 'center', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                        <Activity size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p style={{ color: '#64748b' }}>Đang truy xuất lịch sử...</p>
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                        Không có dữ liệu phát sóng phù hợp với bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    history.map((row) => (
                      <tr key={row.id} className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '1.2rem 1.5rem' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{new Date(row.start_time).toLocaleTimeString('vi-VN')}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{new Date(row.start_time).toLocaleDateString('vi-VN')}</div>
                        </td>
                        <td style={{ padding: '1.2rem 1.5rem' }}>
                          <div style={{ fontWeight: 700, color: '#6366f1' }}>{row.content_title || 'Phát trực tiếp / Thông báo khẩn'}</div>
                        </td>
                        <td style={{ padding: '1.2rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                            <Radio size={14} /> {row.channel_name}
                          </div>
                        </td>
                        <td style={{ padding: '1.1rem 1.5rem', color: '#94a3b8', fontWeight: 600 }}>
                          {formatDuration(row.duration)}
                        </td>
                        <td style={{ padding: '1.1rem 1.5rem', textAlign: 'center' }}>
                          {getStatusBadge(row.status)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="animate-slide-up">
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.03)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={20} color="#ef4444" /> Nhật ký lỗi phát sóng
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Danh sách các lượt phát thất bại cần kiểm tra và xử lý.</p>
              </div>
              <button 
                onClick={fetchErrorLogs}
                style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Làm mới
              </button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.01)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>THỜI GIAN LỖI</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>NỘI DUNG</th>
                    <th style={{ textAlign: 'left', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>KÊNH BỊ GIÁN ĐOẠN</th>
                    <th style={{ textAlign: 'center', padding: '1rem 1.5rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody>
                  {errorLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>
                        <Activity size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p style={{ color: '#64748b' }}>Đang kiểm tra nhật ký lỗi...</p>
                      </td>
                    </tr>
                  ) : errorLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '4rem', textAlign: 'center' }}>
                        <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '50%', width: 'fit-content', margin: '0 auto 1rem' }}>
                          <CheckCircle2 size={24} />
                        </div>
                        <h3 style={{ margin: 0, color: '#f8fafc' }}>Tuyệt vời!</h3>
                        <p style={{ color: '#64748b', marginTop: '4px' }}>Không phát hiện lỗi phát sóng nào trong thời gian gần đây.</p>
                      </td>
                    </tr>
                  ) : (
                    errorLogs.map((row) => (
                      <tr key={row.id} className="table-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '1.2rem 1.5rem' }}>
                          <div style={{ fontWeight: 600, color: '#f8fafc' }}>{new Date(row.start_time).toLocaleTimeString('vi-VN')}</div>
                          <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>{new Date(row.start_time).toLocaleDateString('vi-VN')}</div>
                        </td>
                        <td style={{ padding: '1.2rem 1.5rem' }}>
                          <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{row.content_title || 'Nội dung không xác định'}</div>
                          <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '2px', fontWeight: 600 }}>Mã lỗi: BROADCAST_FAILED_SESSION_{row.id}</div>
                        </td>
                        <td style={{ padding: '1.2rem 1.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1' }}>
                            <Radio size={14} /> {row.channel_name}
                          </div>
                        </td>
                        <td style={{ padding: '1.2rem 1.5rem', textAlign: 'center' }}>
                          <button 
                            onClick={() => handleRetry(row.id)}
                            disabled={retryingId === row.id}
                            style={{ 
                              display: 'inline-flex', alignItems: 'center', gap: '8px',
                              padding: '8px 16px', background: '#6366f1', color: 'white', 
                              borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer',
                              opacity: retryingId === row.id ? 0.5 : 1,
                              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
                            }}
                          >
                            <RefreshCcw size={14} className={retryingId === row.id ? 'animate-spin' : ''} /> 
                            {retryingId === row.id ? 'Đang gửi...' : 'Phát lại ngay'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.2rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
             <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px' }}>
                <Activity size={20} />
             </div>
             <div>
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#f8fafc' }}>Mẹo vận hành</h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>Nếu bản tin liên tục lỗi sau khi "Phát lại", hãy kiểm tra tình trạng kết nối mạng tại trạm thu phát của Kênh đó.</p>
             </div>
          </div>
        </div>
      )}

      {/* Unit Leaderboard Section */}
      {activeTab === 'leaderboard' && (
        <>
          {/* Summary Overview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(99, 102, 241, 0.1)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), transparent)' }}>
               <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>TỔNG LƯỢT PHÁT</p>
               <h3 style={{ margin: '10px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{data.broadcastTrends.reduce((a, b) => a + b.broadcasts, 0)}</h3>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(16, 185, 129, 0.1)', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent)' }}>
               <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>TỶ LỆ THÀNH CÔNG</p>
               <h3 style={{ margin: '10px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>98.2%</h3>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.1)', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05), transparent)' }}>
               <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>TRUNG BÌNH/NGÀY</p>
               <h3 style={{ margin: '10px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#f59e0b' }}>
                 {(data.broadcastTrends.reduce((a, b) => a + b.broadcasts, 0) / (data.broadcastTrends.length || 1)).toFixed(1)}
               </h3>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(59, 130, 246, 0.1)', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), transparent)' }}>
               <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, letterSpacing: '0.5px' }}>BẢN TIN ĐÃ DUYỆT</p>
               <h3 style={{ margin: '10px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>{data.contentStats.approved || 0}</h3>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
                  <Trophy size={20} color="#f59e0b" /> Bảng xếp hạng Thi đua Đơn vị
                  {filterUnitId && <span style={{ fontSize: '0.9rem', color: '#6366f1' }}> » {parentName}</span>}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                {filterUnitId && (
                  <button 
                    onClick={() => { setFilterUnitId(null); setParentName(null); }}
                    style={{ padding: '6px 14px', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    ← Quay lại
                  </button>
                )}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} /> Nội dung</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Phát sóng</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Ghi âm</span>
                </div>
                
                <button 
                  onClick={() => window.open(`${API_URL}/analytics/export`, '_blank')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 16px', borderRadius: '8px', 
                    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(79, 70, 229, 0.2))', border: '1px solid rgba(99, 102, 241, 0.3)',
                    color: '#818cf8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.1)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
                >
                  <FileDown size={16} /> Xuất Báo cáo (Excel)
                </button>
              </div>
            </div>

            {/* Top 3 Podium - Only show on top level */}
            {!filterUnitId && unitScores.length >= 3 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '2rem', marginTop: '2rem', marginBottom: '3rem', height: '250px' }}>
                {/* Rank 2 */}
                <div className="hover-scale" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-40px', background: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', padding: '8px', borderRadius: '50%', border: '2px solid rgba(148, 163, 184, 0.3)' }}><Medal size={24} /></div>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{unitScores[1].name}</div>
                    <div style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 700, marginTop: '4px' }}>{unitScores[1].total_score.toLocaleString()} đ</div>
                  </div>
                  <div style={{ width: '100%', height: '120px', background: 'linear-gradient(to top, rgba(148, 163, 184, 0.2), rgba(148, 163, 184, 0.05))', borderRadius: '12px 12px 0 0', border: '1px solid rgba(148, 163, 184, 0.2)', borderBottom: 'none', display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: 'rgba(148, 163, 184, 0.5)' }}>2</span>
                  </div>
                </div>
                
                {/* Rank 1 */}
                <div className="hover-scale" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '160px', position: 'relative', zIndex: 10 }}>
                  <div className="ani-bounce" style={{ position: 'absolute', top: '-50px', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))', color: '#f59e0b', padding: '12px', borderRadius: '50%', border: '2px solid rgba(245, 158, 11, 0.5)', boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)' }}><Trophy size={32} /></div>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 900, color: '#fbbf24', fontSize: '1.2rem', textShadow: '0 2px 10px rgba(245, 158, 11, 0.5)' }}>{unitScores[0].name}</div>
                    <div style={{ color: '#fcd34d', fontSize: '1.1rem', fontWeight: 800, marginTop: '4px' }}>{unitScores[0].total_score.toLocaleString()} đ</div>
                  </div>
                  <div style={{ width: '100%', height: '160px', background: 'linear-gradient(to top, rgba(245, 158, 11, 0.3), rgba(245, 158, 11, 0.1))', borderRadius: '12px 12px 0 0', border: '1px solid rgba(245, 158, 11, 0.4)', borderBottom: 'none', display: 'flex', justifyContent: 'center', paddingTop: '20px', boxShadow: '0 -10px 30px rgba(245, 158, 11, 0.15)' }}>
                    <span style={{ fontSize: '3rem', fontWeight: 900, color: 'rgba(245, 158, 11, 0.6)' }}>1</span>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="hover-scale" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '140px', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '-40px', background: 'rgba(180, 83, 9, 0.15)', color: '#b45309', padding: '8px', borderRadius: '50%', border: '2px solid rgba(180, 83, 9, 0.3)' }}><Award size={24} /></div>
                  <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 800, color: '#f1f5f9', fontSize: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>{unitScores[2].name}</div>
                    <div style={{ color: '#d97706', fontSize: '0.9rem', fontWeight: 700, marginTop: '4px' }}>{unitScores[2].total_score.toLocaleString()} đ</div>
                  </div>
                  <div style={{ width: '100%', height: '100px', background: 'linear-gradient(to top, rgba(180, 83, 9, 0.2), rgba(180, 83, 9, 0.05))', borderRadius: '12px 12px 0 0', border: '1px solid rgba(180, 83, 9, 0.2)', borderBottom: 'none', display: 'flex', justifyContent: 'center', paddingTop: '20px' }}>
                    <span style={{ fontSize: '2rem', fontWeight: 900, color: 'rgba(180, 83, 9, 0.5)' }}>3</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ overflowX: 'auto', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, width: '80px' }}>HẠNG</th>
                    <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>ĐƠN VỊ / PHÂN CẤP</th>
                    <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>CƠ CẤU ĐIỂM (KPI)</th>
                    <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, width: '140px' }}>TỔNG ĐIỂM</th>
                  </tr>
                </thead>
                <tbody>
                  {unitScores.filter(u => filterUnitId ? u.parent_id === filterUnitId : u.level <= 2).length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Chưa có dữ liệu chấm điểm.</td></tr>
                  ) : (
                    unitScores
                      .filter(u => filterUnitId ? u.parent_id === filterUnitId : u.level <= 2)
                      .map((unit, index) => {
                        const isBattalion = unit.level === 2;
                        return (
                          <tr key={unit.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s', cursor: (isBattalion && !filterUnitId) ? 'pointer' : 'default' }}
                              onClick={() => { if(isBattalion && !filterUnitId) { setFilterUnitId(unit.id); setParentName(unit.name); } }}>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <div style={{ 
                                width: '32px', height: '32px', borderRadius: '8px', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: (!filterUnitId && index === 0) ? 'rgba(245, 158, 11, 0.15)' : (!filterUnitId && index === 1) ? 'rgba(148, 163, 184, 0.15)' : (!filterUnitId && index === 2) ? 'rgba(180, 83, 9, 0.15)' : 'rgba(255,255,255,0.03)',
                                color: (!filterUnitId && index === 0) ? '#f59e0b' : (!filterUnitId && index === 1) ? '#94a3b8' : (!filterUnitId && index === 2) ? '#b45309' : '#475569',
                                fontWeight: 800
                              }}>
                                {(!filterUnitId && index === 0) ? <Trophy size={16} /> : (!filterUnitId && index === 1) ? <Medal size={16} /> : (!filterUnitId && index === 2) ? <Award size={16} /> : index + 1}
                              </div>
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ fontWeight: 700, color: (isBattalion && !filterUnitId) ? '#6366f1' : '#f8fafc', fontSize: '1.1rem' }}>{unit.name}</div>
                                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: unit.level === 1 ? '#ef4444' : unit.level === 2 ? '#6366f1' : '#10b981', color: 'white', fontWeight: 800 }}>
                                  {unit.level === 1 ? 'BỘ CHỈ HUY' : unit.level === 2 ? 'TIỂU ĐOÀN' : 'ĐẠI ĐỘI'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                {isBattalion && !filterUnitId ? 'Nhấn để xem chi tiết các Đại đội trực thuộc' : `Mã đơn vị: #${unit.id}`}
                              </div>
                            </td>
                            <td style={{ padding: '1.2rem 1rem' }}>
                              <div style={{ width: '100%', maxWidth: '300px' }}>
                                <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', marginBottom: '8px' }}>
                                  <div title="Nội dung" style={{ width: `${(unit.content_points / (unit.total_score || 1)) * 100}%`, background: '#6366f1' }} />
                                  <div title="Phát sóng" style={{ width: `${(unit.broadcast_points / (unit.total_score || 1)) * 100}%`, background: '#10b981' }} />
                                  <div title="Ghi âm" style={{ width: `${(unit.recording_points / (unit.total_score || 1)) * 100}%`, background: '#f59e0b' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#64748b' }}>
                                   <span style={{ color: '#818cf8', fontWeight: 600 }}>{unit.content_points} đ</span>
                                   <span style={{ color: '#34d399', fontWeight: 600 }}>{unit.broadcast_points} đ</span>
                                   <span style={{ color: '#fbbf24', fontWeight: 600 }}>{unit.recording_points} đ</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                              <span style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 800, 
                                color: (!filterUnitId && index === 0) ? '#f59e0b' : '#f8fafc',
                                textShadow: (!filterUnitId && index === 0) ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none'
                              }}>
                                {unit.total_score.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>đ</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
