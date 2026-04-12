
import pg from 'pg';
const client = new pg.Pool({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });
async function run() {
  try {
    const res = await client.query("SELECT * FROM roles");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) { console.error(e); }
  finally { await client.end(); }
}
run();
