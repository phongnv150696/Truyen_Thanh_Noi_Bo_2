import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function deviceRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // Get all devices with unit info
  fastify.get('/', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(`
        SELECT d.*, u.name as unit_name 
        FROM devices d
        LEFT JOIN units u ON d.unit_id = u.id
        ORDER BY d.id DESC
      `);
      return rows;
    } finally {
      client.release();
    }
  });

  // Add a new device
  fastify.post('/', async (request: any, reply) => {
    const { name, type, ip_address, unit_id } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO devices (name, type, ip_address, unit_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, type || 'speaker', ip_address, unit_id, 'offline']
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // Update a device
  fastify.patch('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const { name, type, ip_address, status, unit_id } = request.body;
    
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        `UPDATE devices 
         SET name = COALESCE($1, name), 
             type = COALESCE($2, type), 
             ip_address = COALESCE($3, ip_address),
             status = COALESCE($4, status),
             unit_id = COALESCE($5, unit_id)
         WHERE id = $6 RETURNING *`,
        [name, type, ip_address, status, unit_id, id]
      );
      
      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Device not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });

  // Delete a device
  fastify.delete('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('DELETE FROM devices WHERE id = $1', [id]);
      if (rowCount === 0) {
        return reply.status(404).send({ error: 'Device not found' });
      }
      return { success: true };
    } finally {
      client.release();
    }
  });

  // Mock Ping / Health Check
  fastify.post('/:id/ping', async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'UPDATE devices SET status = $1, last_seen = NOW() WHERE id = $2 RETURNING *',
        ['online', id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Device not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });
}
