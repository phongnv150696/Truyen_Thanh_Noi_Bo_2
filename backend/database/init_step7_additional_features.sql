-- STEP 7: ADDITIONAL FEATURES (RADIOS & ROUTINES) --

-- 1. Bảng Đài phát thanh (Radios)
CREATE TABLE IF NOT EXISTS radios (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Bảng Hiệu lệnh làm việc (Routine Commands)
CREATE TABLE IF NOT EXISTS routine_commands (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, 
    title VARCHAR(100) NOT NULL,
    file_path TEXT,
    duration INTEGER,
    file_size VARCHAR(50),
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(title, unit_id)
);

-- 3. Cập nhật bảng Lịch phát sóng (Broadcast Schedules)
ALTER TABLE broadcast_schedules 
ADD COLUMN IF NOT EXISTS routine_id INTEGER REFERENCES routine_commands(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS radio_id INTEGER REFERENCES radios(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_all_units BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ;

-- Đảm bảo kiểu dữ liệu thời gian là TIMESTAMPTZ để hỗ trợ múi giờ chính xác
ALTER TABLE broadcast_schedules ALTER COLUMN scheduled_time TYPE TIMESTAMPTZ;
ALTER TABLE broadcast_schedules ALTER COLUMN created_at TYPE TIMESTAMPTZ;

-- 4. Cập nhật bảng Nhật ký phiên phát sóng (Broadcast Sessions)
ALTER TABLE broadcast_sessions 
ADD COLUMN IF NOT EXISTS routine_id INTEGER REFERENCES routine_commands(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS radio_id INTEGER REFERENCES radios(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS duration INTERVAL;

ALTER TABLE broadcast_sessions ALTER COLUMN start_time TYPE TIMESTAMPTZ;
ALTER TABLE broadcast_sessions ALTER COLUMN end_time TYPE TIMESTAMPTZ;
ALTER TABLE broadcast_sessions ALTER COLUMN created_at TYPE TIMESTAMPTZ;
