-- STEP 9: KHỞI TẠO DỮ LIỆU GỐC (ROOT DATA SEEDING) --

-- 1. Tạo đơn vị cấp cao nhất (Root Unit)
INSERT INTO units (name, level) VALUES ('Bộ Chỉ Huy OpenClaw', 1);

-- 2. Tạo tài khoản Admin mặc định
-- Lưu ý: password_hash này tương ứng với mật khẩu 'admin123' (giả định)
-- Trong thực tế bạn nên dùng script hash đúng chuẩn Bcrypt
INSERT INTO users (username, password_hash, full_name, rank, role_id, unit_id)
VALUES (
    'admin', 
    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNIvB9S6S.7i.9Vj4dM13tLwP5G', 
    'Quản trị viên Hệ thống', 
    'Đại tá', 
    (SELECT id FROM roles WHERE name = 'admin'), 
    (SELECT id FROM units WHERE name = 'Bộ Chỉ Huy OpenClaw')
);

-- 3. Thông báo hệ thống đầu tiên
INSERT INTO notifications (user_id, title, message, type)
VALUES (
    (SELECT id FROM users WHERE username = 'admin'),
    'Chào mừng bạn!',
    'Hệ thống OpenClaw đã được cài đặt và cấu hình thành công.',
    'success'
);
