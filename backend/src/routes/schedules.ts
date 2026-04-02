import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getFullURL } from '../utils/url.js';

export default async function scheduleRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all schedules (flat list) - with fallback for missing columns
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander', 'commander', 'editor'])] }, async (request, reply) => {
    const user = request.user as any;
    try {
      // Try full query first (with triggered_at and created_by)
      let query = `
        SELECT 
          s.id, s.scheduled_time, s.duration, s.repeat_pattern, s.is_active,
          s.channel_id, s.content_id, s.radio_id,
          s.triggered_at,
          c.name as channel_name, c.mount_point,
          ci.title as content_title,
          u.full_name as author_name,
          r.name as radio_name,
          (EXISTS (SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id) OR s.radio_id IS NOT NULL) as has_audio
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        LEFT JOIN content_items ci ON s.content_id = ci.id
        LEFT JOIN radios r ON s.radio_id = r.id
        LEFT JOIN users u ON ci.author_id = u.id
        WHERE 1=1
      `;
      const values: any[] = [];
      if (user.role_name !== 'admin') {
        query += ` AND c.unit_id = $1`;
        values.push(user.unit_id);
      }
      query += ` ORDER BY s.scheduled_time ASC`;
      const result = await fastify.pg.query(query, values);
      fastify.log.info(`GET /schedules returning ${result.rows.length} rows (full query)`);
      return result.rows;
    } catch (err1: any) {
      fastify.log.warn(`Full query failed: ${err1.message}, trying fallback...`);
      try {
        // Fallback: simpler query without triggered_at and created_by
        const fallback = `
          SELECT 
            s.id, s.scheduled_time, s.duration, s.repeat_pattern, s.is_active,
            s.channel_id, s.content_id,
            NULL as triggered_at,
            c.name as channel_name, c.mount_point,
            ci.title as content_title,
            u.full_name as author_name,
            (EXISTS (SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id) OR s.radio_id IS NOT NULL) as has_audio
          FROM broadcast_schedules s
          LEFT JOIN channels c ON s.channel_id = c.id
          LEFT JOIN content_items ci ON s.content_id = ci.id
          LEFT JOIN users u ON ci.author_id = u.id
          ORDER BY s.scheduled_time ASC
        `;
        const result = await fastify.pg.query(fallback);
        fastify.log.info(`GET /schedules returning ${result.rows.length} rows (fallback query)`);
        return result.rows;
      } catch (err2: any) {
        fastify.log.error(`Fallback query also failed: ${err2.message}`);
        return reply.code(500).send({ error: `Lỗi DB: ${err2.message}` });
      }
    }
  });

  // 1b. Get schedules GROUPED by content item (for new UI)
  // Returns each content item once, with all its schedules (channels + timeslots) nested inside
  fastify.get('/grouped', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster'])] }, async (request, reply) => {
    const user = request.user as any;
    let query = `
      SELECT 
        s.id as schedule_id,
        s.scheduled_time, s.duration, s.repeat_pattern, s.is_active,
        s.channel_id, s.content_id, s.radio_id, s.triggered_at,
        c.name as channel_name, c.mount_point,
        ci.title as content_title, ci.id as content_item_id,
        r.name as radio_name, r.id as radio_id_from_table,
        u.full_name as author_name,
        EXISTS (SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id) as has_audio,
        CASE 
          WHEN s.triggered_at IS NOT NULL THEN 'played'
          WHEN s.scheduled_time <= NOW() THEN 'overdue'
          ELSE 'pending'
        END as play_status
      FROM broadcast_schedules s
      LEFT JOIN channels c ON s.channel_id = c.id
      LEFT JOIN content_items ci ON s.content_id = ci.id
      LEFT JOIN radios r ON s.radio_id = r.id
      LEFT JOIN users u ON ci.author_id = u.id
      WHERE (ci.status IN ('approved', 'published') OR s.radio_id IS NOT NULL)
    `;
    const values: any[] = [];
    if (user.role_name !== 'admin') {
      query += ` AND c.unit_id = $1`;
      values.push(user.unit_id);
    }
    query += ` ORDER BY ci.id, s.scheduled_time ASC`;
    const result = await fastify.pg.query(query, values);

    // Group by content item on the server side
    const groupedMap = new Map<number, any>();
    for (const row of result.rows) {
      if (!groupedMap.has(row.content_item_id)) {
        groupedMap.set(row.content_item_id, {
          content_id: row.content_item_id,
          radio_id: row.radio_id,
          content_title: row.radio_name ? `Radio: ${row.radio_name}` : row.content_title,
          author_name: row.author_name || 'Hệ thống',
          has_audio: row.has_audio || !!row.radio_id,
          schedules: []
        });
      }
      groupedMap.get(row.content_item_id).schedules.push({
        schedule_id: row.schedule_id,
        scheduled_time: row.scheduled_time,
        channel_id: row.channel_id,
        channel_name: row.channel_name,
        mount_point: row.mount_point,
        duration: row.duration,
        repeat_pattern: row.repeat_pattern,
        is_active: row.is_active,
        triggered_at: row.triggered_at,
        play_status: row.play_status
      });
    }

    return Array.from(groupedMap.values());
  });

  // 2. Create new schedule (also used by popup "+ Thêm giờ phát")
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander'])] }, async (request: any, reply) => {
    const { channel_id, content_id, radio_id, scheduled_time, duration, repeat_pattern } = request.body as any;
    const user = request.user;
    
    if (!channel_id || (!content_id && !radio_id) || !scheduled_time) {
      return reply.code(400).send({ error: 'channel_id, (content_id hoặc radio_id) và scheduled_time là bắt buộc' });
    }

    // Security Check: Ensure channel belongs to user's unit
    if (user.role_name !== 'admin') {
      const chan = await fastify.pg.query('SELECT unit_id FROM channels WHERE id = $1', [channel_id]);
      if (chan.rows.length === 0 || chan.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền lập lịch cho kênh này.' });
      }
    }

    const query = `
      INSERT INTO broadcast_schedules (channel_id, content_id, radio_id, scheduled_time, duration, repeat_pattern)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [channel_id, content_id || null, radio_id || null, scheduled_time, duration || null, repeat_pattern || 'none']);
    
    // ... rest of the code ...

    // Return with channel name for immediate UI update
    const enriched = await fastify.pg.query(`
      SELECT 
        s.*, c.name as channel_name, r.name as radio_name,
        CASE 
          WHEN s.triggered_at IS NOT NULL THEN 'played'
          WHEN s.scheduled_time <= NOW() THEN 'overdue'
          ELSE 'pending'
        END as play_status
      FROM broadcast_schedules s
      LEFT JOIN channels c ON s.channel_id = c.id
      LEFT JOIN radios r ON s.radio_id = r.id
      WHERE s.id = $1
    `, [result.rows[0].id]);

    return reply.code(201).send(enriched.rows[0]);
  });

  // 3. Update schedule
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { channel_id, content_id, radio_id, scheduled_time, duration, repeat_pattern, is_active } = request.body as any;
    const user = request.user;

    const client = await fastify.pg.connect();
    try {
      // Security Check: Verify ownership
      const existing = await client.query(`
        SELECT s.id, c.unit_id 
        FROM broadcast_schedules s
        JOIN channels c ON s.channel_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (existing.rows.length === 0) return reply.code(404).send({ error: 'Schedule not found' });
      if (user.role_name !== 'admin' && existing.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền sửa lịch phát của đơn vị khác.' });
      }

      const query = `
        UPDATE broadcast_schedules 
        SET 
          channel_id = COALESCE($1, channel_id),
          content_id = CASE WHEN $2::integer IS NOT NULL THEN $2 ELSE content_id END,
          radio_id = CASE WHEN $3::integer IS NOT NULL THEN $3 ELSE radio_id END,
          scheduled_time = COALESCE($4, scheduled_time),
          duration = COALESCE($5, duration),
          repeat_pattern = COALESCE($6, repeat_pattern),
          is_active = COALESCE($7, is_active),
          triggered_at = NULL,
          stopped_at = NULL
        WHERE id = $8
        RETURNING *
      `;
      const result = await client.query(query, [
        channel_id || null, 
        (content_id === undefined || content_id === null) ? null : content_id, 
        (radio_id === undefined || radio_id === null) ? null : radio_id, 
        scheduled_time || null, 
        duration || null, 
        repeat_pattern || null, 
        is_active === undefined ? null : is_active, 
        id
      ]);
      return result.rows[0];
    } finally {
      client.release();
    }
  });

  // 4. Play Now (Force schedule to current time)
  fastify.post('/:id/play', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    
    const client = await fastify.pg.connect();
    try {
      // Security Check: Verify ownership
      const existing = await client.query(`
        SELECT s.id, c.unit_id 
        FROM broadcast_schedules s
        JOIN channels c ON s.channel_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (existing.rows.length === 0) return reply.code(404).send({ error: 'Schedule not found' });
      if (user.role_name !== 'admin' && existing.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền phát lệnh của đơn vị khác.' });
      }

      // Update triggered_at to now and ensure it's active
      const updateResult = await client.query(`
        UPDATE broadcast_schedules 
        SET is_active = true, triggered_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      // Get broadcast info for WebSocket trigger
      const queryInfo = `
        SELECT 
          s.id, s.scheduled_time, s.channel_id, s.content_id, s.radio_id, s.duration,
          c.name as channel_name, c.mount_point,
          ci.title as content_title,
          mf.file_path, mf.file_name,
          r.name as radio_name, r.url as radio_url
        FROM broadcast_schedules s
        JOIN channels c ON s.channel_id = c.id
        LEFT JOIN content_items ci ON s.content_id = ci.id
        LEFT JOIN radios r ON s.radio_id = r.id
        LEFT JOIN media_files mf ON ci.id = mf.content_id
        WHERE s.id = $1
        LIMIT 1
      `;
      const infoResult = await client.query(queryInfo, [id]);
      const broadcastInfo = infoResult.rows[0];
      
      // Trigger via WebSocket
      if ((fastify as any).broadcast && broadcastInfo) {
        const isRadio = !!broadcastInfo.radio_id;
        (fastify as any).broadcast({
          type: 'broadcast-start',
          channel_id: broadcastInfo.channel_id,
          schedule_id: id,
          title: isRadio ? `Radio: ${broadcastInfo.radio_name}` : (broadcastInfo.content_title || 'Bản tin mới'),
          channel: broadcastInfo.channel_name || 'Kênh mặc định',
          mount_point: broadcastInfo.mount_point,
          file_url: isRadio 
            ? broadcastInfo.radio_url 
            : (broadcastInfo.file_path ? getFullURL(`uploads/${broadcastInfo.file_path}`) : null),
          is_radio: isRadio,
          user: user.full_name || 'Admin',
          scheduled: true
        });
      }
      
      // Log into broadcast_sessions
      if (broadcastInfo) {
        await client.query(`
          INSERT INTO broadcast_sessions (schedule_id, content_id, radio_id, channel_id, start_time, duration, status)
          VALUES ($1, $2, $3, $4, NOW(), COALESCE($5, 300), 'completed')
        `, [id, broadcastInfo.content_id, broadcastInfo.radio_id, broadcastInfo.channel_id, broadcastInfo.duration]);
      }

      return { 
        message: 'Broadcast triggered successfully', 
        schedule: updateResult.rows[0],
        broadcast: broadcastInfo 
      };
    } finally {
      client.release();
    }
  });

  // 4b. Play All Channels for a Content (Outside Action)
  fastify.post('/content/:contentId/play-all', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander', 'commander'])] }, async (request: any, reply) => {
    const { contentId } = request.params;
    
    // 1. Find all channels that have this content scheduled (Unique channels)
    const queryChannels = `
      SELECT DISTINCT ON (s.channel_id) 
             s.channel_id, c.name as channel_name, c.mount_point,
             ci.title as content_title,
             mf.file_path
      FROM broadcast_schedules s
      JOIN channels c ON s.channel_id = c.id
      JOIN content_items ci ON s.content_id = ci.id
      LEFT JOIN media_files mf ON ci.id = mf.content_id
      WHERE s.content_id = $1
        AND s.is_active = true
      ORDER BY s.channel_id
    `;
    const chanResult = await fastify.pg.query(queryChannels, [contentId]);
    
    if (chanResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Không tìm thấy kênh nào có lịch phát bản tin này trong hôm nay.' });
    }

    // Check if any matching schedule has audio
    const hasAudio = chanResult.rows.some(r => r.file_path);
    if (!hasAudio) {
      return reply.code(400).send({ error: 'Bản tin này hiện chưa được gán file âm thanh, không thể phát đa kênh.' });
    }

    const triggeredChannels: string[] = [];
    const protocol = request.protocol || 'http';
    const host = request.headers.host || '127.0.0.1:3000';
    
    // 2. Trigger broadcast for each channel
    for (const channelInfo of chanResult.rows) {
      if ((fastify as any).broadcast && channelInfo.file_path) {
        (fastify as any).broadcast({
          type: 'broadcast-start',
          channel_id: channelInfo.channel_id,
          title: channelInfo.content_title || 'Bản tin mới',
          channel: channelInfo.channel_name || 'Kênh mặc định',
          mount_point: channelInfo.mount_point,
          file_url: getFullURL(`uploads/${channelInfo.file_path}`),
          user: (request.user as any)?.full_name || 'Admin'
        });
        triggeredChannels.push(channelInfo.channel_name);
      }
    }

    // 3. Update triggered_at for these schedules
    await fastify.pg.query(`
      UPDATE broadcast_schedules
      SET triggered_at = NOW()
      WHERE content_id = $1
    `, [contentId]);

    // 4. Log into broadcast_sessions for each triggered channel
    for (const channelInfo of chanResult.rows) {
      await fastify.pg.query(`
        INSERT INTO broadcast_sessions (content_id, channel_id, start_time, duration, status)
        VALUES ($1, $2, NOW(), 300, 'completed')
      `, [contentId, channelInfo.channel_id]);
    }

    return { 
      message: `Đã kích hoạt phát sóng trên ${chanResult.rowCount} kênh: ${triggeredChannels.join(', ')}`,
      channels: triggeredChannels
    };
  });

  // 4c. Play All Channels for a Radio (Outside Action)
  fastify.post('/radio/:radioId/play-all', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander', 'commander'])] }, async (request: any, reply) => {
    const { radioId } = request.params;
    
    // 1. Find all channels that have this radio scheduled
    const queryChannels = `
      SELECT DISTINCT ON (s.channel_id) 
             s.channel_id, c.name as channel_name, c.mount_point,
             r.name as radio_name, r.url as radio_url
      FROM broadcast_schedules s
      JOIN channels c ON s.channel_id = c.id
      JOIN radios r ON s.radio_id = r.id
      WHERE s.radio_id = $1
        AND s.is_active = true
      ORDER BY s.channel_id
    `;
    const chanResult = await fastify.pg.query(queryChannels, [radioId]);
    
    if (chanResult.rowCount === 0) {
      return reply.code(404).send({ error: 'Không tìm thấy kênh nào có lịch phát radio này trong hôm nay.' });
    }

    const triggeredChannels: string[] = [];
    
    // 2. Trigger broadcast for each channel
    for (const channelInfo of chanResult.rows) {
      if ((fastify as any).broadcast && channelInfo.radio_url) {
        (fastify as any).broadcast({
          type: 'broadcast-start',
          channel_id: channelInfo.channel_id,
          title: `Radio: ${channelInfo.radio_name}`,
          channel: channelInfo.channel_name || 'Kênh mặc định',
          mount_point: channelInfo.mount_point,
          file_url: channelInfo.radio_url,
          is_radio: true,
          user: (request.user as any)?.full_name || 'Admin',
          scheduled: true
        });
        triggeredChannels.push(channelInfo.channel_name);
      }
    }

    // 3. Update triggered_at for these schedules
    await fastify.pg.query(`
      UPDATE broadcast_schedules
      SET triggered_at = NOW()
      WHERE radio_id = $1
    `, [radioId]);

    // 4. Log into broadcast_sessions for each triggered channel
    for (const channelInfo of chanResult.rows) {
      await fastify.pg.query(`
        INSERT INTO broadcast_sessions (radio_id, channel_id, start_time, duration, status)
        VALUES ($1, $2, NOW(), 300, 'completed')
      `, [radioId, channelInfo.channel_id]);
    }

    return { 
      message: `Đã kích hoạt phát Radio trên ${chanResult.rowCount} kênh: ${triggeredChannels.join(', ')}`,
      channels: triggeredChannels
    };
  });

  // 5. Delete schedule
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      // Verify ownership
      const existing = await client.query(`
        SELECT s.id, c.unit_id 
        FROM broadcast_schedules s
        JOIN channels c ON s.channel_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (existing.rows.length === 0) return reply.code(404).send({ error: 'Schedule not found' });
      if (user.role_name !== 'admin' && existing.rows[0].unit_id !== user.unit_id) {
        return reply.code(403).send({ error: 'Bạn không có quyền xóa lịch phát của đơn vị khác.' });
      }

      await client.query('DELETE FROM broadcast_schedules WHERE id = $1', [id]);
      return { message: 'Schedule deleted successfully' };
    } finally {
      client.release();
    }
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
  fastify.post('/emergency', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'commander', 'broadcaster'])] }, async (request: any, reply) => {
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
  fastify.post('/emergency/stop', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'commander', 'broadcaster'])] }, async (request: any, reply) => {
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
