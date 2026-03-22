const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw"
});

async function findContent() {
  await client.connect();
  const res = await client.query("SELECT id, title, status FROM content_items WHERE title LIKE '%Trần Minh Đức%'");
  console.log('--- CONTENT ITEMS ---');
  res.rows.forEach(r => console.log(`ID: ${r.id}, Title: ${r.title}, Status: ${r.status}`));
  
  if (res.rows.length > 0) {
    const cid = res.rows[0].id;
    const mf = await client.query("SELECT * FROM media_files WHERE content_id = $1", [cid]);
    console.log('\n--- MEDIA FILES ---');
    mf.rows.forEach(r => console.log(`ID: ${r.id}, Path: ${r.file_path}, Name: ${r.file_name}`));
  
    const sch = await client.query("SELECT * FROM broadcast_schedules WHERE content_id = $1", [cid]);
    console.log('\n--- SCHEDULES ---');
    sch.rows.forEach(r => console.log(`ID: ${r.id}, Time: ${r.scheduled_time}, Channel: ${r.channel_id}`));
  }
  
  await client.end();
}

findContent();
