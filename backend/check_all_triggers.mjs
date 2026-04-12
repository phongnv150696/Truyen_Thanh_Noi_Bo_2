
import pg from 'pg';
const client = new pg.Pool({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });
async function run() {
  try {
    const res = await client.query("SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%protect%'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (e) { console.error(e); }
  finally { await client.end(); }
}
run();
