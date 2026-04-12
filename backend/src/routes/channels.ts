import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function channelRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all channels (Scoped by Unit)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    
    try {
      let unitFilter = '';
      const params: any[] = [];

      // Only Global Admins (Unit 1) bypass the unit filter
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'WHERE c.unit_id = ANY($1)';
        params.push(unitIds);
      }

      const query = `
        SELECT c.*, u.name as unit_name
        FROM channels c
        LEFT JOIN units u ON c.unit_id = u.id
        ${unitFilter}
        ORDER BY c.name ASC
      `;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  });

  // 2. Update channel status (Scoped)
  fastify.patch('/:id/status', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { status } = request.body as any;
    const user = request.user;
    
    const client = await fastify.pg.connect();
    try {
      // Only Global Admins (Unit 1) bypass ownership verification
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const checkRes = await client.query('SELECT unit_id FROM channels WHERE id = $1', [id]);
        if (checkRes.rowCount === 0) return reply.code(404).send({ error: 'Channel not found' });
        
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(checkRes.rows[0].unit_id)) {
           return reply.code(403).send({ error: 'Bạn không có quyền thay đổi trạng thái kênh của đơn vị khác.' });
        }
      }

      const query = 'UPDATE channels SET status = $1 WHERE id = $2 RETURNING *';
      const result = await client.query(query, [status, id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  });

  // 3. Get all devices for a specific channel (Scoped)
  fastify.get('/:id/devices', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    
    try {
      let unitFilter = '';
      const params = [id];
      // Only Global Admins (Unit 1) bypass device unit filtering
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'AND d.unit_id = ANY($2)';
        params.push(unitIds);
      }

      const query = `
        SELECT d.*, u.name as unit_name
        FROM devices d
        LEFT JOIN units u ON d.unit_id = u.id
        WHERE d.channel_id = $1 ${unitFilter}
        ORDER BY d.name ASC
      `;
      const result = await client.query(query, params);
      return result.rows;
    } finally {
      client.release();
    }
  });

  // 4. Create new channel (Scoped)
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { name, unit_id } = request.body as any;
    const user = request.user as any;
    const client = await fastify.pg.connect();

    try {
      const targetUnitId = unit_id || user.unit_id;
      
      // Ownership check for non-global admins
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(targetUnitId)) {
          return reply.code(403).send({ error: 'Bạn không có quyền tạo kênh cho đơn vị khác.' });
        }
      }

      const query = 'INSERT INTO channels (name, unit_id, status) VALUES ($1, $2, $3) RETURNING *';
      const result = await client.query(query, [name, targetUnitId, 'online']);
      return result.rows[0];
    } finally {
      client.release();
    }
  });

  // 5. Rename channel (Scoped)
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { name } = request.body as any;
    const user = request.user as any;
    const client = await fastify.pg.connect();

    try {
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const checkRes = await client.query('SELECT unit_id FROM channels WHERE id = $1', [id]);
        if (checkRes.rowCount === 0) return reply.code(404).send({ error: 'Channel not found' });
        
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(checkRes.rows[0].unit_id)) {
          return reply.code(403).send({ error: 'Bạn không có quyền sửa kênh của đơn vị khác.' });
        }
      }

      const query = 'UPDATE channels SET name = $1 WHERE id = $2 RETURNING *';
      const result = await client.query(query, [name, id]);
      return result.rows[0];
    } finally {
      client.release();
    }
  });

  // 6. Delete channel (Scoped + Dependency check)
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user as any;
    const client = await fastify.pg.connect();

    try {
      const checkRes = await client.query('SELECT unit_id FROM channels WHERE id = $1', [id]);
      if (checkRes.rowCount === 0) return reply.code(404).send({ error: 'Channel not found' });

      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(checkRes.rows[0].unit_id)) {
          return reply.code(403).send({ error: 'Bạn không có quyền xóa kênh của đơn vị khác.' });
        }
      }

      // Check for assigned devices
      const deviceCheck = await client.query('SELECT 1 FROM devices WHERE channel_id = $1 LIMIT 1', [id]);
      if (deviceCheck.rowCount! > 0) {
        return reply.code(400).send({ error: 'Không thể xóa kênh đang có thiết bị hoạt động. Hãy chuyển thiết bị sang kênh khác trước.' });
      }

      await client.query('DELETE FROM channels WHERE id = $1', [id]);
      return { success: true };
    } finally {
      client.release();
    }
  });
}
