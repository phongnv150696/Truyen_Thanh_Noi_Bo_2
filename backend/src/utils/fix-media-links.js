import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw'
});

async function fix() {
  await client.connect();
  console.log('--- Cleaning up incorrect media links ---');
  
  // 1. Reset links for files that were obviously seeded or have generic names
  // 2. Or just reset ALL links for now so user can start fresh
  const res = await client.query('UPDATE media_files SET content_id = NULL WHERE content_id = 1');
  console.log(`Updated ${res.rowCount} records. They are now "Chưa gắn".`);
  
  await client.end();
}
fix();
