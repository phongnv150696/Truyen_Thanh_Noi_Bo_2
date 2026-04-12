import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function rbacRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  // 1. Lấy danh sách Ủy quyền của user hiện tại
  fastify.get('/delegations', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    const userId = request.user.id;
    const { rows } = await fastify.pg.query(
      `SELECT d.*, u1.username as delegator_name, u2.username as delegatee_name, r.name as role_name 
       FROM delegations d
       JOIN users u1 ON d.delegator_id = u1.id
       JOIN users u2 ON d.delegatee_id = u2.id
       JOIN roles r ON d.role_id = r.id
       WHERE (d.delegator_id = $1 OR d.delegatee_id = $1)
       ORDER BY d.created_at DESC`,
      [userId]
    );
    return rows;
  });

  // 2. Cấp quyền (Scoped by Unit Hierarchy)
  fastify.post('/delegations', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply: any) => {
    const { delegatee_id, role_id, start_time, end_time } = request.body;
    const delegator = request.user as any;

    if (delegator.id === delegatee_id) {
        return reply.code(400).send({ error: 'Không thể ủy quyền cho chính mình.' });
    }

    // Unit Hierarchy Check for non-admin
    if (delegator.role_name !== 'admin') {
      const { rows: delegateeRows } = await fastify.pg.query('SELECT unit_id FROM users WHERE id = $1', [delegatee_id]);
      if (delegateeRows.length === 0) return reply.code(404).send({ error: 'Người được ủy quyền không tồn tại.' });
      
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      const unitScope = await getDescendantUnitIds(fastify.pg, delegator.unit_id);
      
      if (!unitScope.includes(delegateeRows[0].unit_id)) {
        return reply.code(403).send({ error: 'Bạn chỉ có thể ủy quyền cho nhân sự thuộc đơn vị mình quản lý.' });
      }
    }

    const { rows } = await fastify.pg.query(
      `INSERT INTO delegations (delegator_id, delegatee_id, role_id, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, 'active') RETURNING *`,
      [delegator.id, delegatee_id, role_id, start_time, end_time]
    );
    return rows[0];
  });

  // 3. Thu hồi quyền (Revoke)
  fastify.patch('/delegations/:id/revoke', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    const { id } = request.params;
    const userId = request.user.id;

    const isAdmin = request.user.role_name === 'admin';
    const condition = isAdmin ? 'id = $1' : 'id = $1 AND delegator_id = $2';
    const params = isAdmin ? [id] : [id, userId];

    const { rowCount } = await fastify.pg.query(
      `UPDATE delegations SET status = 'revoked' WHERE ${condition}`,
      params
    );

    if (rowCount === 0) return reply.code(404).send({ error: 'Không tìm thấy hoặc bạn không có quyền thu hồi' });
    return { success: true };
  });

  // 4. Lấy danh sách Permissions thực tế của tài khoản (để UI Frontend vẽ menu)
  fastify.get('/permissions/me', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    const userId = request.user.id;
    
    // Nếu là admin, mặc định full quyền
    if (request.user.role_name === 'admin') {
      const { rows } = await fastify.pg.query(`SELECT code FROM permissions`);
      return rows.map((r: any) => r.code);
    }
    
    // Base role + Delegated roles
    const query = `
      SELECT DISTINCT p.code 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN users u ON u.role_id = rp.role_id
      WHERE u.id = $1
      
      UNION
      
      SELECT DISTINCT p.code 
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN delegations d ON d.role_id = rp.role_id
      WHERE d.delegatee_id = $1 
      AND d.status = 'active'
      AND d.start_time <= CURRENT_TIMESTAMP 
      AND d.end_time >= CURRENT_TIMESTAMP
    `;
    const { rows } = await fastify.pg.query(query, [userId]);
    return rows.map((r: any) => r.code);
  });
}
