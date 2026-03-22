import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(r => r.table_name));

    const usersCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Users columns:', usersCols.rows);

    const roles = await client.query("SELECT * FROM roles");
    console.log('Roles:', roles.rows);
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

check();
