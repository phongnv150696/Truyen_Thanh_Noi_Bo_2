
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

async function checkDevices() {
  try {
    const res = await pool.query("SELECT id, name, status, channel_id FROM devices WHERE status = 'online'");
    console.log("Online Devices:");
    console.table(res.rows);
  } catch (err) {
    console.error("Error checking devices:", err);
  } finally {
    await pool.end();
  }
}

checkDevices();
