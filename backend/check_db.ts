import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5432/openclaw'
});

async function check() {
  try {
    await client.connect();
    
    // Check channel 1
    const channelRes = await client.query("SELECT id, name, status FROM channels WHERE id = 1");
    
    // Check device 22
    const deviceRes = await client.query("SELECT id, name, status, ip_address, last_seen FROM devices WHERE id = 22");
    
    // Check all online devices
    const onlineDevices = await client.query("SELECT id, name, status, ip_address FROM devices WHERE status = 'online'");

    const results = {
      channel_1: channelRes.rows[0],
      device_22: deviceRes.rows[0],
      online_devices: onlineDevices.rows
    };

    console.log(JSON.stringify(results, null, 2));

  } catch (err) {
    console.error('JSON_ERROR:', err.message);
  } finally {
    await client.end();
  }
}

check();
