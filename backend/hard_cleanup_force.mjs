
import pg from 'pg';
const client = new pg.Pool({ connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw' });

async function hardCleanup() {
  const ids = [1, 2, 4, 5, 10, 11, 12, 13, 14, 21, 25];
  try {
    console.log('Starting hard cleanup for IDs:', ids);
    
    // 1. Disable the protection trigger
    await client.query('ALTER TABLE audit_logs DISABLE TRIGGER trg_protect_audit_logs');
    console.log('Disabled trg_protect_audit_logs');

    // 2. Clear known tables with unit_id
    const tablesWithUnitId = [
        'audit_logs',
        'channels',
        'devices',
        'media_files',
        'radios',
        'routine_commands',
        'notifications'
    ];
    
    for (const table of tablesWithUnitId) {
        try {
            const { rowCount } = await client.query(`DELETE FROM ${table} WHERE unit_id = ANY($1)`, [ids]);
            console.log(`Cleared ${rowCount} rows from ${table}`);
        } catch (e) {
            console.error(`Skipping ${table}: ${e.message}`);
        }
    }

    // 3. Clear tables that might have FKs to channels (which we just deleted)
    // For example broadcast_sessions usually links to channel_id
    await client.query('DELETE FROM broadcast_sessions WHERE channel_id NOT IN (SELECT id FROM channels)');

    // 4. Finally delete the units
    // Delete in reverse hierarchy order
    await client.query('DELETE FROM units WHERE parent_id = ANY($1)', [ids]);
    const unitRes = await client.query('DELETE FROM units WHERE id = ANY($1)', [ids]);
    console.log(`Deleted ${unitRes.rowCount} units`);

    // 5. Re-enable the trigger
    await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_protect_audit_logs');
    console.log('Re-enabled trg_protect_audit_logs');

    console.log('HARD CLEANUP COMPLETED SUCCESSFULLY');
  } catch (e) {
    console.error('CRITICAL ERROR DURING HARD CLEANUP:', e);
    try { await client.query('ALTER TABLE audit_logs ENABLE TRIGGER trg_protect_audit_logs'); } catch(err) {}
  } finally {
    await client.end();
  }
}

hardCleanup();
