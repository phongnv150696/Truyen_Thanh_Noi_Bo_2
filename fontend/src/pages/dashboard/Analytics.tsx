import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, Radio, Cpu, FileText, CheckCircle2, Clock, Trophy, Medal, Award, FileDown } from 'lucide-react';

const API_URL = 'http://127.0.0.1:3000';

interface AnalyticsData {
  contentStats: { draft: number; pending_review: number; published: number };
  deviceStatsByStatus: { name: string; value: number; status: string }[];
  deviceStatsByType: { name: string; value: number; type: string }[];
  broadcastTrends: { date: string; broadcasts: number }[];
}

interface UnitScore {
  id: number;
  name: string;
  content_points: number;
  broadcast_points: number;
  recording_points: number;
  total_score: number;
}

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [unitScores, setUnitScores] = useState<UnitScore[]>([]);
  const [loading, setLoading] = useState(true);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [overviewRes, scoresRes] = await Promise.all([
          fetch(`${API_URL}/analytics/overview`, { headers: getHeaders() }),
          fetch(`${API_URL}/analytics/unit-scores`, { headers: getHeaders() })
        ]);

        if (overviewRes.ok) {
          const overviewJson = await overviewRes.json();
          setData(overviewJson);
        }
        
        if (scoresRes.ok) {
          const scoresJson = await scoresRes.json();
          setUnitScores(scoresJson);
        }
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
        <Activity size={32} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
        <p>Đang tải dữ liệu thống kê...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Biểu đồ Thống kê</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Phân tích hiệu suất hệ thống và tần suất phát thanh.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Trend Chart - 8 cols */}
        <div className="glass-card" style={{ gridColumn: 'span 8', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
            <Activity size={20} color="#6366f1" /> Tần suất phát sóng (7 ngày qua)
          </h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={data.broadcastTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBroadcasts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis stroke="#64748b" tick={{fill: '#94a3b8', fontSize: 12}} />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#6366f1', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="broadcasts" name="Lượt phát" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorBroadcasts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Status Pie Chart - 4 cols */}
        <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
            <Radio size={20} color="#10b981" /> Trạng thái thiết bị
          </h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.deviceStatsByStatus && data.deviceStatsByStatus.length > 0 ? data.deviceStatsByStatus : [{name: 'Không có dữ liệu', value: 1, status: 'none'}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={false}
                >
                  {(data.deviceStatsByStatus && data.deviceStatsByStatus.length > 0 ? data.deviceStatsByStatus : [{name: 'Không có dữ liệu', value: 1, status: 'none'}]).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={data.deviceStatsByStatus && data.deviceStatsByStatus.length > 0 ? COLORS[index % COLORS.length] : '#334155'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#f8fafc' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1.5rem' }}>
        {/* Device Type Pie Chart - 4 cols */}
        <div className="glass-card" style={{ gridColumn: 'span 4', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
            <Cpu size={20} color="#6366f1" /> Phân bổ thiết bị
          </h3>
          <div style={{ width: '100%', height: '250px' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.deviceStatsByType && data.deviceStatsByType.length > 0 ? data.deviceStatsByType : [{name: 'Không có dữ liệu', value: 1, type: 'none'}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={false}
                >
                  {(data.deviceStatsByType && data.deviceStatsByType.length > 0 ? data.deviceStatsByType : [{name: 'Không có dữ liệu', value: 1, type: 'none'}]).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={data.deviceStatsByType && data.deviceStatsByType.length > 0 ? ['#6366f1', '#ec4899'][index % 2] : '#334155'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Content Stats - 8 cols */}
        <div className="glass-card" style={{ gridColumn: 'span 8', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 1.5rem 0', fontSize: '1.2rem', color: '#f8fafc' }}>
            <FileText size={20} color="#ec4899" /> Tổng quan nội dung Bản tin
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', flex: 1 }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Đã xuất bản</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{data.contentStats.published}</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Clock size={24} color="#f59e0b" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Chờ phê duyệt</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{data.contentStats.pending_review}</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <FileText size={24} color="#94a3b8" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Bản nháp</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{data.contentStats.draft}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Leaderboard Section */}
      <div className="glass-card" style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>
            <Trophy size={20} color="#f59e0b" /> Bảng xếp hạng Thi đua Đơn vị
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} /> Nội dung</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} /> Phát sóng</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} /> Ghi âm</span>
            </div>
            
            <button 
              onClick={() => window.open(`${API_URL}/analytics/export`, '_blank')}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', borderRadius: '8px', 
                background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)',
                color: '#818cf8', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
            >
              <FileDown size={16} /> Xuất Báo cáo (Excel)
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, width: '80px' }}>HẠNG</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>ĐƠN VỊ</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>CƠ CẤU ĐIỂM (KPI)</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, width: '120px' }}>TỔNG ĐIỂM</th>
              </tr>
            </thead>
            <tbody>
              {unitScores.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>Chưa có dữ liệu chấm điểm.</td></tr>
              ) : (
                unitScores.map((unit, index) => {
                  
                  return (
                    <tr key={unit.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <div style={{ 
                          width: '32px', height: '32px', borderRadius: '8px', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: index === 0 ? 'rgba(245, 158, 11, 0.15)' : index === 1 ? 'rgba(148, 163, 184, 0.15)' : index === 2 ? 'rgba(180, 83, 9, 0.15)' : 'rgba(255,255,255,0.03)',
                          color: index === 0 ? '#f59e0b' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569',
                          fontWeight: 800
                        }}>
                          {index === 0 ? <Trophy size={16} /> : index === 1 ? <Medal size={16} /> : index === 2 ? <Award size={16} /> : index + 1}
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{unit.name}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>Mã đơn vị: #{unit.id}</div>
                      </td>
                      <td style={{ padding: '1.2rem 1rem' }}>
                        <div style={{ width: '100%', maxWidth: '300px' }}>
                          <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', marginBottom: '6px' }}>
                            <div title="Nội dung" style={{ width: `${(unit.content_points / (unit.total_score || 1)) * 100}%`, background: '#6366f1' }} />
                            <div title="Phát sóng" style={{ width: `${(unit.broadcast_points / (unit.total_score || 1)) * 100}%`, background: '#10b981' }} />
                            <div title="Ghi âm" style={{ width: `${(unit.recording_points / (unit.total_score || 1)) * 100}%`, background: '#f59e0b' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', fontSize: '0.7rem', color: '#64748b' }}>
                             <span style={{ color: '#818cf8', fontWeight: 600 }}>{unit.content_points}</span>
                             <span style={{ color: '#34d399', fontWeight: 600 }}>{unit.broadcast_points}</span>
                             <span style={{ color: '#fbbf24', fontWeight: 600 }}>{unit.recording_points}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1.2rem 1rem', textAlign: 'right' }}>
                        <span style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 800, 
                          color: index === 0 ? '#f59e0b' : '#f8fafc',
                          textShadow: index === 0 ? '0 0 15px rgba(245, 158, 11, 0.3)' : 'none'
                        }}>
                          {unit.total_score.toLocaleString()}
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
    </div>
  );
}
