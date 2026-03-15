import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function channelRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all channels
  fastify.get('/', async (request, reply) => {
    const query = `
      SELECT c.*, u.name as unit_name
      FROM channels c
      LEFT JOIN units u ON c.unit_id = u.id
      ORDER BY c.name ASC
    `;
    const result = await fastify.pg.query(query);
    return result.rows;
  });

  // 2. Update channel status
  fastify.patch('/:id/status', async (request: any, reply) => {
    const { id } = request.params;
    const { status } = request.body as any;
    
    const query = `
      UPDATE channels 
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [status, id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Channel not found' });
    }
    return result.rows[0];
  });
}
