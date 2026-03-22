import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function deviceRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // Get all devices with unit info
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'commander'])] }, async (request: any, reply) => {
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      let query = `
        SELECT d.*, u.name as unit_name, c.name as channel_name 
        FROM devices d
        LEFT JOIN units u ON d.unit_id = u.id
        LEFT JOIN channels c ON d.channel_id = c.id
        WHERE 1=1
      `;
      const values: any[] = [];
      
      if (user.role_name !== 'admin') {
        query += ` AND d.unit_id = $1`;
        values.push(user.unit_id);
      }
      
      query += ` ORDER BY d.id DESC`;
      
      const { rows } = await client.query(query, values);
      return rows;
    } finally {
      client.release();
    }
  });

  // Add a new device
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'commander'])] }, async (request: any, reply) => {
    const { name, type, ip_address, unit_id, channel_id } = request.body;
    const user = request.user;

    // Security check: Unit Manager can only add devices to their own unit
    if (user.role_name !== 'admin' && parseInt(unit_id) !== user.unit_id) {
      return reply.code(403).send({ error: 'Bạn chỉ có thể thêm thiết bị vào đơn vị của mình.' });
    }

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO devices (name, type, ip_address, unit_id, channel_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [name, type || 'speaker', ip_address, unit_id, channel_id, 'offline']
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // Update a device
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { name, type, ip_address, status, unit_id, channel_id } = request.body;
    const user = request.user;
    
    const client = await fastify.pg.connect();
    try {
      // 1. Verify existence and ownership
      const existing = await client.query('SELECT unit_id FROM devices WHERE id = $1', [id]);
      if (existing.rows.length === 0) return reply.status(404).send({ error: 'Device not found' });
      
      if (user.role_name !== 'admin' && existing.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền sửa thiết bị thuộc đơn vị khác.' });
      }

      const { rows } = await client.query(
        `UPDATE devices 
         SET name = COALESCE($1, name), 
             type = COALESCE($2, type), 
             ip_address = COALESCE($3, ip_address),
             status = COALESCE($4, status),
             unit_id = COALESCE($5, unit_id),
             channel_id = COALESCE($6, channel_id)
         WHERE id = $7 RETURNING *`,
        [name, type, ip_address, status, unit_id, channel_id, id]
      );
      
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
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      // Verify ownership
      const existing = await client.query('SELECT unit_id FROM devices WHERE id = $1', [id]);
      if (existing.rows.length === 0) return reply.status(404).send({ error: 'Device not found' });
      
      if (user.role_name !== 'admin' && existing.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền xóa thiết bị thuộc đơn vị khác.' });
      }

      await client.query('DELETE FROM devices WHERE id = $1', [id]);
      return { success: true };
    } finally {
      client.release();
    }
  });

  // Mock Ping / Health Check
  fastify.post('/:id/ping', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      // Verify ownership
      const existing = await client.query('SELECT unit_id FROM devices WHERE id = $1', [id]);
      if (existing.rows.length === 0) return reply.status(404).send({ error: 'Device not found' });
      
      if (user.role_name !== 'admin' && existing.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền tác động vào thiết bị thuộc đơn vị khác.' });
      }

      const { rows } = await client.query(
        'UPDATE devices SET status = $1, last_seen = NOW() WHERE id = $2 RETURNING *',
        ['online', id]
      );

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
