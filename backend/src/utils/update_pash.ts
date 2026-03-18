import { getDbClient } from './db.js';
import 'dotenv/config';

const client = getDbClient();

async function updatePassword() {
  try {
    await client.connect();
    console.log('Connected to DB');
    const res = await client.query(
      "UPDATE users SET password_hash = $1 WHERE username = 'admin' RETURNING id",
      ['$2b$10$bDUkiqUj1h0P3r8H5aW9vuT9qyacYuRlZALMInWKzMBK0B3GGeSom']
    );
    if ((res.rowCount ?? 0) > 0) {
      console.log('Successfully updated admin password hash');
    } else {
      console.log('Admin user not found in database');
    }
  } catch (err) {
    console.error('Error updating password:', err);
  } finally {
    await client.end();
  }
}

updatePassword();
