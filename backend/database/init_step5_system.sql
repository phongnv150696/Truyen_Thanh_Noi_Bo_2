-- STEP 5: HỆ THỐNG & KIỂM TOÁN (SYSTEM & AUDIT) --

-- 1. Bảng Thông báo (Notifications)
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, success, error
    is_read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255), -- Link dẫn đến nội dung liên quan nếu có
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Cấu hình hệ thống (System Config)
-- Chỉ Admin có quyền ghi
CREATE TABLE system_config (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL, -- vd: smtp_host, tts_engine_default
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chèn một số cấu hình mặc định (Mẫu)
INSERT INTO system_config (key, value, description) VALUES
('site_name', 'Hệ thống Truyền thanh Nội bộ OpenClaw', 'Tên hiển thị của trang web'),
('default_language', 'vi-VN', 'Ngôn ngữ mặc định của hệ thống'),
('maintenance_mode', 'false', 'Chế độ bảo trì hệ thống');

-- 3. Bảng Giới hạn tốc độ API (API Rate Limits)
CREATE TABLE api_rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(100) NOT NULL, -- IP hoặc User ID
    endpoint VARCHAR(255),
    hits INTEGER DEFAULT 1,
    reset_at TIMESTAMP,
    UNIQUE(identifier, endpoint)
);

-- 4. Bảng Chỉ số Sức khỏe (Health Metrics)
-- Lưu thông tin uptime, CPU, RAM của các dịch vụ
CREATE TABLE health_metrics (
    id SERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL, -- vd: auth-service, storage-service
    status VARCHAR(50) NOT NULL, -- healthy, degraded, down
    cpu_usage DECIMAL(5, 2),
    memory_usage BIGINT, -- bytes
    uptime_seconds BIGINT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Hoàn tất: Cập nhật nhật ký khởi tạo
INSERT INTO audit_logs (action, target_table, details) 
VALUES ('INITIAL_SCHEMA_SETUP', 'all', '{"status": "completed", "steps": 5}');
