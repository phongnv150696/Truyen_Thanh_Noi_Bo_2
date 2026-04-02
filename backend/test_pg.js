
import pg from 'pg';
const { Client } = pg;

async function test() {
  const client = new Client({
    connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
  });
  await client.connect();
  
  try {
    const res = await client.query(`
      SELECT 
        NOW() as now,
        NOW() + 120 as plus_120,
        (NOW() + 120) - NOW() as diff
    `);
    console.log("Test: NOW() + 120");
    console.log(res.rows[0]);

    const res2 = await client.query(`
      SELECT 
        NOW() as now,
        NOW() + (120 * INTERVAL '1 second') as plus_120_s,
        (NOW() + (120 * INTERVAL '1 second')) - NOW() as diff_s
    `);
    console.log("\nTest: NOW() + (120 * INTERVAL '1 second')");
    console.log(res2.rows[0]);
    
    const res3 = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'broadcast_schedules' AND column_name = 'duration'
    `);
    console.log("\nSchema for duration:");
    console.log(res3.rows[0]);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

test();
