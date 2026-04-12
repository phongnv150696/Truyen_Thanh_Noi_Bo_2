import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

// 1. Đánh dấu triggered_at cho tất cả lịch cũ (quá 30 phút) không có audio - để scheduler bỏ qua
console.log('=== Marking stale no-audio schedules as triggered ===');
const staleResult = await client.query(`
  UPDATE broadcast_schedules s
  SET triggered_at = NOW()
  WHERE s.triggered_at IS NULL
    AND s.scheduled_time <= NOW() - INTERVAL '30 minutes'
    AND s.radio_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id
    )
  RETURNING id, scheduled_time
`);
console.log(`Marked ${staleResult.rowCount} stale schedules:`, staleResult.rows.map(r => r.id));

// 2. Xem lịch còn lại hiện tại đang chờ phát
console.log('\n=== Remaining pending schedules ===');
const pending = await client.query(`
  SELECT s.id, s.scheduled_time, s.triggered_at, ci.title, mf.file_path, s.repeat_pattern
  FROM broadcast_schedules s
  LEFT JOIN content_items ci ON s.content_id = ci.id
  LEFT JOIN media_files mf ON ci.id = mf.content_id
  WHERE s.triggered_at IS NULL AND s.is_active = true
  ORDER BY s.scheduled_time ASC
`);
console.log(JSON.stringify(pending.rows, null, 2));

await client.end();
