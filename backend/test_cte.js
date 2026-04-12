import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:YourStrongPassword@127.0.0.1:5433/openclaw'
});

async function testCTE() {
    try {
        const query = `
            WITH RECURSIVE unit_hierarchy AS (
                SELECT id FROM units WHERE id = $1
                UNION ALL
                SELECT u.id FROM units u JOIN unit_hierarchy uh ON u.parent_id = uh.id
            )
            SELECT id FROM unit_hierarchy
        `;
        const res = await pool.query(query, [15]); // Testing for Battalion 1 (id 15)
        console.log('Descendant unit IDs:', res.rows.map(r => r.id));
    } catch (err) {
        console.error('CTE Error:', err);
    } finally {
        await pool.end();
    }
}

testCTE();
