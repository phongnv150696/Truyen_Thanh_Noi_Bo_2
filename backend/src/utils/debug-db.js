import pg from 'pg';
import 'dotenv/config';
import fs from 'fs';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/truyen_thanh_noi_bo'
});

async function check() {
  await client.connect();
  const resMedia = await client.query('SELECT id, file_name, content_id, created_at FROM media_files ORDER BY id ASC');
  fs.writeFileSync('c:/Users/Admin/OneDrive/Tệp đính kèm/Truyen_Thanh_Noi_Bo/backend/debug_db_timestamps.json', JSON.stringify(resMedia.rows, null, 2));
  console.log('Output written to debug_db_timestamps.json');
  await client.end();
}
check();
