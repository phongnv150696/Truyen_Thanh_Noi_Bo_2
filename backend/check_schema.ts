import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: 'postgresql://postgres:YourStrongPassword@localhost:5432/openclaw' });

async function run() {
  try {
    await client.connect();
    
    console.log('--- broadcast_schedules columns ---');
    const cols1 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'broadcast_schedules'");
    console.log(cols1.rows.map(r => r.column_name).join(', '));

    console.log('--- content_items columns ---');
    const cols2 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'content_items'");
    console.log(cols2.rows.map(r => r.column_name).join(', '));

    console.log('--- users columns ---');
    const cols3 = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
    console.log(cols3.rows.map(r => r.column_name).join(', '));

  } catch (e: any) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}

run();
