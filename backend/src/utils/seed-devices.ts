import { getDbClient } from './db.js';
import 'dotenv/config';

async function seedDevices() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    const devices = [
      { name: 'Loa Khu vực A - Tòa 1', type: 'speaker', ip: '192.168.1.101', status: 'online' },
      { name: 'Loa Khu vực B - Cổng chính', type: 'speaker', ip: '192.168.1.102', status: 'online' },
      { name: 'Đầu phát Trung tâm', type: 'terminal', ip: '192.168.1.50', status: 'online' },
      { name: 'Loa Khu vực C - Hội trường', type: 'speaker', ip: '192.168.1.103', status: 'offline' },
      { name: 'Loa Hành lang Tầng 2', type: 'speaker', ip: '192.168.1.104', status: 'online' },
      { name: 'Loa Nhà ăn', type: 'speaker', ip: '192.168.1.105', status: 'maintenance' },
      { name: 'Loa Khu tập luyện', type: 'speaker', ip: '192.168.1.106', status: 'online' },
      { name: 'Loa Bãi xe', type: 'speaker', ip: '192.168.1.107', status: 'offline' },
    ];

    for (const d of devices) {
      await client.query(
        'INSERT INTO devices (name, type, ip_address, status, last_seen) VALUES ($1, $2, $3, $4, NOW())',
        [d.name, d.type, d.ip, d.status]
      );
      console.log(`Inserted device: ${d.name}`);
    }

    console.log('Seeding devices completed');

  } catch (err) {
    console.error('Error seeding devices:', err);
  } finally {
    await client.end();
  }
}

seedDevices();
