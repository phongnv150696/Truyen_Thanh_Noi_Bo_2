import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function notificationRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get User Notifications
  fastify.get('/', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      // For now, we fetch all notifications. In a real app, we'd filter by request.user.id
      const { rows } = await client.query(`
        SELECT * FROM notifications 
        ORDER BY created_at DESC 
        LIMIT 50
      `);
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Mark as Read
  fastify.patch('/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = $1 
        RETURNING *
      `, [id]);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Notification not found' });
      }

      return { message: 'Marked as read', notification: rows[0] };
    } finally {
      client.release();
    }
  });

  // 3. Mark All as Read
  fastify.patch('/read-all', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      await client.query('UPDATE notifications SET is_read = TRUE');
      return { message: 'All notifications marked as read' };
    } finally {
      client.release();
    }
  });

  // 4. Get Unread Count
  fastify.get('/unread-count', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT COUNT(*) FROM notifications WHERE is_read = FALSE');
      return { count: parseInt(rows[0].count) };
    } finally {
      client.release();
    }
  });
}
