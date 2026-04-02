
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkTime() {
  await client.connect();
  const res = await client.query('SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_ts, localtimestamp as db_local');
  console.log("DB Times (NOW, TS, LOCAL):", JSON.stringify(res.rows[0], null, 2));
  
  const schedules = await client.query(`
    SELECT id, scheduled_time, triggered_at, is_active, repeat_pattern 
    FROM broadcast_schedules 
    ORDER BY id DESC LIMIT 5
  `);
  console.log("Last 5 Schedules:", JSON.stringify(schedules.rows, null, 2));
  
  await client.end();
}

checkTime().catch(console.error);
