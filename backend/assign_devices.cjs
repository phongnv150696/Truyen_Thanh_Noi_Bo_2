const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function assign() {
  try {
    await client.connect();
    console.log('--- STEP 2: ASSIGNING DEVICES ---');

    // 1. Get IDs of Units and Channels
    const units = await client.query('SELECT id, name FROM units');
    const channels = await client.query('SELECT id, name FROM channels');

    const getUnitId = (name) => units.rows.find(u => u.name.includes(name))?.id;
    const getChanId = (name) => channels.rows.find(c => c.name.includes(name))?.id;

    const idA1 = getUnitId('A1');
    const idB1 = getUnitId('B1');
    const idC1 = getUnitId('C1');
    const idSVĐ = getUnitId('Sân vận động');

    const idTongHop = getChanId('Tổng hợp');
    const idThongBao = getChanId('Thông báo');
    const idNhac = getChanId('Nhạc');
    const idSuKien = getChanId('Sự kiện');

    // 2. Update existing device (ID 1)
    await client.query('UPDATE devices SET unit_id = $1, channel_id = $2 WHERE id = 1', [idA1, idTongHop]);
    console.log('Updated Device 1 -> A1 / Kênh Tổng hợp');

    // 3. Create mock devices for other areas
    const mockDevices = [
      { name: 'Loa Hành lang B1', unit_id: idB1, channel_id: idTongHop },
      { name: 'Loa Thông báo C1', unit_id: idC1, channel_id: idThongBao },
      { name: 'Loa Căn tin C1', unit_id: idC1, channel_id: idNhac },
      { name: 'Loa Khán đài SVĐ', unit_id: idSVĐ, channel_id: idSuKien }
    ];

    for (const d of mockDevices) {
      if (d.unit_id && d.channel_id) {
        // Check if exists
        const check = await client.query('SELECT id FROM devices WHERE name = $1', [d.name]);
        if (check.rowCount === 0) {
          await client.query('INSERT INTO devices (name, unit_id, channel_id, status, ip_address, created_at) VALUES ($1, $2, $3, \'online\', \'192.168.1.\' || (100 + $4), NOW())', [d.name, d.unit_id, d.channel_id, mockDevices.indexOf(d)]);
          console.log(`Created Device: ${d.name}`);
        }
      }
    }

    console.log('--- STEP 2 COMPLETED ---');

  } catch (err) {
    console.error('Assignment failed:', err);
  } finally {
    await client.end();
  }
}

assign();
