const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function find() {
  await client.connect();
  console.log('--- FINDING TABLES IN ALL SCHEMAS ---');
  const res = await client.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name IN ('units', 'channels', 'users')");
  console.log(JSON.stringify(res.rows));
  await client.end();
}

find();
