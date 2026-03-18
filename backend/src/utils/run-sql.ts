import { getDbClient } from './db.js';
import 'dotenv/config';

async function runSQL() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = process.argv[2];
    if (!sql) {
      console.error('Please provide SQL as argument');
      process.exit(1);
    }

    const res = await client.query(sql);
    console.log('SQL executed successfully');
    console.log(res);

  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

runSQL();