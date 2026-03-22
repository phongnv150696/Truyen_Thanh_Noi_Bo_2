const { Client } = require('pg');

const connectionString = 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw';

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🚀 Dẫn động Migration: Chuẩn hóa Analytics (V11 - Debug)...');

  const execute = async (label, query, params = []) => {
    try {
      const res = await client.query(query, params);
      console.log(`✅ ${label}: Thành công (${res.rowCount || 0} dòng)`);
      return res;
    } catch (err) {
      console.error(`❌ ${label}: Thất bại!`);
      console.error(`   Lỗi: ${err.message}`);
      console.error(`   SQL: ${query}`);
      return null;
    }
  };

  // 1. Chuẩn hóa bảng broadcast_sessions
  await execute('Thêm cột start_time', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ');
  await execute('Thêm cột end_time', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ');
  await execute('Thêm cột duration', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS duration INTEGER');
  
  // 2. Đồng bộ hóa đơn giản
  await execute('Đồng bộ hóa cơ bản (Insert)', `
    INSERT INTO broadcast_sessions (schedule_id, content_id, channel_id, start_time, status)
    SELECT id, content_id, channel_id, triggered_at, 'completed'
    FROM broadcast_schedules
    WHERE triggered_at IS NOT NULL
      AND id NOT IN (SELECT schedule_id FROM broadcast_sessions WHERE schedule_id IS NOT NULL)
  `);

  // 3. Cập nhật dữ liệu bổ sung
  await execute('Cập nhật duration từ schedules', `
    UPDATE broadcast_sessions bs
    SET duration = s.duration
    FROM broadcast_schedules s
    WHERE bs.schedule_id = s.id AND bs.duration IS NULL AND s.duration IS NOT NULL
  `);

  await execute('Cập nhật end_time', `
    UPDATE broadcast_sessions 
    SET end_time = start_time + (INTERVAL '1 second' * COALESCE(duration, 300))
    WHERE end_time IS NULL AND start_time IS NOT NULL
  `);

  console.log('🏁 Migration finished.');
  await client.end();
}

migrate();
 Stone;
