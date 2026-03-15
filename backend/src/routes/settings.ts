import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function settingsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get All Settings & Metrics
  fastify.get('/', async (request, reply) => {
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

  // 2. Update Configuration
  fastify.patch('/:key', async (request, reply) => {
    const { key } = request.params as { key: string };
    const { value } = request.body as { value: string };

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
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update configuration' });
    } finally {
      client.release();
    }
  });

  // 3. Get Health Status (Detailed)
  fastify.get('/health', async (request, reply) => {
    // Note: In a real app, this might poll real os metrics
    // For now, we return the latest recorded metrics from DB
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM health_metrics ORDER BY recorded_at DESC LIMIT 10');
      return rows;
    } finally {
      client.release();
    }
  });
}

