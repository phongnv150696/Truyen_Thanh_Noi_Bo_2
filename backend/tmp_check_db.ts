import pg from 'pg';
import 'dotenv/config';

async function check() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'broadcast_schedules'`);
    console.log('Columns for broadcast_schedules:', cols.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
