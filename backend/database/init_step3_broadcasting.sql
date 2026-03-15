-- STEP 3: PHÁT SÓNG & LỊCH (BROADCASTING & SCHEDULING) --

-- 1. Bảng Kênh phát thanh (Channels)
CREATE TABLE channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- Tên kênh
    mount_point VARCHAR(255) UNIQUE NOT NULL, -- Đường dẫn Icecast (vd: /kenh_vung_1)
    description TEXT,
    unit_id INTEGER REFERENCES units(id), -- Kênh thuộc quản lý của đơn vị nào
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, emergency
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Lịch phát sóng (Broadcast Schedules)
CREATE TABLE broadcast_schedules (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id) ON DELETE CASCADE,
    content_id INTEGER REFERENCES content_items(id),
    scheduled_time TIMESTAMP NOT NULL, -- Thời gian dự kiến phát
    duration INTERVAL,
    repeat_pattern VARCHAR(50), -- daily, weekly, none
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Nhật ký phiên phát sóng (Broadcast Sessions/Logs)
CREATE TABLE broadcast_sessions (
    id SERIAL PRIMARY KEY,
    channel_id INTEGER REFERENCES channels(id),
    content_id INTEGER REFERENCES content_items(id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    actual_duration INTERVAL,
    status VARCHAR(50) DEFAULT 'completed', -- completed, interrupted, failed
    listener_count_peak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Yêu cầu phát ngay (On-demand Requests)
CREATE TABLE on_demand_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    content_id INTEGER REFERENCES content_items(id),
    channel_id INTEGER REFERENCES channels(id),
    priority INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending', -- pending, playing, completed, rejected
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Đề xuất lịch AI (Schedule Proposals)
-- OpenClaw AI có quyền ghi bảng này
CREATE TABLE schedule_proposals (
    id SERIAL PRIMARY KEY,
    proposal_name VARCHAR(255),
    details JSONB, -- Chứa lịch trình dự kiến do AI tạo ra
    status VARCHAR(50) DEFAULT 'draft', -- draft, reviewed, applied, rejected
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Tin nhắn Khẩn cấp (Alert Messages)
-- Chỉ Admin và Chỉ huy được tạo (Apply ở tầng App)
CREATE TABLE alert_messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    alert_level VARCHAR(50) DEFAULT 'priority', -- emergency, drill, priority
    target_unit_id INTEGER REFERENCES units(id), -- Áp dụng cho đơn vị nào
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
