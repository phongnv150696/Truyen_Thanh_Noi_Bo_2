import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import bcrypt from 'bcrypt';

export default async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all users (Scoped by Unit)
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request, reply) => {
    const user = request.user as any;
    let unitFilter = '';
    let params: any[] = [];

    // Only the unique Root Admin (ID 1) can bypass unit scoping completely
    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      // Fetch fresh unit_id from DB to avoid stale JWT
      const userRes = await fastify.pg.query('SELECT unit_id FROM users WHERE id = $1', [user.id]);
      const currentUnitId = userRes.rows[0]?.unit_id || user.unit_id;

      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      const unitIds = await getDescendantUnitIds(fastify.pg, currentUnitId);
      unitFilter = 'WHERE u.unit_id = ANY($1)';
      params = [unitIds];
    }

    const query = `
      SELECT 
        u.id, u.username, u.full_name, u.rank, u.position, u.email, 
        u.phone, u.identity_card, u.home_address, u.unit_address,
        u.created_at, u.unit_id, u.role_id,
        r.name as role_name, r.description as role_description,
        un.name as unit_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN units un ON u.unit_id = un.id
      ${unitFilter}
      ORDER BY u.created_at DESC
    `;
    const result = await fastify.pg.query(query, params);
    return result.rows;
  });

  // 3. Get units (Scoped by Unit)
  fastify.get('/units', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params: any[] = [];

      // Only the ultimate Root Admin (ID 1) can bypass all unit scoping.
      // Other admins/managers are scoped to their assigned unit and its descendants.
      if (user && user.id !== 1) {
        // Fetch fresh unit_id from DB
        const userRes = await client.query('SELECT unit_id FROM users WHERE id = $1', [user.id]);
        const currentUnitId = userRes.rows[0]?.unit_id || user.unit_id;

        const { getDescendantUnitIds, getAncestorUnitIds } = await import('../utils/unit_utils.js');
        const scope = (request.query as any).scope;
        
        let combinedIds: number[] = [];
        if (scope === 'all_visible') {
          // Keep ancestor support only for specific hierarchical views if needed
          const [descendants, ancestors] = await Promise.all([
            getDescendantUnitIds(fastify.pg, currentUnitId),
            getAncestorUnitIds(fastify.pg, currentUnitId)
          ]);
          combinedIds = Array.from(new Set([...descendants, ...ancestors]));
        } else {
          // Default: Strict organizational scoping (Self + Descendants)
          // This ensures a Level 2 user only sees their unit and children, NOT Level 1.
          combinedIds = await getDescendantUnitIds(fastify.pg, currentUnitId);
        }

        unitFilter = 'WHERE id = ANY($1)';
        params.push(combinedIds);
      }

      // Filter out units with level 99 (Archive) by default for everyone
      if (unitFilter) {
        unitFilter += ' AND level < 99';
      } else {
        unitFilter = 'WHERE level < 99';
      }

      const query = `SELECT * FROM units ${unitFilter} ORDER BY level, name`;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  });

  // 3.5 Create user directly
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request: any, reply) => {
    const { 
      username, password, full_name, rank, position, email, role_id, unit_id, parent_unit_id,
      phone, identity_card, home_address, unit_address 
    } = request.body;
    const user = request.user as any;
    const { resolveUnitId } = await import('../utils/unit_resolver.js');

    try {
      const effectiveParentId = parent_unit_id ? parseInt(parent_unit_id) : user.unit_id;
      const resolvedUnitId = await resolveUnitId(fastify.pg, unit_id, effectiveParentId, user.role_name === 'admin');
      if (!resolvedUnitId) return reply.code(400).send({ error: 'Đơn vị không hợp lệ.' });

      const targetUnitId = resolvedUnitId;
      const targetRoleId = parseInt(role_id || 5);

      // Security check: Local managers/admins cannot bypass hierarchy
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        if (targetRoleId === 1) return reply.code(403).send({ error: 'Bạn không có quyền tạo tài khoản quản trị viên hệ thống.' });
        
        // Fetch fresh user data to avoid stale JWT claims
        const userRes = await fastify.pg.query('SELECT unit_id FROM users WHERE id = $1', [user.id]);
        const currentUnitId = userRes.rows[0]?.unit_id;

        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, currentUnitId);
        
        // Ensure numbers are compared correctly
        if (!unitIds.map(Number).includes(Number(targetUnitId))) {
          return reply.code(403).send({ error: 'Bạn chỉ có thể tạo nhân sự thuộc phạm vi quản lý của mình.' });
        }
      }

      const password_hash = await bcrypt.hash(password, 10);
      const query = `
        INSERT INTO users (username, password_hash, full_name, rank, position, email, role_id, unit_id, phone, identity_card, home_address, unit_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id, username, full_name
      `;
      const result = await fastify.pg.query(query, [
        username, password_hash, full_name || '', rank || '', position || '', email || '', 
        targetRoleId, targetUnitId, phone || '', identity_card || '', home_address || '', unit_address || ''
      ]);
      return result.rows[0];
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 4. Update user
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { role_id, unit_id, parent_unit_id, full_name, rank, position, email, phone, identity_card, home_address, unit_address } = request.body as any;
    const user = request.user as any;

    try {
      const { resolveUnitId } = await import('../utils/unit_resolver.js');
      let targetUnitId = unit_id;
      
      if (unit_id) {
        const effectiveParentId = parent_unit_id ? parseInt(parent_unit_id) : user.unit_id;
        const resolved = await resolveUnitId(fastify.pg, unit_id, effectiveParentId, user.role_name === 'admin');
        if (!resolved) return reply.code(400).send({ error: 'Đơn vị không hợp lệ.' });
        targetUnitId = resolved;
      }

      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        if (role_id && parseInt(role_id) === 1) return reply.code(403).send({ error: 'Bạn không có quyền gán vai trò quản trị viên.' });
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (targetUnitId && !unitIds.map(Number).includes(Number(targetUnitId))) {
          return reply.code(403).send({ error: 'Bạn không có quyền chuyển nhân sự sang đơn vị ngoài phạm vi quản lý.' });
        }
      }

      const query = `
        UPDATE users 
        SET 
          role_id = COALESCE($1, role_id), 
          unit_id = COALESCE($2, unit_id),
          full_name = COALESCE($3, full_name),
          rank = COALESCE($4, rank),
          position = COALESCE($5, position),
          email = COALESCE($6, email),
          phone = COALESCE($7, phone),
          identity_card = COALESCE($8, identity_card),
          home_address = COALESCE($9, home_address),
          unit_address = COALESCE($10, unit_address)
        WHERE id = $11 RETURNING *
      `;
      const result = await fastify.pg.query(query, [
        role_id, targetUnitId, full_name, rank, position, email, phone, identity_card, home_address, unit_address, id
      ]);
      return result.rows[0];
    } catch (err) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 5. Delete single user
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user as any;

    if (parseInt(id) === user.id) return reply.code(400).send({ error: 'Bạn không thể tự xóa tài khoản của mình.' });

    try {
      // Permission check
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        const targetRes = await fastify.pg.query('SELECT unit_id FROM users WHERE id = $1', [id]);
        if (!targetRes.rows[0] || !unitIds.map(Number).includes(Number(targetRes.rows[0].unit_id))) {
          return reply.code(403).send({ error: 'Bạn không có quyền xóa nhân sự này.' });
        }
      }

      const client = await fastify.pg.connect();
      try {
        await client.query('BEGIN');
        
        // 1. Detach authored content (Set author to NULL/System)
        await client.query('UPDATE content_items SET author_id = NULL WHERE author_id = $1', [id]);
        
        // 2. Cleanup delegations (RBAC)
        await client.query('DELETE FROM delegations WHERE delegator_id = $1 OR delegatee_id = $1', [id]);

        // 3. Detach alert_messages sender
        await client.query('UPDATE alert_messages SET sender_id = NULL WHERE sender_id = $1', [id]);

        // 4. Detach user_registrations approver
        await client.query('UPDATE user_registrations SET approved_by = NULL WHERE approved_by = $1', [id]);

        // 5. Delete the user
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        return { message: 'Đã xóa nhân sự thành công.' };
      } catch (err) {
        await client.query('ROLLBACK');
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Internal server error' });
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 5.1 Bulk delete users (Transaction-based)
  fastify.post('/bulk-delete', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request: any, reply: any) => {
    const { ids } = request.body;
    const user = request.user as any;
    if (!Array.isArray(ids) || ids.length === 0) return reply.code(400).send({ error: 'Danh sách ID không hợp lệ.' });

    // Filter out current user from deletion list
    const targetIds = ids.map(Number).filter(id => id !== user.id);
    if (targetIds.length === 0) return reply.code(400).send({ error: 'Bạn không thể tự xóa tài khoản của mình.' });

    const client = await fastify.pg.connect();
    try {
      // Permission check for all IDs
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        const placeholders = targetIds.map((_, i) => `$${i + 1}`).join(',');
        const checkRes = await client.query(`SELECT unit_id FROM users WHERE id IN (${placeholders})`, targetIds);
        const unauthorized = checkRes.rows.some(r => !unitIds.map(Number).includes(Number(r.unit_id)));
        if (unauthorized) return reply.code(403).send({ error: 'Danh sách chọn chứa nhân sự ngoài phạm vi quản lý của bạn.' });
      }

      await client.query('BEGIN');
      
      const placeholders = targetIds.map((_, i) => `$${i + 1}`).join(',');
      
      // 1. Detach authored content
      await client.query(`UPDATE content_items SET author_id = NULL WHERE author_id IN (${placeholders})`, targetIds);
      
      // 2. Cleanup delegations (RBAC)
      await client.query(`DELETE FROM delegations WHERE delegator_id IN (${placeholders}) OR delegatee_id IN (${placeholders})`, targetIds);

      // 3. Detach alert_messages sender
      await client.query(`UPDATE alert_messages SET sender_id = NULL WHERE sender_id IN (${placeholders})`, targetIds);

      // 4. Detach user_registrations approver
      await client.query(`UPDATE user_registrations SET approved_by = NULL WHERE approved_by IN (${placeholders})`, targetIds);

      // 5. Delete the users
      await client.query(`DELETE FROM users WHERE id IN (${placeholders})`, targetIds);
      
      await client.query('COMMIT');
      return { message: `Đã xóa ${targetIds.length} nhân sự thành công.` };
    } catch (err) {
      await client.query('ROLLBACK');
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // 6. List pending registrations
  fastify.get('/registrations', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request, reply) => {
    const user = request.user as any;
    let unitFilter = "WHERE ur.status = 'pending'";
    let params: any[] = [];

    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
      unitFilter += ' AND ur.unit_id = ANY($1)';
      params = [unitIds];
    }

    const query = `SELECT ur.*, un.name as unit_name FROM user_registrations ur LEFT JOIN units un ON ur.unit_id = un.id ${unitFilter} ORDER BY ur.created_at DESC`;
    const result = await fastify.pg.query(query, params);
    return result.rows;
  });

  // 7. Approve registration
  fastify.post('/registrations/:id/approve', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { role_id, unit_id, parent_unit_id } = request.body as any;
    const user = request.user as any;

    try {
      const { resolveUnitId } = await import('../utils/unit_resolver.js');
      const regResult = await fastify.pg.query('SELECT * FROM user_registrations WHERE id = $1', [id]);
      const reg = regResult.rows[0];

      let targetUnitId = reg.unit_id;
      if (unit_id) {
        const effectiveParentId = parent_unit_id ? parseInt(parent_unit_id) : user.unit_id;
        const resolved = await resolveUnitId(fastify.pg, unit_id, effectiveParentId, user.role_name === 'admin');
        if (!resolved) return reply.code(400).send({ error: 'Đơn vị không hợp lệ.' });
        targetUnitId = resolved;
      }
      
      const targetRoleId = parseInt(role_id || 5);

      if (!(user.role_name === 'admin' && user.unit_id === 1)) {
        if (targetRoleId === 1) return reply.code(403).send({ error: 'Bạn không có quyền phê duyệt cấp quản trị viên.' });
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(targetUnitId)) return reply.code(403).send({ error: 'Bạn không có quyền phê duyệt nhân sự cho đơn vị ngoài phạm vi quản lý.' });
      }

      await fastify.pg.query("UPDATE user_registrations SET status = 'approved', role_id = $1, unit_id = $2 WHERE id = $3", [targetRoleId, targetUnitId, id]);
      return { message: 'User approved' };
    } catch (error: any) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Export roles for reference
  fastify.get('/roles', async (request, reply) => {
    const result = await fastify.pg.query('SELECT * FROM roles ORDER BY id');
    return result.rows;
  });
}
