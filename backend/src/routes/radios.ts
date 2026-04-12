import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import axios from 'axios';

export default async function radioRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all radios (Scoped by Unit)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params: any[] = [];

      // Only the unique System Owner (ID 1) bypasses the unit filter
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'WHERE unit_id = ANY($1)';
        params.push(unitIds);
      }

      const query = `SELECT * FROM radios ${unitFilter} ORDER BY id DESC`;
      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Add a new radio (Scoped)
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { name, url, description, unit_id } = request.body;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      // Automatic unit assignment if not provided
      const finalUnitId = unit_id || user.unit_id;
      
      const { rows } = await client.query(
        'INSERT INTO radios (name, url, description, unit_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, url, description, finalUnitId]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // Delete a radio
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      await client.query('DELETE FROM radios WHERE id = $1', [id]);
      return { success: true };
    } finally {
      client.release();
    }
  });

  // 4. Play a radio station (Scoped)
  fastify.post('/:id/play', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { channel_id } = request.body;
    const user = request.user;
    
    const client = await fastify.pg.connect();
    try {
      const radioRes = await client.query('SELECT * FROM radios WHERE id = $1', [id]);
      if (radioRes.rows.length === 0) return reply.status(404).send({ error: 'Radio not found' });
      
      const radio = radioRes.rows[0];

      // Security check: Only the unique System Owner (ID 1) bypasses unit scoping
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
         const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
         const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
         if (radio.unit_id !== null && !unitIds.includes(radio.unit_id)) {
            return reply.code(403).send({ error: 'Bạn không có quyền phát đài phát thanh của đơn vị khác.' });
         }
      }
      
      // Trigger XiaoZhi Broadcast (Currently global or scoped by device_id)
      // Implementation... (kept legacy)
      try {
        await axios.post('http://127.0.0.1:8003/xiaozhi/broadcast', {
          media_url: radio.url,
          title: `Radio: ${radio.name}`,
          is_emergency: false,
          device_id: "*" 
        });
      } catch (err: any) {
        fastify.log.error(`Failed to trigger XiaoZhi Radio: ${err.message}`);
      }

      fastify.broadcast({
        type: 'broadcast-start',
        content: {
          id: `radio-${radio.id}`,
          title: radio.name,
          file_url: radio.url,
          is_radio: true
        },
        channel_id: channel_id || null
      });

      return { success: true, message: `Đang phát đài ${radio.name}` };
    } finally {
      client.release();
    }
  });

  // Stop broadcasting
  fastify.post('/stop', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    fastify.broadcast({
      type: 'broadcast-stop'
    });
    return { success: true };
  });
}
