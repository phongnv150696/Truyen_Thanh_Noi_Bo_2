-- 1. Tạo đơn vị cấp cao nhất (Root Unit) nếu chưa có
INSERT INTO units (name, level) 
SELECT 'Bộ Chỉ Huy OpenClaw', 1
WHERE NOT EXISTS (SELECT 1 FROM units WHERE name = 'Bộ Chỉ Huy OpenClaw');

-- 2. Tạo tài khoản Admin mặc định
INSERT INTO users (username, password_hash, full_name, rank, role_id, unit_id)
SELECT 
    'admin', 
    '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgNIvB9S6S.7i.9Vj4dM13tLwP5G', 
    'Quản trị viên Hệ thống', 
    'Đại tá', 
    (SELECT id FROM roles WHERE name = 'admin' LIMIT 1), 
    (SELECT id FROM units WHERE name = 'Bộ Chỉ Huy OpenClaw' LIMIT 1)
ON CONFLICT (username) DO NOTHING;

-- 3. Thông báo hệ thống đầu tiên
INSERT INTO notifications (user_id, title, message, type)
SELECT 
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    'Chào mừng bạn!',
    'Hệ thống OpenClaw đã được cài đặt và cấu hình thành công.',
    'success'
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'admin')
AND NOT EXISTS (SELECT 1 FROM notifications WHERE title = 'Chào mừng bạn!');
