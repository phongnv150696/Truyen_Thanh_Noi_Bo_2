import pg from 'pg';
import 'dotenv/config';

async function research() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const client = await pool.connect();
    
    // Check if tables exist
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables in DB:', tables.rows.map(r => r.table_name));

    if (tables.rows.some(r => r.table_name === 'units')) {
      console.log('--- SCHEMA: units ---');
      const unitCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'units'");
      console.table(unitCols.rows);
      const units = await client.query('SELECT * FROM units LIMIT 5');
      console.table(units.rows);
    }

    if (tables.rows.some(r => r.table_name === 'channels')) {
      console.log('--- SCHEMA: channels ---');
      const chanCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'channels'");
      console.table(chanCols.rows);
      const channels = await client.query('SELECT * FROM channels LIMIT 5');
      console.table(channels.rows);
    }

    if (tables.rows.some(r => r.table_name === 'devices')) {
      console.log('--- SCHEMA: devices ---');
      const devCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'devices'");
      console.table(devCols.rows);
      const devices = await client.query('SELECT id, name, channel_id, unit_id FROM devices LIMIT 5');
      console.table(devices.rows);
    }

    client.release();
  } catch (err) {
    console.error('Error during research:', err);
  } finally {
    await pool.end();
  }
}

research();
