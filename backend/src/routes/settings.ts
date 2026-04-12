import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function settingsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get All Settings & Metrics (Restricted to Global Admin)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    
    // Only Global Admins (Unit 1) can view/manage global system settings
    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      return reply.code(403).send({ error: 'Bạn không có quyền truy cập cài đặt hệ thống.' });
    }

    const client = await fastify.pg.connect();
    try {
      const [configRes, healthRes] = await Promise.all([
        client.query('SELECT * FROM system_config ORDER BY key ASC'),
        client.query('SELECT * FROM health_metrics ORDER BY recorded_at DESC LIMIT 5')
      ]);
      
      return {
        config: configRes.rows,
        health: healthRes.rows
      };
    } finally {
      client.release();
    }
  });

  // 2. Update Configuration (Restricted to Global Admin)
  fastify.patch('/:key', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: string };

    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      return reply.code(403).send({ error: 'Bạn không có quyền sửa đổi cài đặt hệ thống.' });
    }

    if (value === undefined) {
      return reply.code(400).send({ error: 'Value is required' });
    }

    const client = await fastify.pg.connect();
    try {
      const query = `
        UPDATE system_config 
        SET value = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE key = $2 
        RETURNING *
      `;
      const { rows } = await client.query(query, [value, key]);
      
      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Configuration key not found' });
      }

      return { message: 'Configuration updated successfully', config: rows[0] };
    } finally {
      client.release();
    }
  });

  // 3. Get Health Status (Detailed) - Restricted to Global Admin
  fastify.get('/health', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      return reply.code(403).send({ error: 'Bạn không có quyền xem thông tin sức khỏe hệ thống.' });
    }

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM health_metrics ORDER BY recorded_at DESC LIMIT 10');
      return rows;
    } finally {
      client.release();
    }
  });

  // 4. Get Audit Logs (Scoped by Unit)
  fastify.get('/audit-logs', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const { page = 1, limit = 50, action = '' } = request.query as { page?: number, limit?: number, action?: string };
    
    const offset = (page - 1) * limit;
    const client = await fastify.pg.connect();
    
    try {
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      let unitFilter = '';
      const queryParams: any[] = [];
      const countParams: any[] = [];
      let paramIdx = 1;

      // Scoped Admin Logic
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const descendantUnitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        // Scoped view: Logs belonging to the unit tree.
        unitFilter = ` WHERE a.unit_id = ANY($${paramIdx++})`;
        queryParams.push(descendantUnitIds);
        countParams.push(descendantUnitIds);
      }

      if (action) {
        const actionPrefix = unitFilter ? ' AND ' : ' WHERE ';
        unitFilter += `${actionPrefix}a.action = $${paramIdx++}`;
        queryParams.push(action);
        countParams.push(action);
      }

      const query = `
        SELECT a.*, u.full_name, u.username, ur.name as unit_name
        FROM audit_logs a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN units ur ON u.unit_id = ur.id
        ${unitFilter}
        ORDER BY a.created_at DESC 
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `;

      const countQuery = `
        SELECT COUNT(*) 
        FROM audit_logs a
        JOIN users u ON a.user_id = u.id
        ${unitFilter}
      `;

      queryParams.push(limit, offset);

      const [logsRes, countRes] = await Promise.all([
        client.query(query, queryParams),
        client.query(countQuery, countParams)
      ]);

      return {
        data: logsRes.rows,
        total: parseInt(countRes.rows[0].count),
        page: Number(page),
        limit: Number(limit)
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch audit logs' });
    } finally {
      client.release();
    }
  });
}
