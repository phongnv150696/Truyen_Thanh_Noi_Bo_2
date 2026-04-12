import { Pool } from 'pg';

/**
 * Fetches all descendant unit IDs (including the root) for a given Unit ID.
 * Returns a list of integers.
 */
export async function getDescendantUnitIds(pg: any, rootUnitId: number): Promise<number[]> {
  const query = `
    WITH RECURSIVE unit_hierarchy AS (
      SELECT id FROM units WHERE id = $1
      UNION ALL
      SELECT u.id FROM units u JOIN unit_hierarchy uh ON u.parent_id = uh.id
    )
    SELECT id FROM unit_hierarchy
  `;
  const { rows } = await pg.query(query, [rootUnitId]);
  return rows.map((r: any) => r.id);
}

/**
 * Fetches all ancestor unit IDs (including the unit itself) for a given Unit ID.
 */
export async function getAncestorUnitIds(pg: any, unitId: number): Promise<number[]> {
  const query = `
    WITH RECURSIVE unit_ancestors AS (
      SELECT id, parent_id FROM units WHERE id = $1
      UNION ALL
      SELECT u.id, u.parent_id FROM units u JOIN unit_ancestors ua ON u.id = ua.parent_id
    )
    SELECT id FROM unit_ancestors
  `;
  const { rows } = await pg.query(query, [unitId]);
  return rows.map((r: any) => r.id);
}
