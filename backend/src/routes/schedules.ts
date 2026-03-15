import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function scheduleRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all schedules with channel and content info
  fastify.get('/', async (request, reply) => {
    const query = `
      SELECT 
        s.id, s.scheduled_time, s.duration, s.repeat_pattern, s.is_active,
        c.name as channel_name, c.mount_point,
        ci.title as content_title
      FROM broadcast_schedules s
      LEFT JOIN channels c ON s.channel_id = c.id
      LEFT JOIN content_items ci ON s.content_id = ci.id
      ORDER BY s.scheduled_time ASC
    `;
    const result = await fastify.pg.query(query);
    return result.rows;
  });

  // 2. Create new schedule
  fastify.post('/', async (request: any, reply) => {
    const { channel_id, content_id, scheduled_time, duration, repeat_pattern } = request.body as any;
    
    const query = `
      INSERT INTO broadcast_schedules (channel_id, content_id, scheduled_time, duration, repeat_pattern)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [channel_id, content_id, scheduled_time, duration, repeat_pattern]);
    return result.rows[0];
  });

  // 3. Update schedule
  fastify.patch('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const { scheduled_time, is_active } = request.body as any;
    
    const query = `
      UPDATE broadcast_schedules 
      SET scheduled_time = COALESCE($1, scheduled_time), is_active = COALESCE($2, is_active)
      WHERE id = $3
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [scheduled_time, is_active, id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Schedule not found' });
    }
    return result.rows[0];
  });

  // 4. Delete schedule
  fastify.delete('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const result = await fastify.pg.query('DELETE FROM broadcast_schedules WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Schedule not found' });
    }
    return { message: 'Schedule deleted successfully' };
  });

  // 5. Get AI proposals (Stub)
  fastify.get('/proposals', async (request, reply) => {
    const result = await fastify.pg.query('SELECT * FROM schedule_proposals ORDER BY created_at DESC');
    return result.rows;
  });
}
