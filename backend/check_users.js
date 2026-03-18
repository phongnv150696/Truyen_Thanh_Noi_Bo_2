const pg = require('pg');
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw'
});

async function checkUsers() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT u.username, u.full_name, u.role_id, r.name as role_name 
      FROM users u 
      LEFT JOIN roles r ON u.role_id = r.id
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkUsers();
