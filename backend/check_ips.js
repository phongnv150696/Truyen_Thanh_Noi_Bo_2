
import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  await client.connect();
  const res = await client.query('SELECT id, name, ip_address, status, last_seen FROM devices WHERE ip_address IN (\'192.168.100.189\', \'192.168.100.229\')');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

check().catch(console.error);
