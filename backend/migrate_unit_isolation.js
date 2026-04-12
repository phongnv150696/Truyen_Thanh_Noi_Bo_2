
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

    // 1. Update Notifications table
    console.log('Migrating notifications table...');
    await client.query(`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
    `);

    // 2. Update Audit Logs table
    console.log('Migrating audit_logs table...');
    await client.query(`
      ALTER TABLE audit_logs 
      ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
    `);

    // 3. Backfill existing logs/notifications (Optional: Map by user if possible)
    console.log('Backfilling unit_id from users table...');
    await client.query(`
      UPDATE audit_logs al
      SET unit_id = u.unit_id
      FROM users u
      WHERE al.user_id = u.id AND al.unit_id IS NULL;
    `);

    console.log('Migration successful: unit_id added to notifications and audit_logs.');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
