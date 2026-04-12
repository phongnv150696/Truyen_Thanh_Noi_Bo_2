import pg from 'pg';
const { Client } = pg;
const client = new Client('postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw');
async function run() {
  await client.connect();
  try {
    console.log('Migrating Device Telemetry & Commands...');
    await client.query(`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS volume INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS signal_strength INTEGER DEFAULT 100,
      ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(50) DEFAULT 'v1.0.0',
      ADD COLUMN IF NOT EXISTS last_maintenance TIMESTAMP DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS maintenance_notes TEXT;

      CREATE TABLE IF NOT EXISTS device_commands (
        id SERIAL PRIMARY KEY,
        device_id INTEGER REFERENCES devices(id) ON DELETE CASCADE,
        operator_id INTEGER REFERENCES users(id),
        command VARCHAR(100) NOT NULL,
        payload JSONB,
        status VARCHAR(50) DEFAULT 'success',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Migration Complete!');
  } catch(e) {
    console.error('Migration Failed:', e);
  } finally {
    await client.end();
  }
}
run();
