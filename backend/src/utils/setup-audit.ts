import { getDbClient } from './db.js';

async function setupAuditLogs() {
  const client = getDbClient();
  try {
    await client.connect();
    console.log('Connected to DB');

    // Create table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        user_name VARCHAR(100),
        action VARCHAR(100) NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_id INTEGER,
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Checked/Created audit_logs table');

    // Check columns
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'audit_logs';
    `);
    console.log('Columns:');
    console.log(res.rows);

    // Insert some mock logs for UI testing if empty
    const countRes = await client.query('SELECT COUNT(*) FROM audit_logs');
    if (parseInt(countRes.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO audit_logs (user_name, action, target_type, target_id, details) VALUES
        ('Admin', 'CREATE', 'Content', 1, '{"title": "Bản tin sáng"}'),
        ('Admin', 'UPDATE', 'Device', 2, '{"status": "online"}'),
        ('Admin', 'ACTIVATE_EMERGENCY', 'System', null, '{"reason": "Diễn tập"}'),
        ('Editor', 'CREATE', 'Schedule', 5, '{"time": "08:00"}'),
        ('Technician', 'DELETE', 'Media', 10, '{"filename": "old_audio.mp3"}'),
        ('Admin', 'LOGIN', 'User', 1, '{"ip": "127.0.0.1"}'),
        ('Admin', 'APPROVE_USER', 'User', 3, '{"role": "editor"}'),
        ('Commander', 'REVIEW', 'Content', 2, '{"status": "published"}');
      `);
      console.log('Inserted mock logs');
    }

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

setupAuditLogs();
