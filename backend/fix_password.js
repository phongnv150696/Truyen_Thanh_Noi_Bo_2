import bcrypt from 'bcrypt';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  const password = 'admin123';
  console.log(`🔐 Generating new hash for "${password}"...`);
  
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  
  console.log(`📝 Updating database with hash: ${hash}`);
  
  try {
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id',
      [hash, 'admin']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully!');
    } else {
      console.log('❌ User "admin" not found in database.');
    }
  } catch (err) {
    console.error('❌ Error updating password:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
