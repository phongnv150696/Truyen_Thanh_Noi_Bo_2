
import pg from 'pg';
const client = new pg.Pool({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });

async function run() {
  try {
    const triggers = await client.query("SELECT event_object_table as table_name, trigger_name FROM information_schema.triggers WHERE trigger_name LIKE '%protect%'");
    console.log('TRIGGERS:');
    console.log(JSON.stringify(triggers.rows, null, 2));
    
    const fkChecks = await client.query(`
        SELECT
            tc.table_name, 
            kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'units';
    `);
    console.log('FK_TO_UNITS:');
    console.log(JSON.stringify(fkChecks.rows, null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}
run();
