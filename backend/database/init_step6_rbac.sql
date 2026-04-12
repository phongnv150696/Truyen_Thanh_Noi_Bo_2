-- STEP 6: KẾT CẤU LẠI HỆ THỐNG PHÂN QUYỀN (MILITARY RBAC) --

-- 1. Bảng Quyền hạn chi tiết (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. 'CREATE_NEWS', 'APPROVE_NEWS', 'START_BROADCAST'
    description TEXT,
    module VARCHAR(50) -- e.g. 'CONTENT', 'BROADCAST', 'SYSTEM', 'MEDIA'
);

-- 2. Ma trận Vai trò - Quyền hạn (Role_Permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Thêm role mới (Split Commander)
INSERT INTO roles (name, description) VALUES
('political_commissar', 'Chính ủy / Chính trị viên (Quản lý nội dung, duyệt tin, tư tưởng)'),
('operations_commander', 'Thủ trưởng trực ban / Phụ trách tác chiến (Quản lý thiết bị, lịch phát)')
ON CONFLICT (name) DO NOTHING;

-- 3. Bảng Ủy quyền động (Delegations)
CREATE TABLE IF NOT EXISTS delegations (
    id SERIAL PRIMARY KEY,
    delegator_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    delegatee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, revoked, expired
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Giới hạn Ca Trực (User Shifts)
CREATE TABLE IF NOT EXISTS user_shifts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bổ sung Độ mật (Security Clearance Level)
-- Cấp độ: 1 = Phổ thông/Công khai, 2 = Lưu hành nội bộ, 3 = Mật, 4 = Tối mật, 5 = Tuyệt mật
ALTER TABLE users ADD COLUMN IF NOT EXISTS clearance_level INTEGER DEFAULT 1;
ALTER TABLE content_items ADD COLUMN IF NOT EXISTS clearance_level INTEGER DEFAULT 1;
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS clearance_level INTEGER DEFAULT 1;

-- 6. Insert Default Permissions for Baseline (Demo Data)
INSERT INTO permissions (code, description, module) VALUES
('VIEW_DASHBOARD', 'Xem bảng điều khiển', 'SYSTEM'),
('MANAGE_SYSTEM', 'Cấu hình hệ thống', 'SYSTEM'),
('CREATE_NEWS', 'Tạo bài viết', 'CONTENT'),
('APPROVE_NEWS', 'Phê duyệt bài viết', 'CONTENT'),
('DELETE_NEWS', 'Xóa bài viết', 'CONTENT'),
('START_BROADCAST', 'Bắt đầu phát sóng / Ấn On-Air', 'BROADCAST'),
('MANAGE_DEVICES', 'Cấu hình thiết bị Loa/IP', 'BROADCAST'),
('VIEW_REPORTS', 'Xem báo cáo/Lịch sử', 'SYSTEM'),
('EMERGENCY_OVERRIDE', 'Kích hoạt Báo động khẩn cấp', 'BROADCAST')
ON CONFLICT (code) DO NOTHING;
