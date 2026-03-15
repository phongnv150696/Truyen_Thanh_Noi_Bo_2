-- STEP 2: NỘI DUNG & MEDIA (CONTENT & MEDIA) --

-- 1. Bảng Danh mục Bản tin (Content Items)
CREATE TABLE content_items (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    summary TEXT,
    author_id INTEGER REFERENCES users(id),
    unit_id INTEGER REFERENCES units(id),
    status VARCHAR(50) DEFAULT 'draft', -- draft, pending_review, approved, published, archived
    tags TEXT[], -- Gắn nhãn phân loại
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Kiểm duyệt AI (Content Reviews)
-- Bảng này OpenClaw AI có quyền ghi
CREATE TABLE content_reviews (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    reviewer_type VARCHAR(50) DEFAULT 'ai', -- ai, human
    reviewer_id INTEGER REFERENCES users(id), -- Nếu là người kiểm duyệt
    score INTEGER, -- Điểm đánh giá nội dung (0-100)
    comments TEXT, -- Nhận xét của AI hoặc người
    is_sensitive BOOLEAN DEFAULT FALSE, -- Cảnh báo nội dung nhạy cảm
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Tệp tin Media (Media Files)
CREATE TABLE media_files (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(512) NOT NULL, -- Đường dẫn trong MinIO
    bucket_name VARCHAR(100) DEFAULT 'openclaw-media',
    file_size BIGINT,
    mime_type VARCHAR(100), -- audio/mpeg, audio/wav
    duration INTERVAL, -- Độ dài file âm thanh
    status VARCHAR(50) DEFAULT 'ready', -- processing, ready, error
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Hàng chờ TTS (TTS Jobs)
CREATE TABLE tts_jobs (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    voice_engine VARCHAR(100), -- Ví dụ: OpenClaw-TTS, FPT-AI
    voice_style VARCHAR(50), -- Nam, Nữ, Vùng miền
    priority INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'queued', -- queued, processing, completed, failed
    error_message TEXT,
    output_media_id INTEGER REFERENCES media_files(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- 5. Bảng Phiên ghi âm (Recording Sessions)
CREATE TABLE recording_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    unit_id INTEGER REFERENCES units(id),
    title VARCHAR(255),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration INTERVAL,
    media_id INTEGER REFERENCES media_files(id),
    is_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Từ điển Quân sự (Military Dictionary)
CREATE TABLE military_dictionary (
    id SERIAL PRIMARY KEY,
    word VARCHAR(255) UNIQUE NOT NULL, -- Từ/Cụm từ gốc
    phonetic_reading TEXT, -- Cách đọc phiên âm cho TTS
    category VARCHAR(100), -- Vũ khí, Chiến thuật, Cấp bậc...
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
