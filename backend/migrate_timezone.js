
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function migrate() {
  await client.connect();
  console.log("🚀 Starting database timezone migration...");
  
  try {
    // 1. Convert broadcast_schedules
    await client.query(`
      ALTER TABLE broadcast_schedules 
      ALTER COLUMN scheduled_time TYPE TIMESTAMPTZ,
      ALTER COLUMN triggered_at TYPE TIMESTAMPTZ,
      ALTER COLUMN stopped_at TYPE TIMESTAMPTZ,
      ALTER COLUMN created_at TYPE TIMESTAMPTZ;
    `);
    console.log("✅ broadcast_schedules updated to TIMESTAMPTZ");

    // 2. Convert broadcast_sessions
    await client.query(`
      ALTER TABLE broadcast_sessions 
      ALTER COLUMN start_time TYPE TIMESTAMPTZ,
      ALTER COLUMN end_time TYPE TIMESTAMPTZ,
      ALTER COLUMN created_at TYPE TIMESTAMPTZ;
    `);
    console.log("✅ broadcast_sessions updated to TIMESTAMPTZ");

    // 3. Optional: Set DB timezone to Vietnam for this session (unlikely to persist globally but good for testing)
    await client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
    const res = await client.query("SELECT NOW()");
    console.log("🕒 Current DB Time after migration:", res.rows[0].now);

  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
