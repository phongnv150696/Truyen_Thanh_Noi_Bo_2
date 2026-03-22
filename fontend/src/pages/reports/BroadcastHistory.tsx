import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar as CalendarIcon, 
  Radio, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LayoutGrid,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Activity
} from 'lucide-react';

const BroadcastHistory = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    channelId: 'all',
    unitId: 'all',
    status: 'all'
  });
  const [channels, setChannels] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
    fetchHistory();
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('openclaw_token');
    return { 'Authorization': `Bearer ${token}` };
  };

  const fetchMetadata = async () => {
    try {
      const [chRes, uRes] = await Promise.all([
        fetch(`http://${window.location.hostname}:3000/channels`, { headers: getHeaders() }),
        fetch(`http://${window.location.hostname}:3000/units`, { headers: getHeaders() })
      ]);
      const chData = await chRes.json();
      const uData = await uRes.json();
      setChannels(Array.isArray(chData) ? chData : []);
      setUnits(Array.isArray(uData) ? uData : []);
    } catch (err) {
      console.error('Failed to fetch metadata', err);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`http://${window.location.hostname}:3000/reports/history?${queryParams}`, {
        headers: getHeaders()
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`http://${window.location.hostname}:3000/reports/export?${queryParams}`, {
        headers: getHeaders()
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_cao_phat_thanh_${new Date().getTime()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Không thể xuất file Excel. Vui lòng thử lại.');
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> THÀNH CÔNG
          </div>
        );
      case 'failed':
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
            <XCircle size={14} /> LỖI PHÁT
          </div>
        );
      default:
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600 }}>
            <Activity size={14} className="animate-pulse" /> ĐANG PHÁT
          </div>
        );
    }
  };

  return (
    <div className="animate-fade-in" style={{ color: '#f8fafc' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Lịch sử & Báo cáo</h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.5rem' }}>Theo dõi hành trình phát thanh chi tiết của từng thiết bị.</p>
        </div>
        <button 
          onClick={handleExport}
          className="btn-primary" 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.2)' }}
        >
          <Download size={18} /> XUẤT EXCEL THÁNG
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '20px', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Khoảng thời gian</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input 
              type="date" 
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '0.9rem' }}
            />
            <span style={{ color: '#475569' }}>-</span>
            <input 
              type="date" 
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Kênh</label>
          <select 
            value={filters.channelId}
            onChange={(e) => setFilters({...filters, channelId: e.target.value})}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', outline: 'none' }}
          >
            <option value="all">Tất cả kênh</option>
            {channels.map(c => <option key={c.id} value={c.id} style={{ color: 'black' }}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Đơn vị</label>
          <select 
            value={filters.unitId}
            onChange={(e) => setFilters({...filters, unitId: e.target.value})}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', outline: 'none' }}
          >
            <option value="all">Tất cả đơn vị</option>
            {units.map(u => <option key={u.id} value={u.id} style={{ color: 'black' }}>{u.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, marginBottom: '8px', display: 'block', textTransform: 'uppercase' }}>Trạng thái</label>
          <select 
            value={filters.status}
            onChange={(e) => setFilters({...filters, status: e.target.value})}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 12px', color: 'white', outline: 'none' }}
          >
            <option value="all">Tất cả</option>
            <option value="success">Thành công</option>
            <option value="failed">Lỗi phát</option>
            <option value="playing">Đang phát</option>
          </select>
        </div>

        <button 
          onClick={fetchHistory}
          style={{ marginTop: 'auto', padding: '10px 20px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#818cf8', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> LỌC DỮ LIỆU
        </button>
      </div>

      {/* History Table */}
      <div className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>THỜI GIAN</th>
              <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>THIẾT BỊ / ĐƠN VỊ</th>
              <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>NỘI DUNG / KÊNH</th>
              <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}>TRẠNG THÁI</th>
              <th style={{ padding: '1.2rem 1.5rem', fontSize: '0.75rem', color: '#64748b', fontWeight: 800 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center' }}>
                  <div className="animate-spin" style={{ display: 'inline-block' }}><RefreshCw size={32} color="#6366f1" /></div>
                  <p style={{ marginTop: '1rem', color: '#94a3b8' }}>Đang tải lịch sử dữ liệu...</p>
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                  <CalendarIcon size={48} style={{ opacity: 0.1, marginBottom: '1rem' }} />
                  <p>Không tìm thấy bản ghi nào khớp với bộ lọc.</p>
                </td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}>
                  <td style={{ padding: '1.2rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{new Date(item.start_time).toLocaleTimeString('vi-VN')}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{new Date(item.start_time).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f1f5f9' }}>{item.device_name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                       {item.unit_name} • {item.ip_address}
                    </div>
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Radio size={14} /> {item.content_title || 'Phát trực tiếp'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{item.channel_name}</div>
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem' }}>
                    {getStatusBadge(item.status)}
                    {item.error_message && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: '4px', maxWidth: '200px' }}>{item.error_message}</div>}
                  </td>
                  <td style={{ padding: '1.2rem 1.5rem', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}><MoreVertical size={18} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        <div style={{ padding: '1rem 1.5rem', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Hiển thị {history.length} bản ghi gần nhất</span>
          <div style={{ display: 'flex', gap: '8px' }}>
             {/* Simple Pagination Mockup */}
             <button disabled style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#475569', border: 'none' }}>1</button>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .table-row-hover:hover {
          background: rgba(255,255,255,0.02);
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          cursor: pointer;
        }
      `}} />
    </div>
  );
};

export default BroadcastHistory;
