import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

async function fixConstraints() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw'
  });

  try {
    await client.connect();
    console.log('Connected to database to fix constraints');

    // 1. Fix broadcast_schedules
    console.log('Updating broadcast_schedules...');
    await client.query(`
      ALTER TABLE broadcast_schedules 
      DROP CONSTRAINT IF EXISTS broadcast_schedules_content_id_fkey,
      ADD CONSTRAINT broadcast_schedules_content_id_fkey 
      FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE;
    `);

    // 2. Fix broadcast_sessions
    console.log('Updating broadcast_sessions...');
    await client.query(`
      ALTER TABLE broadcast_sessions 
      DROP CONSTRAINT IF EXISTS broadcast_sessions_content_id_fkey,
      ADD CONSTRAINT broadcast_sessions_content_id_fkey 
      FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE SET NULL;
    `);

    // 3. Fix on_demand_requests
    console.log('Updating on_demand_requests...');
    await client.query(`
      ALTER TABLE on_demand_requests 
      DROP CONSTRAINT IF EXISTS on_demand_requests_content_id_fkey,
      ADD CONSTRAINT on_demand_requests_content_id_fkey 
      FOREIGN KEY (content_id) REFERENCES content_items(id) ON DELETE CASCADE;
    `);

    console.log('Constraints fixed successfully!');

  } catch (err) {
    console.error('Error fixing constraints:', err);
  } finally {
    await client.end();
  }
}

fixConstraints();
