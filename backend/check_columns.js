import pg from 'pg';
const { Client } = pg;

async function checkSchema() {
  const client = new Client({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });
  try {
    await client.connect();
    
    console.log('--- Units Table Columns ---');
    const unitCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'units'");
    console.log(unitCols.rows.map(r => r.column_name));

    console.log('\n--- Roles Table Columns ---');
    const roleCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'roles'");
    console.log(roleCols.rows.map(r => r.column_name));

    console.log('\n--- Content Items Table Columns ---');
    const contentCols = await client.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'content_items'");
    console.log(contentCols.rows.map(r => `${r.column_name} (${r.is_nullable})`));

    await client.end();
  } catch (err) {
    console.error(err);
  }
}
checkSchema();
