import { getDbClient } from './db.js';
import 'dotenv/config';

async function setupDevicesTable() {
  const client = getDbClient();

  try {
    await client.connect();
    console.log('Connected to database');

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS devices (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) DEFAULT 'speaker',
        ip_address VARCHAR(45),
        status VARCHAR(20) DEFAULT 'offline',
        unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
        last_seen TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await client.query(createTableQuery);
    console.log('Table "devices" created successfully');

  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await client.end();
  }
}

setupDevicesTable();
