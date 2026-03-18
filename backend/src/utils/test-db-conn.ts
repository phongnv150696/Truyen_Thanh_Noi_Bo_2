import { getDbClient } from './db.js';
import 'dotenv/config';

async function testConnection() {
  const client = getDbClient();
  try {
    console.log('Connecting to database using environment variables...');
    await client.connect();
    console.log('✅ SUCCESS! Connected to database.');
    
    // Check if we can run a simple query
    const res = await client.query('SELECT NOW()');
    console.log('Database time:', res.rows[0].now);
    
  } catch (err: any) {
    console.error('❌ FAILURE!', err.message);
  } finally {
    await client.end();
  }
}

testConnection();
