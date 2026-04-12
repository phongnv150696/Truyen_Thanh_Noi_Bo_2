import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

async function checkData() {
  const client = await pool.connect();
  try {
    const units = await client.query('SELECT COUNT(*) FROM units');
    const content = await client.query("SELECT COUNT(*) FROM content_items WHERE status = 'published'");
    const broadcasts = await client.query("SELECT COUNT(*) FROM broadcast_sessions WHERE status = 'completed'");
    const recordings = await client.query('SELECT COUNT(*) FROM recording_sessions');
    
    console.log('Units Total:', units.rows[0].count);
    console.log('Published Content:', content.rows[0].count);
    console.log('Completed Broadcasts:', broadcasts.rows[0].count);
    console.log('Recordings:', recordings.rows[0].count);
    
    const sampleUnits = await client.query('SELECT id, name FROM units LIMIT 10');
    console.log('Sample Units:', JSON.stringify(sampleUnits.rows, null, 2));
    
    const sampleContent = await client.query('SELECT id, title, unit_id, author_id, status FROM content_items LIMIT 10');
    console.log('Sample Content (Any Status):', JSON.stringify(sampleContent.rows, null, 2));

    const sessions = await client.query('SELECT id, status, channel_id FROM broadcast_sessions LIMIT 5');
    console.log('Sample Broadcast Sessions:', JSON.stringify(sessions.rows, null, 2));
    
  } catch (err) {
    console.error(err);
  } finally {
    client.release();
    process.exit(0);
  }
}

checkData();
