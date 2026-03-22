const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://postgres:postgres@localhost:5433/postgres"
});

async function debug() {
  await client.connect();
  console.log('--- DEBUG PLAY-ALL LOGIC ---');
  
  const now = new Date();
  console.log('Local Server Time:', now.toString());
  
  // 1. Check current date from DB
  const dbDate = await client.query('SELECT CURRENT_DATE as date, NOW() as now, EXTRACT(DOW FROM CURRENT_DATE) as dow');
  console.log('DB Current Date:', dbDate.rows[0].date);
  console.log('DB Timestamp:', dbDate.rows[0].now);
  console.log('DB Day of Week (0=Sun):', dbDate.rows[0].dow);

  // 2. List all active schedules for TODAY
  const query = `
    SELECT s.id, s.content_id, ci.title, s.scheduled_time, s.repeat_pattern, s.channel_id, c.name as channel_name
    FROM broadcast_schedules s
    JOIN content_items ci ON s.content_id = ci.id
    JOIN channels c ON s.channel_id = c.id
    WHERE s.is_active = true
      AND (
        s.scheduled_time::date = CURRENT_DATE 
        OR s.repeat_pattern = 'daily'
        OR (s.repeat_pattern = 'weekly' AND EXTRACT(DOW FROM s.scheduled_time) = EXTRACT(DOW FROM CURRENT_DATE))
      )
  `;
  const result = await client.query(query);
  console.log(`Found ${result.rowCount} matchable schedules for today:`);
  result.rows.forEach(r => {
    console.log(`- ID: ${r.id}, Content: ${r.title}, Time: ${r.scheduled_time}, Repeat: ${r.repeat_pattern}, Channel: ${r.channel_name}`);
  });

  // 3. Check if there are ANY schedules at all
  if (result.rowCount === 0) {
    console.log('\nNO MATCHES FOUND. Checking all schedules:');
    const all = await client.query('SELECT s.id, s.content_id, s.scheduled_time, s.repeat_pattern FROM broadcast_schedules s LIMIT 10');
    all.rows.forEach(r => {
      console.log(`- ID: ${r.id}, ContentID: ${r.content_id}, Time: ${r.scheduled_time}, Repeat: ${r.repeat_pattern}`);
    });
  }

  await client.end();
}

debug();
