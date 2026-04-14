const { Client } = require('pg');
const bcrypt = require('bcrypt');

const config = {
  user: 'postgres',
  host: 'localhost',
  database: 'openclaw',
  password: 'YourStrongPassword',
  port: 5432,
};

async function resetAdmin() {
  const client = new Client(config);
  try {
    await client.connect();
    const hash = await bcrypt.hash('123456', 10);
    await client.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, 'admin']);
    console.log('✅ Admin password reset to: 123456');
    await client.end();
  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    process.exit(1);
  }
}

resetAdmin();
