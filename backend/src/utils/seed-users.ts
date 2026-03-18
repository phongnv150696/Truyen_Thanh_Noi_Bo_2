import { getDbClient } from './db.js';
import 'dotenv/config';

async function seedUsers() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Add some units if they don't exist
    await client.query(`
      INSERT INTO units (name, level) VALUES 
      ('Trung đoàn Hải quân 123', 1),
      ('Tiểu đoàn 1', 2),
      ('Tiểu đoàn 2', 2),
      ('Đại đội 1', 3)
      ON CONFLICT DO NOTHING;
    `);

    const unitsResult = await client.query('SELECT id FROM units');
    const unit1 = unitsResult.rows[0]?.id;
    const unit2 = unitsResult.rows[1]?.id;

    // 2. Add some users (password123 hash)
    const passHash = '$2a$10$7vN3G2P6rG8vY6.V7X.9u.BfH6ZpG3X5ZpG3X5ZpG3X5ZpG3X5ZpG3X5Zp';
    
    await client.query(`
      INSERT INTO users (username, password_hash, full_name, rank, email, role_id, unit_id) VALUES
      ('commander_vu', '${passHash}', 'Nguyễn Văn Vũ', 'Thượng tá', 'vu.nv@bqp.vn', 2, ${unit1}),
      ('editor_hung', '${passHash}', 'Trần Việt Hùng', 'Đại úy', 'hung.tv@bqp.vn', 3, ${unit2}),
      ('broadcaster_lan', '${passHash}', 'Lê Thị Lan', 'Trung úy', 'lan.lt@bqp.vn', 4, ${unit1})
      ON CONFLICT (username) DO NOTHING;
    `);

    // 3. Add some pending registrations
    await client.query(`
      INSERT INTO user_registrations (username, full_name, rank, email, unit_id, status) VALUES
      ('new_member_son', 'Phạm Ngọc Sơn', 'Thiếu úy', 'son.pn@gmail.com', ${unit2}, 'pending'),
      ('new_member_mai', 'Ngô Tuyết Mai', 'Trung úy', 'mai.nt@gmail.com', ${unit1}, 'pending')
    `);

    console.log('Seeding completed successfully');

  } catch (err) {
    console.error('Error seeding users:', err);
  } finally {
    await client.end();
  }
}

seedUsers();
