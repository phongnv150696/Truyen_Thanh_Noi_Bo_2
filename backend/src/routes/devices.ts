import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function deviceRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // Get all devices with unit info
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request, reply) => {
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
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request: any, reply) => {
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

      // Broadcast update via WebSocket
      fastify.broadcast({
        type: 'device_status_update',
        device: rows[0]
      });

      return rows[0];
    } finally {
      client.release();
    }
  });

  // Delete a device
  fastify.delete('/:id', async (request: any, reply) => {
    const { id } = request.params;
    console.log(`[BACKEND] Attempting to delete device ID: ${id}`);
    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('DELETE FROM devices WHERE id = $1', [id]);
      console.log(`[BACKEND] Delete result for ID ${id}: rowCount=${rowCount}`);
      if (rowCount === 0) {
        return reply.status(404).send({ error: 'Device not found' });
      }
      return { success: true };
    } catch (err) {
      console.error(`[BACKEND] Error deleting device ID ${id}:`, err);
      return reply.status(500).send({ error: 'Database error' });
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

      // Broadcast update via WebSocket
      fastify.broadcast({
        type: 'device_status_update',
        device: rows[0]
      });

      return rows[0];
    } finally {
      client.release();
    }
  });
  
  // Bulk delete devices
  fastify.post('/bulk-delete', async (request: any, reply) => {
    const { ids } = request.body as { ids: number[] };
    if (!ids || !ids.length) {
      return reply.code(400).send({ error: 'No IDs provided' });
    }

    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('DELETE FROM devices WHERE id = ANY($1)', [ids]);
      return { message: `${rowCount} devices deleted successfully` };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete devices' });
    } finally {
      client.release();
    }
  });
}
