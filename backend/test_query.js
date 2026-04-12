import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

async function testQuery() {
  const client = await pool.connect();
  try {
    const query = `
        WITH content_pts AS (
          SELECT COALESCE(ci.unit_id, u.unit_id) as unit_id, COUNT(*) * 10 as pts
          FROM content_items ci
          LEFT JOIN users u ON ci.author_id = u.id
          WHERE ci.status = 'approved'
          GROUP BY COALESCE(ci.unit_id, u.unit_id)
        ),
        broadcast_pts AS (
          SELECT c.unit_id, COUNT(bs.id) * 5 as pts
          FROM broadcast_sessions bs
          JOIN channels c ON bs.channel_id = c.id
          WHERE bs.status = 'completed'
          GROUP BY c.unit_id
        ),
        recording_pts AS (
          SELECT unit_id, COUNT(id) * 2 as pts
          FROM recording_sessions
          WHERE unit_id IS NOT NULL
          GROUP BY unit_id
        )
        SELECT 
          u.id, 
          u.name,
          COALESCE(c.pts, 0) as content_points,
          COALESCE(b.pts, 0) as broadcast_points,
          COALESCE(r.pts, 0) as recording_points,
          (COALESCE(c.pts, 0) + COALESCE(b.pts, 0) + COALESCE(r.pts, 0)) as total_score
        FROM units u
        LEFT JOIN content_pts c ON c.unit_id = u.id
        LEFT JOIN broadcast_pts b ON b.unit_id = u.id
        LEFT JOIN recording_pts r ON r.unit_id = u.id
        ORDER BY total_score DESC
    `;
    const res = await client.query(query);
    console.log('Query Results (count):', res.rowCount);
    console.log('Sample Row:', res.rows[0]);
  } catch (err) {
    console.error('SQL ERROR:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

testQuery();

