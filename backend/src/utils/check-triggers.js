import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/truyen_thanh_noi_bo'
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT event_object_table, trigger_name, event_manipulation, action_statement, action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'media_files'
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
