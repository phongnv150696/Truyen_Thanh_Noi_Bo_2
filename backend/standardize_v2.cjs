const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function run() {
  try {
    await client.connect();
    console.log('--- STANDARDIZE V2 ---');
    
    const db = await client.query('SELECT current_database()');
    console.log('Database:', db.rows[0].current_database);

    const units = [
      { name: 'Tòa nhà Chỉ huy (A1)' },
      { name: 'Tòa nhà Kỹ thuật (B1)' },
      { name: 'Tòa nhà Hậu cần (C1)' },
      { name: 'Cổng gác / Vọng gác' },
      { name: 'Sân vận động & Khu tập luyện' }
    ];

    const channels = [
      { name: 'Kênh Tổng hợp', mount: '/tonghop', desc: 'Luồng tin chính cho toàn đơn vị' },
      { name: 'Kênh Thông báo', mount: '/thongbao', desc: 'Chuyên lệnh điều hành và báo động' },
      { name: 'Kênh Nhạc & Tin tức', mount: '/nhac', desc: 'Phát nhạc giải trí và tin vắn' },
      { name: 'Kênh Kỹ thuật', mount: '/kythuat', desc: 'Dành riêng cho kiểm thử và bảo trì' },
      { name: 'Kênh Sự kiện', mount: '/sukien', desc: 'Phát thanh ngoài trời tại Sân vận động' }
    ];

    for (const u of units) {
      // Check if exists
      const check = await client.query('SELECT id FROM units WHERE name = $1', [u.name]);
      if (check.rowCount === 0) {
        await client.query('INSERT INTO units (name, level, created_at) VALUES ($1, 1, NOW())', [u.name]);
        console.log(`Unit inserted: ${u.name}`);
      } else {
        console.log(`Unit already exists: ${u.name}`);
      }
    }

    for (const c of channels) {
      const check = await client.query('SELECT id FROM channels WHERE name = $1', [c.name]);
      if (check.rowCount === 0) {
        await client.query('INSERT INTO channels (name, mount_point, description, status, created_at) VALUES ($1, $2, $3, \'offline\', NOW())', [c.name, c.mount, c.desc]);
        console.log(`Channel inserted: ${c.name}`);
      } else {
        console.log(`Channel already exists: ${c.name}`);
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

run();
