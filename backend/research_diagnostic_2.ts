
import pg from 'pg';
import 'dotenv/config';

async function research() {
  const client = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const triggers = await client.query("SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%audit%' OR tgname LIKE '%protect%'");
    console.log('TRIGGERS:');
    console.log(JSON.stringify(triggers.rows, null, 2));
    
    const offending = await client.query("SELECT id, name, level FROM units WHERE level = 1 OR name LIKE '%Quân khu%' OR name LIKE '%Cổng gác%' OR name LIKE '%Tòa nhà%' OR name LIKE '%Sân vận động%'");
    console.log('OFFENDING_UNITS:');
    console.log(JSON.stringify(offending.rows, null, 2));

    const user = await client.query("SELECT u.id, u.username, u.full_name, u.unit_id, un.name as unit_name, un.level as unit_level FROM users u JOIN units un ON u.unit_id = un.id WHERE u.full_name LIKE '%Hai%'");
    console.log('USER_INFO:');
    console.log(JSON.stringify(user.rows, null, 2));
  } catch (e) { console.error(e); }
  finally { await client.end(); }
}
research();
