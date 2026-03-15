import pg from 'pg';
const { Client } = pg;
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATABASE_URL = 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw';
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function seed() {
  const client = new Client({
    connectionString: DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const dummyData = [
      { name: 'Bản tin số 1 - Chào buổi sáng', size: 1024000 },
      { name: 'Thông báo huấn luyện quý III', size: 2048000 },
      { name: 'Hiệu lệnh báo động khẩn cấp', size: 512000 },
      { name: 'Bản tin văn hóa quân sự Tập 4', size: 3072000 },
      { name: 'Hướng dẫn bảo quản khí tài', size: 1536000 },
      { name: 'Thông tin chiến sự biên giới', size: 4096000 },
      { name: 'Lời chào từ chỉ huy đơn vị', size: 256000 },
      { name: 'Tạp chí phát thanh số 45', size: 5120000 },
      { name: 'Khai mạc hội thao quân sự', size: 1280000 },
      { name: 'Bản tin thời tiết khu vực', size: 768000 },
    ];

    for (const item of dummyData) {
      const uniqueFilename = `${uuidv4()}.mp3`;
      const filePath = path.join(UPLOADS_DIR, uniqueFilename);
      
      // Create a dummy file (1 byte is enough for placeholder)
      fs.writeFileSync(filePath, Buffer.alloc(1));

      const query = `
        INSERT INTO media_files (file_name, file_path, file_size, mime_type, status)
        VALUES ($1, $2, $3, $4, $5)
      `;
      const values = [item.name, uniqueFilename, item.size, 'audio/mpeg', 'ready'];
      await client.query(query, values);
      console.log(`Inserted: ${item.name}`);
    }

    console.log('Seeding completed successfully');
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await client.end();
  }
}

seed();
