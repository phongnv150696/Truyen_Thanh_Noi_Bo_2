
import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    
    const tables = ['notifications', 'audit_logs'];
    for (const table of tables) {
        console.log(`--- ${table} ---`);
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = $1
        `, [table]);
        console.log(JSON.stringify(res.rows, null, 2));
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
