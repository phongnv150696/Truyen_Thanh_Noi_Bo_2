import pg from 'pg';
import 'dotenv/config';

async function research() {
  const client = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('--- TABLE: units ---');
    const units = await client.query('SELECT id, name, parent_id FROM units LIMIT 20');
    console.table(units.rows);

    console.log('--- TABLE: channels ---');
    const channels = await client.query('SELECT * FROM channels LIMIT 20');
    console.table(channels.rows);

    console.log('--- TABLE: devices ---');
    const devices = await client.query('SELECT id, name, channel_id, unit_id FROM devices LIMIT 10');
    console.table(devices.rows);

    console.log('--- TABLE: radio_stations ---');
    const radios = await client.query('SELECT * FROM radio_stations LIMIT 10');
    console.table(radios.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

research();
