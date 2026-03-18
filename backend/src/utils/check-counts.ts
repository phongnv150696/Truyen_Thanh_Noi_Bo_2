import { getDbClient } from './db.js';
import 'dotenv/config';

async function checkCounts() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    const tables = ['devices', 'media_files', 'users', 'broadcast_schedules', 'channels', 'content_items'];
    
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table}: ${res.rows[0].count} rows`);
      } catch (e: any) {
        console.log(`${table}: Error or table doesn't exist - ${e.message}`);
      }
    }

  } catch (err) {
    console.error('Error checking counts:', err);
  } finally {
    await client.end();
  }
}

checkCounts();
