const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function standardize() {
  try {
    await client.connect();
    console.log('--- STANDARDIZE CORE DEBUG ---');
    
    // 1. Check current DB
    const dbName = await client.query('SELECT current_database(), current_user');
    console.log(`Connected to DB: ${dbName.rows[0].current_database} as User: ${dbName.rows[0].current_user}`);

    // 2. Check tables
    const tableCheck = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables visible:', tableCheck.rows.map(r => r.table_name).join(', '));

    const units = [
      { name: 'Tòa nhà Chỉ huy (A1)', status: 'online' },
      { name: 'Tòa nhà Kỹ thuật (B1)', status: 'online' },
      { name: 'Tòa nhà Hậu cần (C1)', status: 'online' },
      { name: 'Cổng gác / Vọng gác', status: 'online' },
      { name: 'Sân vận động & Khu tập luyện', status: 'online' }
    ];

    const channels = [
      { name: 'Kênh Tổng hợp', mount: '/tonghop', desc: 'Luồng tin chính cho toàn đơn vị' },
      { name: 'Kênh Thông báo', mount: '/thongbao', desc: 'Chuyên lệnh điều hành và báo động' },
      { name: 'Kênh Nhạc & Tin tức', mount: '/nhac', desc: 'Phát nhạc giải trí và tin vắn' },
      { name: 'Kênh Kỹ thuật', mount: '/kythuat', desc: 'Dành riêng cho kiểm thử và bảo trì' },
      { name: 'Kênh Sự kiện', mount: '/sukien', desc: 'Phát thanh ngoài trời tại Sân vận động' }
    ];

    console.log('\nProcessing Units...');
    for (const u of units) {
      if (tableCheck.rows.some(r => r.table_name === 'units')) {
        const check = await client.query('SELECT id FROM units WHERE name = $1', [u.name]);
        if (check.rowCount > 0) {
          await client.query('UPDATE units SET status = $1 WHERE name = $2', [u.status, u.name]);
          console.log(`Updated Unit: ${u.name}`);
        } else {
          await client.query('INSERT INTO units (name, status) VALUES ($1, $2)', [u.name, u.status]);
          console.log(`Inserted Unit: ${u.name}`);
        }
      } else {
        console.warn('Skipping units: Table NOT FOUND');
      }
    }

    console.log('\nProcessing Channels...');
    for (const c of channels) {
      if (tableCheck.rows.some(r => r.table_name === 'channels')) {
        const check = await client.query('SELECT id FROM channels WHERE name = $1', [c.name]);
        if (check.rowCount > 0) {
          await client.query('UPDATE channels SET mount_point = $1, description = $2 WHERE name = $3', [c.mount, c.desc, c.name]);
          console.log(`Updated Channel: ${c.name}`);
        } else {
          await client.query('INSERT INTO channels (name, mount_point, description, status) VALUES ($1, $2, $3, \'offline\')', [c.name, c.mount, c.desc]);
          console.log(`Inserted Channel: ${c.name}`);
        }
      } else {
        console.warn('Skipping channels: Table NOT FOUND');
      }
    }

    console.log('\n--- STEP 1 COMPLETED ---');

  } catch (err) {
    console.error('Standardization failed:', err);
  } finally {
    await client.end();
  }
}

standardize();
