const { Client } = require('pg');
const client = new Client('postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw');

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to DB on port 5433');
    
    // 1. Add channel_id to devices
    await client.query(`
      ALTER TABLE devices 
      ADD COLUMN IF NOT EXISTS channel_id INTEGER REFERENCES channels(id) ON DELETE SET NULL
    `);
    console.log('Added channel_id to devices table');
    
    // 2. Assign existing devices to the first channel if any
    const channels = await client.query('SELECT id FROM channels LIMIT 1');
    if (channels.rows.length > 0) {
      const firstChannelId = channels.rows[0].id;
      await client.query('UPDATE devices SET channel_id = $1 WHERE channel_id IS NULL', [firstChannelId]);
      console.log(`Assigned existing devices to channel ID: ${firstChannelId}`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
