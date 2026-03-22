import pg from 'pg';
const { Client } = pg;

async function test() {
  const connectionStrings = [
    'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw',
    'postgresql://postgres@127.0.0.1:5433/openclaw',
    'postgresql://postgres:postgres@127.0.0.1:5433/openclaw',
    'postgresql://postgres:OpenClaw@2024@127.0.0.1:5433/openclaw'
  ];

  for (const str of connectionStrings) {
    console.log(`Testing: ${str}`);
    const client = new Client({ connectionString: str });
    try {
      await client.connect();
      console.log('SUCCESS!');
      const resDevCount = await client.query('SELECT COUNT(*) FROM devices');
      console.log(`Device count: ${resDevCount.rows[0].count}`);
      const resUser = await client.query('SELECT u.username, r.name as role FROM users u JOIN roles r ON u.role_id = r.id');
      console.log('Users and Roles:');
      resUser.rows.forEach(r => console.log(` - ${r.username}: ${r.role}`));
      
      const resDevSample = await client.query('SELECT name FROM devices LIMIT 5');
      console.log('Sample Devices:');
      resDevSample.rows.forEach(r => console.log(` - ${r.name}`));

      const resContentCount = await client.query('SELECT COUNT(*) FROM content_items');
      console.log(`Content Items Count: ${resContentCount.rows[0].count}`);

      const resScheduleCount = await client.query('SELECT COUNT(*) FROM broadcast_schedules');
      console.log(`Broadcast Schedules Count: ${resScheduleCount.rows[0].count}`);

      await client.end();
      process.exit(0);
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }
  process.exit(1);
}

test();
