import { Pool } from 'pg';

/**
 * Resolves a unit identifier (ID or Name) to a numeric Unit ID.
 * If the input is a name and it doesn't exist, it creates a new unit.
 */
export async function resolveUnitId(
  pg: any, 
  input: string | number | undefined, 
  parentUnitId: number,
  isAdmin: boolean = false
): Promise<number | null> {
  if (!input) return null;

  // 1. If it's already numeric, return it as ID (Verify it exists)
  const numericId = parseInt(input.toString());
  if (!isNaN(numericId)) {
    const { rowCount } = await pg.query('SELECT id FROM units WHERE id = $1', [numericId]);
    if (rowCount > 0) return numericId;
  }

  // 2. If it's text, search by name WITHIN the user's scope first
  const unitName = input.toString().trim();
  if (!unitName) return null;

  // Search recursively within the parent hierarchy to see if this name exists under us
  const { rows } = await pg.query(`
    WITH RECURSIVE unit_hierarchy AS (
      SELECT id, name FROM units WHERE id = $1
      UNION ALL
      SELECT u.id, u.name FROM units u JOIN unit_hierarchy uh ON u.parent_id = uh.id
    )
    SELECT id FROM unit_hierarchy WHERE name = $2
  `, [parentUnitId, unitName]);

  if (rows.length > 0) {
    return rows[0].id;
  }

  // 3. Not found by ID or Name: Create new unit?
  // Use provided parent, or fallback to Admin's root (1) if they are top-level
  const finalParentId = parentUnitId || (isAdmin ? 1 : null);
  if (!finalParentId) return null;
  
  // Get parent level
  const parentRes = await pg.query('SELECT level FROM units WHERE id = $1', [finalParentId]);
  const parentLevel = parentRes.rows[0]?.level || 1;

  const insertRes = await pg.query(
    'INSERT INTO units (name, parent_id, level) VALUES ($1, $2, $3) RETURNING id',
    [unitName, finalParentId, parentLevel + 1]
  );
  
  return insertRes.rows[0].id;
}
