
import pg from 'pg';
const { Client } = pg;

async function test() {
  const client = new Client({
    connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
  });
  await client.connect();
  
  try {
    const res3 = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'broadcast_schedules' AND column_name = 'duration'
    `);
    console.log("\nSchema for duration:");
    console.log(res3.rows[0]);

    if (res3.rows[0].data_type === 'integer') {
        console.log("Duration is INTEGER. Adding seconds via * interval '1 second'");
        const res = await client.query(`SELECT NOW() + (120 * INTERVAL '1 second') as test`);
        console.log(res.rows[0]);
    } else {
        console.log("Duration is likely INTERVAL. Testing addition...");
        try {
            const res = await client.query(`SELECT NOW() + '120 seconds'::interval as test`);
            console.log(res.rows[0]);
        } catch (e) { console.error(e.message); }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
