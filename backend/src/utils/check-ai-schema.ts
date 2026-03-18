import { getDbClient } from './db.js';
import 'dotenv/config';

async function checkAISchema() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    const tables = ['ai_suggestions', 'broadcast_schedules', 'content_items'];
    for (const table of tables) {
        console.log(`\n--- Columns of ${table} ---`);
        const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        `, [table]);
        res.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));
    }

  } catch (err) {
    console.error('Error checking schema:', err);
  } finally {
    await client.end();
  }
}

checkAISchema();
