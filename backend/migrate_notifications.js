import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // Add columns if they don't exist
    await client.query(`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS sender_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
    `);

    console.log('Migration successful: sender_name and priority added to notifications.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
