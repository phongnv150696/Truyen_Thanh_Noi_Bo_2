import axios from 'axios';
import { getDbClient } from './db.js';
import 'dotenv/config';

async function verifyFlow() {
  const client = getDbClient();
  const username = `user_v2_${Date.now()}`;
  const password = 'Password@123';

  try {
    await client.connect();
    console.log('--- Phase 1: Registration ---');
    const regRes = await axios.post('http://localhost:3000/auth/register', {
        username,
        password,
        full_name: 'Test User V2',
        email: 'testv2@example.com',
        rank: 'Trung úy'
    });
    console.log('Registration Response:', regRes.data.message);

    // Check if in user_registrations
    const regInDB = await client.query('SELECT * FROM user_registrations WHERE username = $1', [username]);
    if ((regInDB.rowCount ?? 0) > 0 && regInDB.rows[0].status === 'pending' && regInDB.rows[0].password_hash.startsWith('$2a$')) {
        console.log('SUCCESS: User found in user_registrations with pending status and hash.');
    } else {
        console.error('FAILURE: User not found in user_registrations properly.');
        return;
    }

    const registrationId = regInDB.rows[0].id;

    console.log('\n--- Phase 2: Approval ---');
    // Admin approval
    const approveRes = await axios.post(`http://localhost:3000/users/registrations/${registrationId}/approve`, {
        role_id: 3 // Editor
    });
    console.log('Approval Response:', approveRes.data.message);

    // Check if in users
    const userInDB = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    if ((userInDB.rowCount ?? 0) > 0 && userInDB.rows[0].password_hash === regInDB.rows[0].password_hash) {
        console.log('SUCCESS: User moved to users table with matching password hash.');
    } else {
        console.error('FAILURE: User not found in users table properly.');
        return;
    }

    // Check registration status update
    const finalReg = await client.query('SELECT status FROM user_registrations WHERE id = $1', [registrationId]);
    if (finalReg.rows[0].status === 'approved') {
        console.log('SUCCESS: Registration status updated to approved.');
    } else {
        console.warn('WARNING: Registration status was not updated to approved.');
    }

    console.log('\n--- Phase 3: Login Check ---');
    const loginRes = await axios.post('http://localhost:3000/auth/login', {
        username,
        password
    });
    console.log('Login Response:', loginRes.data.message);
    if (loginRes.data.token) {
        console.log('SUCCESS: New user can log in successfully.');
    } else {
        console.error('FAILURE: New user login failed.');
    }

  } catch (err: any) {
    console.error('Verification Error:', err.response?.data || err.message);
  } finally {
    await client.end();
  }
}

verifyFlow();
