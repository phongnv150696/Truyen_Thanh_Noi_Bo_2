import { getDbClient } from './db.js';
import 'dotenv/config';

async function seedSchedules() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Seed Channels
    await client.query(`
      INSERT INTO channels (name, mount_point, description, status) VALUES 
      ('Kênh Tổng hợp', '/tong_hop', 'Kênh phát tin chung cho toàn đơn vị', 'online'),
      ('Kênh Kỹ thuật', '/ky_thuat', 'Kênh hướng dẫn và bảo trì thiết bị', 'offline'),
      ('Kênh Văn thể', '/van_the', 'Kênh giải trí và thể thao quân đội', 'online')
      ON CONFLICT (mount_point) DO NOTHING;
    `);

    const channelsRes = await client.query('SELECT id FROM channels');
    const chan1 = channelsRes.rows[0]?.id;
    const chan3 = channelsRes.rows[2]?.id;

    // 2. Ensure some content exists
    await client.query(`
      INSERT INTO content_items (title, body, status) VALUES 
      ('Chào cờ sáng thứ 2', 'Nội dung nghi lễ chào cờ đầu tuần', 'published'),
      ('Tin vắn quân sự chiều', 'Điểm tin nhanh trong ngày', 'published')
      ON CONFLICT DO NOTHING;
    `);
    
    const contentRes = await client.query('SELECT id FROM content_items');
    const cont1 = contentRes.rows[0]?.id;
    const cont2 = contentRes.rows[1]?.id;

    if (chan1 && cont1) {
      // 3. Seed Schedules
      await client.query(`
        INSERT INTO broadcast_schedules (channel_id, content_id, scheduled_time, repeat_pattern) VALUES
        (${chan1}, ${cont1}, NOW() + INTERVAL '1 hour', 'daily'),
        (${chan3}, ${cont2}, NOW() + INTERVAL '3 hours', 'none')
      `);
    }

    console.log('Broadcasting seed completed successfully');

  } catch (err) {
    console.error('Error seeding broadcasting:', err);
  } finally {
    await client.end();
  }
}

seedSchedules();
