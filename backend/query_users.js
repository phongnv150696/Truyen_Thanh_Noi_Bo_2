import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';

function getDbUrl() {
  const envContent = fs.readFileSync('.env', 'utf8');
  const match = envContent.match(/DATABASE_URL=(.+)/);
  return match ? match[1].trim() : null;
}

async function main() {
  const dbUrl = getDbUrl();
  const client = new Client({
    connectionString: dbUrl
  });
  await client.connect();
  const res = await client.query('SELECT u.username, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id');
  console.log('Users and Roles:', res.rows);
  await client.end();
}

main().catch(console.error);
