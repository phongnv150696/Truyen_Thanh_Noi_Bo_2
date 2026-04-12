import pg from 'pg';
const { Client } = pg;
const client = new Client('postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw');
async function run() {
  await client.connect();
  try {
    const unitsRes = await client.query('SELECT id FROM units');
    const units = unitsRes.rows;
    if(units.length === 0) return;
    
    // Generate content items
    for (let i = 0; i < 45; i++) {
        const uId = units[Math.floor(Math.random() * units.length)].id;
        await client.query(`INSERT INTO content_items (title, body, status, unit_id, author_id, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, 1, NOW() - interval '1 day' * FLOOR(RANDOM() * 60), NOW() - interval '1 day' * FLOOR(RANDOM() * 60))`, 
        [`Bản tin tự động thi đua ${i}`, 'Nội dung tuyên truyền tự xướng phát để lấy thành tích cuối mùa...', 'published', uId]);
    }
    
    // Generate broadcast sessions
    const channelsRes = await client.query('SELECT id, unit_id FROM channels');
    const channels = channelsRes.rows;
    if(channels.length > 0) {
        for (let i = 0; i < 180; i++) {
            const ch = channels[Math.floor(Math.random() * channels.length)];
            await client.query(`INSERT INTO broadcast_sessions (channel_id, start_time, end_time, status) 
            VALUES ($1, NOW() - interval '1 day' * FLOOR(RANDOM() * 60), NOW() - interval '1 day' * FLOOR(RANDOM() * 60) + interval '30 minutes', 'completed')`, 
            [ch.id]);
        }
    }
    
    console.log('Leaderboard Data Seeding Complete!');
  } catch(e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
