import pg from 'pg';
import 'dotenv/config';

async function migrate() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect();
    
    console.log('Adding unit_id to channels table...');
    await client.query(`
      ALTER TABLE channels 
      ADD COLUMN IF NOT EXISTS unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL;
    `);

    // Optionally assign existing channels to the root unit (e.g., ID 1) as a start
    // await client.query('UPDATE channels SET unit_id = 1 WHERE unit_id IS NULL');

    console.log('Successfully updated channels schema.');
    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
