
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkSchedules() {
  await client.connect();
  console.log("Checking Schedules...");
  const res = await client.query(`
    SELECT s.id, s.scheduled_time, s.is_active, s.triggered_at, s.content_id, s.radio_id, 
           r.name as radio_name, r.url as radio_url 
    FROM broadcast_schedules s 
    LEFT JOIN radios r ON s.radio_id = r.id 
    ORDER BY s.scheduled_time DESC LIMIT 10
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  
  const timeRes = await client.query('SELECT NOW() as node_now');
  console.log("DB Time:", timeRes.rows[0].node_now);
  console.log("Node JS Time:", new Date().toISOString());
  
  await client.end();
}

checkSchedules().catch(console.error);
