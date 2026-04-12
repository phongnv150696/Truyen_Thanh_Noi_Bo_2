import { Pool } from 'pg';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();

try {
  const users = await client.query('SELECT id, username, full_name, unit_id FROM users');
  const units = await client.query('SELECT id, name, parent_id, level FROM units');
  
  let out = '--- USERS ---\n';
  users.rows.forEach(u => out += `User ID: ${u.id}, Name: ${u.full_name}, Unit ID: ${u.unit_id}\n`);
  
  out += '\n--- UNITS ---\n';
  units.rows.forEach(u => out += `Unit ID: ${u.id}, Name: ${u.name}, Parent ID: ${u.parent_id}, Level: ${u.level}\n`);
  
  writeFileSync('debug_units_output.txt', out);
  console.log('Results written to debug_units_output.txt');
} finally {
  client.release();
  await pool.end();
}
