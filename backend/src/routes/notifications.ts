import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function notificationRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // Helper to get unit filter
  const getUnitFilter = async (user: any, pg: any) => {
    // Global Admin (Unit 1) sees everything
    if (user.role_name === 'admin' && user.unit_id === 1) {
      return { filter: '', params: [] };
    }
    const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
    const unitIds = await getDescendantUnitIds(pg, user.unit_id);
    return { filter: 'WHERE unit_id = ANY($1)', params: [unitIds] };
  };

  // 1. Get User Notifications (Scoped)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { filter, params } = await getUnitFilter(user, fastify.pg);
      const query = `
        SELECT * FROM notifications 
        ${filter}
        ORDER BY created_at DESC 
        LIMIT 50
      `;
      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Mark as Read (Scoped Check - Optional security)
  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { filter, params } = await getUnitFilter(user, fastify.pg);
      
      // We check if the notification belongs to our scope before marking
      const checkRes = await client.query(`SELECT unit_id FROM notifications WHERE id = $1`, [id]);
      if (checkRes.rowCount === 0) return reply.code(404).send({ error: 'Notification not found' });
      
      const targetUnitId = checkRes.rows[0].unit_id;
      if (filter && !params[0].includes(targetUnitId)) {
        return reply.code(403).send({ error: 'Bạn không có quyền quản lý thông báo này.' });
      }

      const { rows } = await client.query(`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = $1 
        RETURNING *
      `, [id]);

      return { message: 'Marked as read', notification: rows[0] };
    } finally {
      client.release();
    }
  });

  // 3. Mark All as Read (Scoped)
  fastify.patch('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { filter, params } = await getUnitFilter(user, fastify.pg);
      const query = `UPDATE notifications SET is_read = TRUE ${filter}`;
      await client.query(query, params);
      return { message: 'All notifications in your scope marked as read' };
    } finally {
      client.release();
    }
  });

  // 4. Get Unread Count (Scoped)
  fastify.get('/unread-count', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { filter, params } = await getUnitFilter(user, fastify.pg);
      const prefix = filter ? ' AND ' : ' WHERE ';
      const query = `SELECT COUNT(*) FROM notifications ${filter} ${prefix} is_read = FALSE`;
      const { rows } = await client.query(query, params);
      return { count: parseInt(rows[0].count) };
    } finally {
      client.release();
    }
  });
}
