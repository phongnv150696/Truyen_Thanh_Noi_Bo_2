import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';

function getDbUrl() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  return match ? match[1].trim() : null;
}

async function main() {
  const dbUrl = getDbUrl();
  console.log('Connecting to:', dbUrl);
  const client = new Client({
    connectionString: dbUrl
  });
  await client.connect();
  const res = await client.query('SELECT DISTINCT role_name FROM users');
  console.log('Roles in DB:', res.rows.map(r => r.role_name));
  await client.end();
}

main().catch(console.error);
