import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function fixUnitLeakage() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  const client = await pool.connect();
  try {
    console.log('Starting data correction for unit_id isolation...');

    // 1. Channels
    const channelsRes = await client.query('UPDATE channels SET unit_id = 1 WHERE unit_id IS NULL');
    console.log(`Updated ${channelsRes.rowCount} channels`);

    // 2. Radios
    const radiosRes = await client.query('UPDATE radios SET unit_id = 1 WHERE unit_id IS NULL');
    console.log(`Updated ${radiosRes.rowCount} radios`);

    // 3. Content Items
    const contentRes = await client.query('UPDATE content_items SET unit_id = 1 WHERE unit_id IS NULL');
    console.log(`Updated ${contentRes.rowCount} content items`);

    // 4. Media Files
    const mediaRes = await client.query('UPDATE media_files SET unit_id = 1 WHERE unit_id IS NULL');
    console.log(`Updated ${mediaRes.rowCount} media files`);

    // 5. Users (ensure no NULL units for non-admins)
    const usersRes = await client.query('UPDATE users SET unit_id = 1 WHERE unit_id IS NULL AND role_id != 1');
    console.log(`Updated ${usersRes.rowCount} users`);

    console.log('Data correction completed.');
  } catch (err) {
    console.error('Error during data correction:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

fixUnitLeakage();
