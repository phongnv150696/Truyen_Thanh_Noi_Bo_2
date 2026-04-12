
const pg = require('pg');
const { Client } = pg;
require('dotenv').config();

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/openclaw',
  });

  try {
    await client.connect();
    
    console.log('--- notifications ---');
    const notifCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications'");
    console.log(JSON.stringify(notifCols.rows, null, 2));

    console.log('--- audit_logs ---');
    const auditCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_logs'");
    console.log(JSON.stringify(auditCols.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
