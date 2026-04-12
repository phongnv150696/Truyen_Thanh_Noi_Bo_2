
import pg from 'pg';
import 'dotenv/config';

async function research() {
  const client = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const user = await client.query("SELECT u.id, u.username, u.full_name, u.unit_id, un.name as unit_name, un.level as unit_level FROM users u JOIN units un ON u.unit_id = un.id WHERE u.full_name LIKE '%Hai%'");
    console.log('USER_INFO:');
    console.log(JSON.stringify(user.rows, null, 2));
    
    // Search for the level 1 units shown in the screenshot
    const units = await client.query("SELECT id, name, level, parent_id FROM units WHERE level = 1 OR name LIKE '%Quân khu%' OR name LIKE '%Cổng gác%'");
    console.log('OFFENDING_UNITS:');
    console.log(JSON.stringify(units.rows, null, 2));

    // Check if Tieu doan 5 exists and what its structure is
    const td5 = await client.query("SELECT id, name, level, parent_id FROM units WHERE name LIKE '%Tiểu đoàn 5%'");
    console.log('TIEU_DOAN_5:');
    console.log(JSON.stringify(td5.rows, null, 2));
    if (td5.rows.length > 0) {
        const children = await client.query("SELECT id, name, level, parent_id FROM units WHERE parent_id = $1", [td5.rows[0].id]);
        console.log('TIEU_DOAN_5_CHILDREN:');
        console.log(JSON.stringify(children.rows, null, 2));
    }
  } catch (e) { console.error(e); }
  finally { await client.end(); }
}
research();
