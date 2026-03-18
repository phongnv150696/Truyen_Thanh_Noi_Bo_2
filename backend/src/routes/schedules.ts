import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function scheduleRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all schedules with channel and content info
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request, reply) => {
    const query = `
      SELECT 
        s.id, s.scheduled_time, s.duration, s.repeat_pattern, s.is_active,
        s.channel_id, s.content_id,
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
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request: any, reply) => {
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
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { channel_id, content_id, scheduled_time, duration, repeat_pattern, is_active } = request.body as any;
    
    const query = `
      UPDATE broadcast_schedules 
      SET 
        channel_id = COALESCE($1, channel_id),
        content_id = COALESCE($2, content_id),
        scheduled_time = COALESCE($3, scheduled_time),
        duration = COALESCE($4, duration),
        repeat_pattern = COALESCE($5, repeat_pattern),
        is_active = COALESCE($6, is_active)
      WHERE id = $7
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [channel_id, content_id, scheduled_time, duration, repeat_pattern, is_active, id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Schedule not found' });
    }
    return result.rows[0];
  });

  // 4. Play Now (Force schedule to current time)
  fastify.post('/:id/play', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const now = new Date().toISOString();
    
    // Update scheduled_time to now and ensure it's active
    const query = `
      UPDATE broadcast_schedules 
      SET scheduled_time = $1, is_active = true
      WHERE id = $2
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [now, id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'Schedule not found' });
    }
    
    // In a real system, you'd trigger the broadcast engine here
    fastify.log.info(`Immediate broadcast triggered for schedule ${id}`);
    
    return { message: 'Broadcast triggered successfully', schedule: result.rows[0] };
  });

  // 5. Delete schedule
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request: any, reply) => {
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

  // 5. Bulk delete
  fastify.post('/bulk-delete', async (request: any, reply) => {
    const { ids } = request.body as { ids: number[] };
    if (!ids || !ids.length) {
      return reply.code(400).send({ error: 'No IDs provided' });
    }

    try {
      const result = await fastify.pg.query('DELETE FROM broadcast_schedules WHERE id = ANY($1)', [ids]);
      return { message: `${result.rowCount} schedules deleted successfully` };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 6. Emergency Mode Routes
  
  // 6.1 Get Emergency Status
  fastify.get('/emergency/status', async (request, reply) => {
    const result = await fastify.pg.query("SELECT value FROM system_config WHERE key = 'emergency_mode'");
    if (result.rowCount === 0) {
      return { active: false };
    }
    return { active: result.rows[0].value === 'true' };
  });

  // 6.2 Trigger Emergency
  fastify.post('/emergency', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'commander', 'technician'])] }, async (request: any, reply) => {
    try {
      // Upsert emergency_mode = true
      await fastify.pg.query(`
        INSERT INTO system_config (key, value, description) 
        VALUES ('emergency_mode', 'true', 'Trạng thái phát báo động khẩn cấp')
        ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = CURRENT_TIMESTAMP
      `);

      // Log to audit_logs
      await fastify.pg.query(`
        INSERT INTO audit_logs (user_id, action, target_table, details)
        VALUES ($1, 'EMERGENCY_TRIGGERED', 'system_config', '{"status": "active"}')
      `, [request.user.id]);

      // Create a global notification
      await fastify.pg.query(`
        INSERT INTO notifications (title, message, type)
        VALUES ('CẢNH BÁO KHẨN CẤP', 'Hệ thống đang thực hiện phát báo động khẩn cấp toàn đơn vị!', 'error')
      `);

      // Broadcast via WebSocket
      fastify.broadcast({
        type: 'emergency_status_change',
        active: true
      });

      return { message: 'Emergency mode activated' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to activate emergency mode' });
    }
  });

  // 6.3 Stop Emergency
  fastify.post('/emergency/stop', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'commander', 'technician'])] }, async (request: any, reply) => {
    try {
      await fastify.pg.query("UPDATE system_config SET value = 'false', updated_at = CURRENT_TIMESTAMP WHERE key = 'emergency_mode'");
      
      // Log to audit_logs
      await fastify.pg.query(`
        INSERT INTO audit_logs (user_id, action, target_table, details)
        VALUES ($1, 'EMERGENCY_STOPPED', 'system_config', '{"status": "inactive"}')
      `, [request.user.id]);

      // Broadcast via WebSocket
      fastify.broadcast({
        type: 'emergency_status_change',
        active: false
      });

      return { message: 'Emergency mode deactivated' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to deactivate emergency mode' });
    }
  });
}
