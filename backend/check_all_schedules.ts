
import pg from 'pg';
import 'dotenv/config';

async function check() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
  const nowRes = await client.query("SELECT NOW()");
  console.log('Current DB Now:', nowRes.rows[0].now);

  console.log('\n--- All Schedules for Today ---');
  const res = await client.query(`
    SELECT id, scheduled_time, triggered_at, is_active, content_id, radio_id 
    FROM broadcast_schedules 
    WHERE scheduled_time::date = NOW()::date
    ORDER BY scheduled_time ASC
  `);
  for (const row of res.rows) {
     console.log(`ID: ${row.id}, Scheduled: ${row.scheduled_time}, Triggered: ${row.triggered_at}, Active: ${row.is_active}, CID: ${row.content_id}, RID: ${row.radio_id}`);
  }
  
  await client.end();
}
check().catch(console.error);
