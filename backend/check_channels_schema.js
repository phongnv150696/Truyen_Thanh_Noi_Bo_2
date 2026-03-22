import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const res = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'channels'");
    console.log('Channels columns:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

check();
