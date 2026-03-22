import pg from 'pg';
import 'dotenv/config';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:123456@localhost:5432/truyen_thanh_noi_bo'
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT pg_get_expr(adbin, adrelid) as default_value
    FROM pg_attrdef
    WHERE adrelid = 'media_files'::regclass
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
check();
