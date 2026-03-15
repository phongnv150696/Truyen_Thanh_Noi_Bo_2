-- STEP 1: TÀI KHOẢN & ĐƠN VỊ (ACCOUNTS & UNITS) --

-- 1. Bảng Đơn vị Quân đội (Units)
CREATE TABLE units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Tên đơn vị (ví dụ: Trung đoàn 1, Đại đội 2)
    parent_id INTEGER REFERENCES units(id),
    level INTEGER NOT NULL, -- 1: Trung đoàn, 2: Tiểu đoàn, 3: Đại đội...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Vai trò & Quyền hạn (Roles & Permissions)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- admin, commander, editor, broadcaster, listener
    description TEXT
);

-- Dữ liệu mẫu cho Vai trò
INSERT INTO roles (name, description) VALUES
('admin', 'Toàn quyền hệ thống, quản lý cấu hình và phân quyền'),
('commander', 'Chỉ huy: Quyền rộng trên nghiệp vụ, không có quyền cấu hình hệ thống'),
('editor', 'Biên tập viên: Quản lý nội dung mình tạo ra'),
('broadcaster', 'Phát thanh viên: Thao tác Media/Ghi âm'),
('listener', 'Người nghe: Đọc kênh và xem điểm thi đua');

-- 3. Bảng Người dùng (Users)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    rank VARCHAR(50), -- Cấp bậc
    email VARCHAR(255),
    role_id INTEGER REFERENCES roles(id),
    unit_id INTEGER REFERENCES units(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Đăng ký Tài khoản (User Registrations)
CREATE TABLE user_registrations (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    full_name VARCHAR(255),
    rank VARCHAR(50),
    email VARCHAR(255),
    unit_id INTEGER REFERENCES units(id),
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Phiên đăng nhập (Sessions / Refresh Tokens)
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Đặt lại Mật khẩu (Password Resets)
CREATE TABLE password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng Nhật ký Hệ thống (Audit Logs)
-- Ràng buộc: Chỉ INSERT, không UPDATE/DELETE được áp dụng ở tầng ứng dụng hoặc Trigger
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(255) NOT NULL,
    target_table VARCHAR(100),
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger đơn giản để ngăn xóa/sửa audit_logs (demo logic bảo mật)
CREATE OR REPLACE FUNCTION protect_audit_logs()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_audit_logs
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION protect_audit_logs();
