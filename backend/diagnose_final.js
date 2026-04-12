
const pg = require('pg');
const client = new pg.Client({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });

async function run() {
  await client.connect();
  try {
    const res = await client.query(`
      SELECT id, name, level 
      FROM units 
      WHERE level = 1 
      OR name LIKE '%Quân khu%' 
      OR name LIKE '%Cổng gác%' 
      OR name LIKE '%Tòa nhà%' 
      OR name LIKE '%Sân vận động%'
      OR name LIKE '%Khu vực lưu trữ%'
    `);
    console.log('UNITS_TO_DELETE:');
    console.log(JSON.stringify(res.rows, null, 2));

    const userRes = await client.query(`
      SELECT u.id, u.full_name, u.unit_id, un.name as unit_name, un.level as unit_level 
      FROM users u 
      JOIN units un ON u.unit_id = un.id 
      WHERE u.full_name LIKE '%Hai%'
    `);
    console.log('USER_SCOPE:');
    console.log(JSON.stringify(userRes.rows, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
