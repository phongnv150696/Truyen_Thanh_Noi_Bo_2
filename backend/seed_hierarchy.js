
import pg from 'pg';
const { Client } = pg;

async function seed() {
  const client = new Client({
    connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
  });
  await client.connect();
  
  try {
    console.log("Starting Seeding Hierarchy...");

    // 1. Create Battalion 1
    const battalionRes = await client.query(`
      INSERT INTO units (name, level, parent_id) 
      VALUES ('Tiểu đoàn 1', 2, (SELECT id FROM units WHERE name = 'Bộ Chỉ Huy OpenClaw' LIMIT 1))
      RETURNING id;
    `);
    const battalionId = battalionRes.rows[0].id;
    console.log(`Created Battalion 1 (ID: ${battalionId})`);

    // 2. Create Companies 1, 2, 3
    const companyNames = ['Đại đội 1', 'Đại đội 2', 'Đại đội 3'];
    const companyIds = [];
    for (const name of companyNames) {
      const res = await client.query(`
        INSERT INTO units (name, level, parent_id) 
        VALUES ($1, 3, $2)
        RETURNING id;
      `, [name, battalionId]);
      companyIds.push(res.rows[0].id);
      console.log(`Created ${name} (ID: ${res.rows[0].id})`);
    }

    // 3. Create a test channel for Company 1
    const channelRes = await client.query(`
      INSERT INTO channels (name, unit_id, mount_point)
      VALUES ('Kênh Đại đội 1', $1, 'c1_broadcast')
      RETURNING id;
    `, [companyIds[0]]);
    const channelId = channelRes.rows[0].id;

    // 4. Create some test data for scoring
    // C1: 5 Content Items (approved) -> 50 points
    for (let i = 1; i <= 5; i++) {
        await client.query(`
            INSERT INTO content_items (title, body, status, unit_id, author_id)
            VALUES ($1, 'Nội dung thi đua C1', 'approved', $2, (SELECT id FROM users LIMIT 1))
        `, [`Bài viết thi đua C1 - Số ${i}`, companyIds[0]]);
    }

    // C2: 10 Successful Broadcasts -> 50 points
    for (let i = 1; i <= 10; i++) {
        await client.query(`
            INSERT INTO broadcast_sessions (channel_id, content_id, status, start_time, end_time)
            VALUES ($1, (SELECT id FROM content_items LIMIT 1), 'completed', NOW(), NOW() + INTERVAL '10 minutes')
        `, [channelId]); // Reusing C1 channel for simplicity in scoring
    }
    // Wait, the scoring query joins broadcast_sessions with channels to get unit_id.
    // So I should create a channel for C2.
    const channelC2Res = await client.query(`
      INSERT INTO channels (name, unit_id, mount_point)
      VALUES ('Kênh Đại đội 2', $1, 'c2_broadcast')
      RETURNING id;
    `, [companyIds[1]]);
    const chanC2Id = channelC2Res.rows[0].id;
    for (let i = 1; i <= 10; i++) {
        await client.query(`
            INSERT INTO broadcast_sessions (channel_id, content_id, status, start_time, end_time)
            VALUES ($1, (SELECT id FROM content_items LIMIT 1), 'completed', NOW(), NOW() + INTERVAL '10 minutes')
        `, [chanC2Id]);
    }

    console.log("Seeding Completed Successfully!");
    console.log("Summary: Battalion 1 should have aggregate points from C1 and C2.");

  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await client.end();
  }
}

seed();
