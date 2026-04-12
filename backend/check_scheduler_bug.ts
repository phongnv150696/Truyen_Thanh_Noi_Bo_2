
import pg from 'pg';
import 'dotenv/config';

async function check() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  console.log('--- Database Time Check ---');
  const t = await client.query("SELECT NOW(), CURRENT_TIMESTAMP, current_setting('timezone') as tz");
  console.log('DB Now (Session TZ):', t.rows[0]);
  
  await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
  const t2 = await client.query("SELECT NOW(), CURRENT_TIMESTAMP, current_setting('timezone') as tz");
  console.log('DB Now (+07):', t2.rows[0]);
  
  console.log('\n--- Pending Schedules (should have triggered) ---');
  const res = await client.query(`
    SELECT id, scheduled_time, triggered_at, is_active 
    FROM broadcast_schedules 
    WHERE is_active = true 
      AND scheduled_time <= (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
      AND triggered_at IS NULL
    ORDER BY scheduled_time DESC
  `);
  console.log(`Found ${res.rows.length} pending items.`);
  for (const row of res.rows) {
     console.log(`ID: ${row.id}, Scheduled: ${row.scheduled_time.toISOString()}, Triggered: ${row.triggered_at}`);
  }

  console.log('\n--- Sample Upcoming Schedules ---');
  const res2 = await client.query(`
    SELECT id, scheduled_time, triggered_at, is_active 
    FROM broadcast_schedules 
    WHERE is_active = true 
      AND scheduled_time > (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')
    ORDER BY scheduled_time ASC LIMIT 5
  `);
  for (const row of res2.rows) {
     console.log(`ID: ${row.id}, Scheduled: ${row.scheduled_time.toISOString()}, Triggered: ${row.triggered_at}`);
  }
  
  await client.end();
}
check().catch(console.error);
