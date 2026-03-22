import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Check if new columns exist
    const columnRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name IN ('sender_name', 'priority')
    `);
    console.log('Columns check:', columnRes.rows);

    // 2. Trigger a notification (mocking what AI service does)
    console.log('Inserting test notification...');
    await client.query(`
      INSERT INTO notifications (title, message, type, link, sender_name, priority) 
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ['Test Notif', 'Test Message', 'info', 'ai', 'System Tester', 'high']);

    // 3. Fetch notifications to verify
    const notifs = await client.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 1');
    console.log('Last notification:', notifs.rows[0]);

    if (notifs.rows[0].sender_name === 'System Tester' && notifs.rows[0].priority === 'high') {
      console.log('✅ DATABASE VERIFICATION SUCCESSFUL');
    } else {
      console.log('❌ DATABASE VERIFICATION FAILED');
    }

  } catch (err) {
    console.error('Verification failed:', err.message);
  } finally {
    await client.end();
  }
}

verify();
