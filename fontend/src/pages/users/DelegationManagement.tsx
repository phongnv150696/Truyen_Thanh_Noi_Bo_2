import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Clock, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { API_URL } from '../../config'

interface Delegation {
  id: number;
  delegator_id: number;
  delegatee_id: number;
  delegator_name: string;
  delegatee_name: string;
  role_id: number;
  role_name: string;
  start_time: string;
  end_time: string;
  status: string;
}

export const DelegationManagement: React.FC<{ user: any }> = ({ user }) => {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [delegateeId, setDelegateeId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [durationHours, setDurationHours] = useState('24');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [delRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/rbac/delegations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        axios.get(`${API_URL}/users`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      setDelegations(Array.isArray(delRes.data) ? delRes.data : []);
      
      let parsedUsers = [];
      if (Array.isArray(usersRes.data)) {
        parsedUsers = usersRes.data;
      } else if (usersRes.data && Array.isArray(usersRes.data.data)) {
        parsedUsers = usersRes.data.data;
      } else if (usersRes.data && Array.isArray(usersRes.data.users)) {
        parsedUsers = usersRes.data.users;
      }
      setUsers(parsedUsers);
    } catch (error) {
      console.error("Lỗi lấy dữ liệu ủy quyền", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + parseInt(durationHours) * 60 * 60 * 1000);
      
      await axios.post(`${API_URL}/rbac/delegations`, {
        delegatee_id: parseInt(delegateeId),
        role_id: parseInt(roleId),
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
      alert("Đã ủy quyền thành công!");
    } catch (error: any) {
      alert("Lỗi: " + (error.response?.data?.error || error.message));
    }
  };

  const handleRevoke = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn thu hồi quyền này?")) return;
    try {
      await axios.patch(`${API_URL}/rbac/delegations/${id}/revoke`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchData();
    } catch (error: any) {
      alert("Lỗi thu hồi quyền");
    }
  };

  if (loading) return <div>Đang tải dữ liệu...</div>;

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '2rem' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Shield size={32} className="text-indigo-400" /> Quản lý Ủy quyền
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginTop: '0.4rem' }}>Cấp quyền tạm thời và quản lý ủy nhiệm cán bộ.</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
        <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '12px' }}>
          <AlertTriangle size={20} />
        </div>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc', fontWeight: 700 }}>Lưu ý Vận hành</h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.5 }}>
            Mọi thao tác của người được ủy quyền sẽ được ghi log bằng tên của họ, nhưng kèm theo cờ <strong style={{ color: '#f59e0b' }}>"Ủy nhiệm bởi bạn"</strong>. 
            Hệ thống sẽ tự động thu hồi quyền ngay khi hết thời hạn thiết lập.
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '2.5rem', marginBottom: '2.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '1rem', opacity: 0.05 }}><Shield size={120} /></div>
        
        <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9' }}>Cấp quyền tạm thời</h3>
        
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="premium-form-group" style={{ margin: 0 }}>
              <label className="premium-label">Người được ủy quyền</label>
              <div style={{ position: 'relative' }}>
                <select 
                  required 
                  className="premium-select w-full" 
                  value={delegateeId} 
                  onChange={(e) => setDelegateeId(e.target.value)}
                >
                  <option value="">-- Chọn cán bộ --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id} disabled={u.id === user?.id}>{u.full_name} ({u.username})</option>
                  ))}
                </select>
                <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                  <Plus size={16} />
                </div>
              </div>
            </div>

            <div className="premium-form-group" style={{ margin: 0 }}>
              <label className="premium-label">Thời hạn Ủy quyền</label>
              <div style={{ position: 'relative' }}>
                <select 
                  required 
                  className="premium-select w-full" 
                  value={durationHours} 
                  onChange={(e) => setDurationHours(e.target.value)}
                >
                  <option value="4">4 tiếng (Nửa ca trực)</option>
                  <option value="8">8 tiếng (1 ca trực)</option>
                  <option value="24">24 tiếng (1 ngày)</option>
                  <option value="72">72 tiếng (3 ngày công tác)</option>
                </select>
                <div style={{ position: 'absolute', right: '15px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>
                  <Clock size={16} />
                </div>
              </div>
            </div>
          </div>

          <div className="premium-form-group" style={{ margin: 0 }}>
            <label className="premium-label">Phạm vi Quyền hạn</label>
            <select 
              required 
              className="premium-select w-full" 
              value={roleId} 
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">-- Chọn quyền năng được giao --</option>
              <option value="2">Quyền Tham mưu Chỉ huy (Duyệt lịch, Cấu hình thiết bị)</option>
              <option value="3">Quyền Biên tập Tuyên huấn (Duyệt bài, Kiểm duyệt nội dung)</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="btn-primary btn-glow-indigo" 
            style={{ padding: '16px', borderRadius: '14px', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            <Plus size={20} /> Xác nhận Cấp quyền
          </button>
        </form>
      </div>

      <div className="section-container">
        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '10px' }}>
          Danh sách đang có hiệu lực
          <span style={{ fontSize: '0.8rem', background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8', padding: '4px 12px', borderRadius: '20px' }}>
            {delegations.length} lượt
          </span>
        </h3>

        {delegations.length === 0 ? (
          <div className="glass-card" style={{ padding: '4rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '50%', color: '#475569' }}>
              <Shield size={48} style={{ opacity: 0.2 }} />
            </div>
            <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>Hiện tại chưa có ủy quyền nào đang hoạt động.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
            {delegations.map(del => {
              const isExpired = new Date(del.end_time) < new Date();
              const isRevoked = del.status === 'revoked';
              const isActive = !isExpired && !isRevoked;

              return (
                <div 
                  key={del.id} 
                  className="glass-card" 
                  style={{ 
                    padding: '1.5rem', 
                    opacity: isActive ? 1 : 0.6,
                    border: isActive ? '1px solid rgba(99, 102, 241, 0.2)' : '1px solid rgba(255,255,255,0.05)',
                    background: isActive ? 'rgba(99, 102, 241, 0.03)' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
                    <div>
                      <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#6366f1', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {del.role_name}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                        {del.delegatee_name}
                      </h4>
                    </div>
                    {isActive ? (
                      <span className="ani-pulse" style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
                        ĐANG HIỆU LỰC
                      </span>
                    ) : (
                      <span style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.05)', color: '#64748b', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
                        {isRevoked ? 'ĐÃ THU HỒI' : 'HẾT HẠN'}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9rem', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Shield size={14} style={{ opacity: 0.5 }} />
                      <span>Bởi: <strong style={{ color: '#cbd5e1' }}>{del.delegator_name}</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={14} style={{ opacity: 0.5 }} />
                      <span>Hết hạn: <strong style={{ color: '#cbd5e1' }}>{new Date(del.end_time).toLocaleString('vi-VN')}</strong></span>
                    </div>
                  </div>

                  {isActive && (
                    <button 
                      onClick={() => handleRevoke(del.id)} 
                      className="btn-secondary"
                      style={{ 
                        width: '100%', 
                        marginTop: '1.5rem', 
                        padding: '10px', 
                        fontSize: '0.85rem', 
                        color: '#f87171', 
                        borderColor: 'rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)'
                      }}
                    >
                      <Trash2 size={16} /> Thu hồi quyền ngay
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
