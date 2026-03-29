import postgres from 'pg';
import 'dotenv/config';

const pool = new postgres.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5432/openclaw'
});

async function migrate() {
  console.log('--- Starting Database Migration: Add Position Column ---');
  const client = await pool.connect();
  try {
    // 1. Add to users table
    console.log('Updating "users" table...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'position') THEN
          ALTER TABLE users ADD COLUMN position VARCHAR(255) DEFAULT '';
        END IF;
      END $$;
    `);

    // 2. Add to user_registrations table
    console.log('Updating "user_registrations" table...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_registrations' AND COLUMN_NAME = 'position') THEN
          ALTER TABLE user_registrations ADD COLUMN position VARCHAR(255) DEFAULT '';
        END IF;
      END $$;
    `);

    console.log('✅ Migration successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
