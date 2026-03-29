const pg = require('pg');
const connectionString = 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw';
const client = new pg.Client({ connectionString });

async function check() {
  try {
    await client.connect();
    const res = await client.query("SELECT name, url FROM radios");
    console.log("DB_RESULT_START");
    console.log(JSON.stringify(res.rows, null, 2));
    console.log("DB_RESULT_END");
  } catch (err) {
    console.error("DB_ERROR:", err.message);
  } finally {
    await client.end();
  }
}

check();
