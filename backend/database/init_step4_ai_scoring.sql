-- STEP 4: AI AGENT & CHẤM ĐIỂM (AI AGENT & SCORING) --

-- 1. Bảng Điểm số đơn vị (Unit Scores)
-- Lưu KPI hàng ngày của từng đơn vị
CREATE TABLE unit_scores (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    category VARCHAR(100), -- vd: Tần suất phát tin, Chất lượng biên tập, Kỷ luật
    score DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Xếp hạng (Leaderboard) - Có thể dùng View hoặc Table
-- Ở đây dùng Table để cache kết quả tính toán
CREATE TABLE score_leaderboard (
    id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES units(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    total_score DECIMAL(10, 2) DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(unit_id, month, year)
);

-- 3. Bảng Hàng chờ tác vụ AI (OpenClaw Jobs)
CREATE TABLE openclaw_jobs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(100) NOT NULL, -- vd: summarize, text_to_speech, schedule_optimization
    payload JSONB,
    status VARCHAR(50) DEFAULT 'queued', -- queued, working, finished, failed
    result JSONB,
    error_log TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bảng Nhật ký API AI (OpenClaw API Logs)
-- Tracking token và chi phí
CREATE TABLE openclaw_api_logs (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100), -- vd: claude-3-5-sonnet, gpt-4
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    job_id INTEGER REFERENCES openclaw_jobs(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Gợi ý AI (AI Suggestions)
CREATE TABLE ai_suggestions (
    id SERIAL PRIMARY KEY,
    content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
    suggestion_type VARCHAR(100), -- vd: headline_improvement, tone_adjustment
    suggested_text TEXT,
    original_text TEXT,
    is_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
