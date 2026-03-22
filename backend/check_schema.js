import pg from 'pg';
const { Client } = pg;

async function check() {
  const client = new Client({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });
  try {
    await client.connect();
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(r => r.table_name));
    
    for (const table of ['users', 'roles', 'units', 'user_registrations']) {
        const count = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`${table} count:`, count.rows[0].count);
    }
    await client.end();
  } catch (err) {
    console.error(err);
  }
}
check();
