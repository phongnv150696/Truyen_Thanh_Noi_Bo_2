const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function check() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('units', 'channels')
    AND is_nullable = 'NO'
    AND column_default IS NULL
    AND column_name <> 'id'
  `);
  console.log('---JSON---');
  console.log(JSON.stringify(res.rows));
  console.log('---END---');
  await client.end();
}

check().catch(console.error);
