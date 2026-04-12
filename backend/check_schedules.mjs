import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

console.log('=== DB Time Check ===');
const dbTime = await client.query(`SELECT NOW() as db_now, NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh' as vn_now`);
console.log(dbTime.rows[0]);

console.log('\n=== Recent Schedules ===');
const schedTime = await client.query(`
  SELECT 
    s.id,
    s.scheduled_time,
    s.scheduled_time AT TIME ZONE 'Asia/Ho_Chi_Minh' as vn_time,
    NOW() as db_now,
    s.scheduled_time <= NOW() as is_due,
    s.triggered_at,
    s.is_active,
    s.repeat_pattern,
    ci.title,
    mf.file_path
  FROM broadcast_schedules s
  LEFT JOIN content_items ci ON s.content_id = ci.id
  LEFT JOIN media_files mf ON ci.id = mf.content_id
  ORDER BY s.scheduled_time DESC
  LIMIT 10
`);
console.log(JSON.stringify(schedTime.rows, null, 2));

console.log('\n=== Active, Not Triggered, Due Now (30min window) ===');
const due = await client.query(`
  SELECT s.id, s.scheduled_time, s.triggered_at, s.is_active, ci.title, mf.file_path
  FROM broadcast_schedules s
  LEFT JOIN content_items ci ON s.content_id = ci.id
  LEFT JOIN media_files mf ON ci.id = mf.content_id
  WHERE s.is_active = true
    AND s.triggered_at IS NULL
    AND s.scheduled_time <= NOW()
    AND s.scheduled_time >= NOW() - INTERVAL '30 minutes'
`);
console.log('Due schedules:', JSON.stringify(due.rows, null, 2));

await client.end();
