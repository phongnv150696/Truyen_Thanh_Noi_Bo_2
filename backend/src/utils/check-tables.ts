import { getDbClient } from './db.js';
import 'dotenv/config';

async function checkTables() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const res = await client.query(query);
    console.log('Tables in database:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));

    for (const table of ['units', 'channels', 'broadcast_schedules']) {
      console.log(`\n--- Schema of ${table} ---`);
      const schemaRes = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      schemaRes.rows.forEach(col => {
        console.log(`${col.column_name}: ${col.data_type} (${col.is_nullable})`);
      });
    }

  } catch (err) {
    console.error('Error checking tables:', err);
  } finally {
    await client.end();
  }
}

checkTables();
