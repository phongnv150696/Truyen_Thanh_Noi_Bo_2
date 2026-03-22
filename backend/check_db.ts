import pg from 'pg';
const { Client } = pg;

const client = new Client({ connectionString: 'postgresql://postgres:YourStrongPassword@localhost:5432/openclaw' });

client.connect().then(async () => {
  const r1 = await client.query('SELECT COUNT(*) as cnt FROM broadcast_schedules');
  console.log('Total broadcast_schedules:', r1.rows[0].cnt);

  const r2 = await client.query("SELECT id, title, status FROM content_items ORDER BY id DESC LIMIT 5");
  console.log('Sample content_items:', JSON.stringify(r2.rows));

  const r3 = await client.query("SELECT COUNT(*) as cnt FROM content_items WHERE status IN ('approved','published')");
  console.log('Approved/published content count:', r3.rows[0].cnt);

  const r4 = await client.query(`
    SELECT bs.id, bs.scheduled_time, ci.title, ci.status 
    FROM broadcast_schedules bs 
    JOIN content_items ci ON bs.content_id = ci.id LIMIT 3
  `);
  console.log('Joined schedules:', JSON.stringify(r4.rows));

  await client.end();
}).catch(async (e) => {
  console.error('DB Error:', e.message);
  await client.end();
});
