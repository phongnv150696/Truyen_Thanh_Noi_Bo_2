const pg = require('pg');
const client = new pg.Client({
  connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');

    // 1. Get sample resources
    const contentRes = await client.query("SELECT id FROM content_items WHERE status = 'approved' LIMIT 1");
    const contentId = contentRes.rows[0]?.id || 1;
    const unitRes = await client.query("SELECT id FROM units LIMIT 10");
    const units = unitRes.rows.map(r => r.id);
    const channelRes = await client.query("SELECT id FROM channels LIMIT 5");
    const channels = channelRes.rows.map(r => r.id);

    console.log(`Using Content ID: ${contentId}, Units: ${units.join(',')}, Channels: ${channels.join(',')}`);

    // 2. Clear old demo data
    console.log('Cleaning up...');
    await client.query('DELETE FROM recording_sessions WHERE title LIKE \'Demo Rec%\'');
    await client.query('DELETE FROM broadcast_schedules WHERE duration = 301'); 
    await client.query('DELETE FROM broadcast_sessions WHERE duration = 301');

    // 3. Create 20 Broadcast Schedules (Trends)
    console.log('Creating broadcast schedules (last 7 days)...');
    for (let i = 0; i < 20; i++) {
        const scheduledTime = new Date();
        scheduledTime.setDate(scheduledTime.getDate() - Math.floor(i / 3));
        scheduledTime.setHours(scheduledTime.getHours() - (i % 3) * 6);
        const chanId = channels[i % channels.length] || 1;
        
        await client.query(
            'INSERT INTO broadcast_schedules (channel_id, content_id, scheduled_time, duration, is_active) VALUES ($1, $2, $3, $4, $5)',
            [chanId, contentId, scheduledTime, 301, true]
        );
    }

    // 4. Create 20 Broadcast Sessions (Points/History)
    console.log('Creating broadcast sessions (last 7 days)...');
    for (let i = 0; i < 20; i++) {
        const start = new Date();
        start.setDate(start.getDate() - Math.floor(i / 3));
        start.setHours(start.getHours() - (i % 3) * 6 - 2);
        const end = new Date(start.getTime() + 3600000);
        const chanId = channels[i % channels.length] || 1;
        
        await client.query(
            'INSERT INTO broadcast_sessions (channel_id, content_id, start_time, end_time, status, duration) VALUES ($1, $2, $3, $4, $5, $6)',
            [chanId, contentId, start, end, 'completed', 301]
        );
    }

    // 5. Update Device Statuses
    console.log('Updating devices...');
    await client.query('UPDATE devices SET status = \'online\', last_seen = NOW() WHERE id IN (SELECT id FROM devices LIMIT 5)');
    await client.query('UPDATE devices SET status = \'offline\', last_seen = NOW() WHERE id NOT IN (SELECT id FROM devices LIMIT 5)');

    // 6. Mock Media Metadata
    console.log('Creating media metadata...');
    await client.query('DELETE FROM media_files WHERE name = \'Dung lượng Hệ thống demo\'');
    await client.query(
        'INSERT INTO media_files (name, file_name, file_path, file_size, unit_id, author_id) VALUES ($1, $2, $3, $4, $5, $6)',
        ['Dung lượng Hệ thống demo', 'demo.mp3', 'demo.mp3', 850 * 1024 * 1024, 1, 1]
    );

    console.log('SUCCESS: Analytics data initialized (Schedules, Sessions, Devices).');

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await client.end();
  }
}

run();
