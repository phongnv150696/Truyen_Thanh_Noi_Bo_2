import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X, HelpCircle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface ConfirmOptions {
  message: string;
  title?: string;
  resolve: (value: boolean) => void;
}

interface NotificationContextType {
  showNotification: (type: NotificationType, message: string) => void;
  confirm: (message: string, title?: string) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmOptions | null>(null);

  const showNotification = useCallback((type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const confirm = useCallback((message: string, title?: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmRequest({ message, title, resolve });
    });
  }, []);

  const handleConfirm = (value: boolean) => {
    if (confirmRequest) {
      confirmRequest.resolve(value);
      setConfirmRequest(null);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification, confirm }}>
      {children}
      
      {/* Notifications Toast */}
      <div className="notification-container">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-toast ${n.type} ani-slide-in-right`}>
            <div className="notification-icon">
              {n.type === 'success' && <CheckCircle2 size={20} />}
              {n.type === 'error' && <AlertCircle size={20} />}
              {n.type === 'info' && <Info size={20} />}
              {n.type === 'warning' && <AlertCircle size={20} />}
            </div>
            <div className="notification-message">{n.message}</div>
            <button className="notification-close" onClick={() => removeNotification(n.id)}>
              <X size={16} />
            </button>
            <div className="notification-progress-container">
               <div className="notification-progress" />
            </div>
          </div>
        ))}
      </div>

      {/* Global Confirmation Modal */}
      {confirmRequest && (
        <div className="confirm-overlay" onClick={() => handleConfirm(false)}>
          <div className="confirm-modal ani-scale-in" onClick={e => e.stopPropagation()}>
            <div className="confirm-header">
              <div className="confirm-icon-blob">
                <HelpCircle size={28} color="#818cf8" />
              </div>
              <h3>{confirmRequest.title || 'Xác nhận hành động'}</h3>
            </div>
            <div className="confirm-body">
              {confirmRequest.message}
            </div>
            <div className="confirm-footer">
              <button 
                className="btn-secondary" 
                onClick={() => handleConfirm(false)}
                style={{ flex: 1 }}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn-primary" 
                onClick={() => handleConfirm(true)}
                style={{ flex: 1.5, background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};
