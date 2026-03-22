import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw';

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('🚀 Dẫn động Migration: Chuẩn hóa Analytics (ESM Version)...');

  const execute = async (label, query, params = []) => {
    try {
      const res = await client.query(query, params);
      console.log(`✅ ${label}: Thành công (${res.rowCount || 0} dòng)`);
      return res;
    } catch (err) {
      console.error(`❌ ${label}: Thất bại!`);
      console.error(`   Lỗi: ${err.message}`);
      return null;
    }
  };

  try {
    // 1. Chuẩn hóa bảng broadcast_sessions
    await execute('Thêm cột start_time', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ');
    await execute('Thêm cột end_time', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ');
    await execute('Thêm cột duration', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS duration INTEGER');
    await execute('Thêm cột schedule_id', 'ALTER TABLE broadcast_sessions ADD COLUMN IF NOT EXISTS schedule_id INTEGER');
    
    // 2. Đồng bộ hóa đơn giản
    await execute('Đồng bộ hóa cơ bản (Insert)', `
      INSERT INTO broadcast_sessions (schedule_id, content_id, channel_id, start_time, status)
      SELECT id, content_id, channel_id, triggered_at, 'completed'
      FROM broadcast_schedules
      WHERE triggered_at IS NOT NULL
        AND id NOT IN (SELECT COALESCE(schedule_id, -1) FROM broadcast_sessions)
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
      SET end_time = start_time + (COALESCE(duration, 300) * INTERVAL '1 second')
      WHERE end_time IS NULL AND start_time IS NOT NULL
    `);

    console.log('✅ Migration hoàn tất thành công!');
  } catch (err) {
    console.error('❌ Lỗi tổng quát:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
function end() {}
