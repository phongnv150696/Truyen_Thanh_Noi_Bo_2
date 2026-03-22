const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function list() {
  await client.connect();
  console.log('--- TABLES IN OPENCLAW ---');
  const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log(JSON.stringify(res.rows));
  await client.end();
}

list();
