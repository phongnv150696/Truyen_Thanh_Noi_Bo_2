
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'broadcast_schedules' 
      AND column_name IN ('scheduled_time', 'triggered_at', 'stopped_at');
  `);
  console.log("Column Types for broadcast_schedules:", JSON.stringify(res.rows, null, 2));
  await client.end();
}

check().catch(console.error);
