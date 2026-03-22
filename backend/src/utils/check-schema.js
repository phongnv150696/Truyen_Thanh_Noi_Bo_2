import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/truyen_thanh_noi_bo'
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT column_name, column_default, is_nullable, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'media_files' AND column_name = 'content_id'
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
