import { useState, useEffect } from 'react';
import { 
  Settings, 
  Activity, 
  Shield, 
  Save, 
  RefreshCw, 
  CheckCircle2, 
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string;
  description: string;
}

interface HealthMetric {
  id: number;
  service_name: string;
  status: 'healthy' | 'degraded' | 'down';
  cpu_usage: string;
  memory_usage: string;
  uptime_seconds: string;
  recorded_at: string;
}

export default function SystemSettings({ onLogout }: { onLogout?: () => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'health' | 'security'>('general');
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token')
    return {
      'Authorization': token ? `Bearer ${token}` : ''
    }
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/settings`, { headers: getHeaders() });
      if (res.status === 401) {
        onLogout?.();
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setConfigs(Array.isArray(data.config) ? data.config : []);
      setHealthMetrics(Array.isArray(data.health) ? data.health : []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setConfigs([]);
      setHealthMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const formatSafeTime = (dateStr: string | undefined) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('vi-VN');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Don't scroll to top here as it's a subtab
  };

  const handleUpdateConfig = async (key: string, value: string) => {
    setSaving(key);
    try {
      const res = await fetch(`http://${window.location.hostname}:3000/settings/${key}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          ...getHeaders()
        },
        body: JSON.stringify({ value })
      });
      if (res.ok) {
        setConfigs(prev => prev.map(c => c.key === key ? { ...c, value } : c));
      }
    } catch (error) {
      console.error('Error updating config:', error);
    } finally {
      setSaving(null);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#10b981';
      case 'degraded': return '#f59e0b';
      case 'down': return '#ef4444';
      default: return '#64748b';
    }
  };

  const formatBytes = (bytes: string) => {
    const b = parseInt(bytes);
    if (isNaN(b) || b === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0 }}>Cấu hình hệ thống</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Quản lý tham số vận hành, bảo mật và giám sát sức khỏe hạ tầng.</p>
      </div>

      <div style={{ 
        display: 'flex', gap: '12px', marginBottom: '2rem', padding: '6px',
        background: 'rgba(255,255,255,0.02)', borderRadius: '16px', width: 'fit-content', border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <button onClick={() => setActiveSubTab('general')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeSubTab === 'general' ? 'rgba(99, 102, 241, 0.1)' : 'transparent', color: activeSubTab === 'general' ? '#818cf8' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
          <Settings size={18} /><span>Cấu hình chung</span>
        </button>
        <button onClick={() => setActiveSubTab('health')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeSubTab === 'health' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: activeSubTab === 'health' ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
          <Activity size={18} /><span>Sức khỏe hệ thống</span>
        </button>
        <button onClick={() => setActiveSubTab('security')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeSubTab === 'security' ? 'rgba(244, 63, 94, 0.1)' : 'transparent', color: activeSubTab === 'security' ? '#fb7185' : '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
          <Shield size={18} /><span>Bảo mật & Hiệu năng</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '8rem 0', textAlign: 'center', color: '#64748b' }}>
          <RefreshCw size={40} className="animate-spin" style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
          <p style={{ fontSize: '1.1rem' }}>Đang tải dữ liệu cấu hình...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {activeSubTab === 'general' && (
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
              {configs.filter(c => !c.key.includes('limit') && !c.key.includes('log')).map(config => (
                <div key={config.key} className="glass-card" style={{ padding: '1.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={20} color="#6366f1" /></div>
                      <div>
                        <h4 style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.75rem', color: '#6366f1', letterSpacing: '1px' }}>{config.key}</h4>
                        <p style={{ margin: '2px 0 0 0', color: '#94a3b8', fontSize: '0.9rem' }}>{config.description}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input type="text" className="glass-card" value={config.value} onChange={(e) => setConfigs(prev => prev.map(c => c.key === config.key ? { ...c, value: e.target.value } : c))} style={{ flex: 1, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', color: 'white' }} />
                    <button onClick={() => handleUpdateConfig(config.key, config.value)} disabled={saving === config.key} style={{ padding: '0 20px', borderRadius: '10px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {saving === config.key ? <RefreshCw size={16} className="animate-spin" /> : <Save size={18} />} Lưu
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {activeSubTab === 'health' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {Array.from(new Set(healthMetrics.map(h => h.service_name))).map(name => {
                  const latest = healthMetrics.find(h => h.service_name === name);
                  return (
                    <div key={name} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${getHealthColor(latest?.status || '')}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem' }}><span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{name}</span><CheckCircle2 size={16} color={getHealthColor(latest?.status || '')} /></div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800 }}>{latest?.cpu_usage}% CPU</div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>{formatBytes(latest?.memory_usage || '0')} Memory</p>
                    </div>
                  );
                })}
              </div>
              <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Chi tiết dịch vụ</h3>
                  <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1' }}><RefreshCw size={14} /> Làm mới</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', fontSize: '0.75rem', color: '#475569', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '1rem 1.5rem' }}>SERVICE</th><th style={{ padding: '1rem' }}>STATUS</th><th style={{ padding: '1rem' }}>CPU</th><th style={{ padding: '1rem' }}>RAM</th><th style={{ padding: '1rem' }}>UPTIME</th><th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>RECORDED AT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthMetrics.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(metric => (
                        <tr key={metric.id} className="table-row-hover" style={{ fontSize: '0.9rem', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '1.2rem 1.5rem', fontWeight: 600 }}>{metric.service_name}</td>
                          <td style={{ padding: '1.2rem 1rem' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '10px', background: `${getHealthColor(metric.status)}15`, color: getHealthColor(metric.status), fontSize: '0.75rem', fontWeight: 700 }}>{metric.status.toUpperCase()}</span></td>
                          <td style={{ padding: '1.2rem 1rem' }}>{metric.cpu_usage}%</td>
                          <td style={{ padding: '1.2rem 1rem' }}>{formatBytes(metric.memory_usage)}</td>
                          <td style={{ padding: '1.2rem 1rem' }}>{Math.floor(parseInt(metric.uptime_seconds) / 86400)}h {(parseInt(metric.uptime_seconds) % 86400 / 3600).toFixed(0)}m</td>
                          <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right', color: '#64748b' }}>{formatSafeTime(metric.recorded_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination UI */}
                {Math.ceil(healthMetrics.length / itemsPerPage) > 1 && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '1.5rem',
                    gap: '12px',
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: currentPage === 1 ? '#475569' : '#cbd5e1',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {Array.from({ length: Math.ceil(healthMetrics.length / itemsPerPage) }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: currentPage === page ? '#10b981' : 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      disabled={currentPage === Math.ceil(healthMetrics.length / itemsPerPage)}
                      onClick={() => handlePageChange(currentPage + 1)}
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        color: currentPage === Math.ceil(healthMetrics.length / itemsPerPage) ? '#475569' : '#cbd5e1',
                        cursor: currentPage === Math.ceil(healthMetrics.length / itemsPerPage) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSubTab === 'security' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '12px' }}><Lock size={24} color="#f43f5e" /></div>
                  <div><h3>API Rate Limiting</h3><p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>Giới hạn số lượng yêu cầu mỗi phút từ một địa chỉ IP.</p></div>
                </div>
                {configs.filter(c => c.key === 'api_rate_limit').map(config => (
                  <div key={config.key} style={{ display: 'flex', gap: '12px' }}>
                    <input type="number" className="glass-card" value={config.value} onChange={(e) => setConfigs(prev => prev.map(c => c.key === config.key ? { ...c, value: e.target.value } : c))} style={{ flex: 1, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', color: 'white' }} />
                    <button onClick={() => handleUpdateConfig(config.key, config.value)} style={{ padding: '0 20px', borderRadius: '10px', background: '#f43f5e', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Cập nhật</button>
                  </div>
                ))}
              </div>
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '1.5rem' }}>
                  <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px' }}><RefreshCw size={24} color="#f59e0b" /></div>
                  <div><h3>Auto-Archive</h3><p style={{ margin: '4px 0 0 0', color: '#94a3b8' }}>Tự động lưu trữ lịch sử phát sau 30 ngày.</p></div>
                </div>
                {configs.filter(c => c.key === 'broadcast_auto_archive').map(config => (
                   <div key={config.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tính năng: {config.value === 'true' ? 'Bật' : 'Tắt'}</span>
                      <button onClick={() => handleUpdateConfig(config.key, config.value === 'true' ? 'false' : 'true')} style={{ padding: '10px 24px', borderRadius: '10px', background: config.value === 'true' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)', color: config.value === 'true' ? '#10b981' : '#94a3b8', border: 'none', fontWeight: 700, cursor: 'pointer' }}>{config.value === 'true' ? 'DỪNG' : 'KÍCH HOẠT'}</button>
                   </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
