import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getFullURL } from '../utils/url.js';
import { getAudioMetadata } from '../utils/audio_meta.js';
import path from 'path';
import fs from 'fs';

export default async function scheduleRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all schedules (flat list) - with fallback for missing columns
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'Thành viên', 'operations_commander', 'political_commissar'])] }, async (request, reply) => {
    const user = request.user as any;
    try {
      // Try full query first (with triggered_at and created_by)
      let query = `
        SELECT 
          s.id, s.scheduled_time, 
          COALESCE(s.duration, (SELECT EXTRACT(EPOCH FROM duration)::int FROM media_files WHERE content_id = s.content_id LIMIT 1), (SELECT duration FROM routine_commands WHERE id = s.routine_id)) as duration,
          s.repeat_pattern, s.is_active,
          s.channel_id, s.content_id, s.radio_id, s.unit_id, s.is_all_units,
          s.triggered_at,
          c.name as channel_name, c.mount_point,
          ci.title as content_title,
          u.full_name as author_name,
          r.name as radio_name,
          ro.title as routine_title,
          un.name as unit_name,
          (EXISTS (SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id) OR s.radio_id IS NOT NULL OR s.routine_id IS NOT NULL) as has_audio
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        LEFT JOIN content_items ci ON s.content_id = ci.id
        LEFT JOIN radios r ON s.radio_id = r.id
        LEFT JOIN routine_commands ro ON s.routine_id = ro.id
        LEFT JOIN units un ON s.unit_id = un.id
        LEFT JOIN users u ON ci.author_id = u.id
        WHERE 1=1
      `;
      const values: any[] = [];
      // Only the unique System Owner (ID 1) bypasses unit scoping completely
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        query += ` AND (c.unit_id = ANY($1) OR s.unit_id = ANY($1))`;
        values.push(unitIds);
      }
      query += ` ORDER BY s.scheduled_time ASC`;
      const result = await fastify.pg.query(query, values);
      return result.rows;
    } catch (err1: any) {
      fastify.log.warn(`Full query failed: ${err1.message}, trying fallback...`);
      try {
        // Fallback: simpler query
        let fallback = `
          SELECT 
            s.id, s.scheduled_time, 
            COALESCE(s.duration, (SELECT EXTRACT(EPOCH FROM duration)::int FROM media_files WHERE content_id = s.content_id LIMIT 1), (SELECT duration FROM routine_commands WHERE id = s.routine_id)) as duration,
            s.repeat_pattern, s.is_active,
            s.channel_id, s.content_id,
            NULL as triggered_at,
            c.name as channel_name, c.mount_point,
            ci.title as content_title,
            u.full_name as author_name,
            ro.title as routine_title,
            (EXISTS (SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id) OR s.radio_id IS NOT NULL OR s.routine_id IS NOT NULL) as has_audio
          FROM broadcast_schedules s
          LEFT JOIN channels c ON s.channel_id = c.id
          LEFT JOIN content_items ci ON s.content_id = ci.id
          LEFT JOIN routine_commands ro ON s.routine_id = ro.id
          LEFT JOIN users u ON ci.author_id = u.id
          WHERE 1=1
        `;
        const fallbackValues: any[] = [];
        if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
          const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
          const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
          fallback += ` AND (c.unit_id = ANY($1) OR s.unit_id = ANY($1))`;
          fallbackValues.push(unitIds);
        }
        fallback += ` ORDER BY s.scheduled_time ASC`;
        const result = await fastify.pg.query(fallback, fallbackValues);
        return result.rows;
      } catch (err2: any) {
        fastify.log.error(`Fallback query also failed: ${err2.message}`);
        return reply.code(500).send({ error: `Lỗi DB: ${err2.message}` });
      }
    }
  });

  // 1b. Get schedules GROUPED by content item
  fastify.get('/grouped', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'Thành viên', 'operations_commander', 'political_commissar'])] }, async (request, reply) => {
    const user = request.user as any;
    let query = `
      SELECT 
        s.id as schedule_id,
        s.scheduled_time, 
        COALESCE(s.duration, (SELECT EXTRACT(EPOCH FROM duration)::int FROM media_files WHERE content_id = s.content_id LIMIT 1), (SELECT duration FROM routine_commands WHERE id = s.routine_id)) as duration,
        s.repeat_pattern, s.is_active,
        s.channel_id, s.content_id, s.radio_id, s.unit_id, s.is_all_units, s.triggered_at,
        c.name as channel_name, c.mount_point,
        ci.title as content_title, ci.id as content_item_id,
        r.name as radio_name, r.id as radio_id_from_table,
        ro.title as routine_title, ro.id as routine_id_from_table,
        un.name as unit_name,
        u.full_name as author_name,
        (EXISTS (SELECT 1 FROM media_files mf WHERE mf.content_id = s.content_id) OR s.radio_id IS NOT NULL OR s.routine_id IS NOT NULL) as has_audio,
        CASE 
          WHEN s.triggered_at IS NOT NULL THEN 'played'
          WHEN s.scheduled_time <= NOW() THEN 'overdue'
          ELSE 'pending'
        END as play_status
      FROM broadcast_schedules s
      LEFT JOIN channels c ON s.channel_id = c.id
      LEFT JOIN content_items ci ON s.content_id = ci.id
      LEFT JOIN radios r ON s.radio_id = r.id
      LEFT JOIN routine_commands ro ON s.routine_id = ro.id
      LEFT JOIN units un ON s.unit_id = un.id
      LEFT JOIN users u ON ci.author_id = u.id
      WHERE (ci.status IN ('approved', 'published') OR s.radio_id IS NOT NULL OR s.routine_id IS NOT NULL)
    `;
    const values: any[] = [];
    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
      query += ` AND (c.unit_id = ANY($1) OR s.unit_id = ANY($1))`;
      values.push(unitIds);
    }
    query += ` ORDER BY ci.id, s.scheduled_time ASC`;
    const result = await fastify.pg.query(query, values);

    // Group by content item
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
        unit_id: row.unit_id,
        unit_name: row.unit_name,
        is_all_units: row.is_all_units,
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

  // 2. Create new schedule
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { channel_id, unit_id, is_all_units, content_id, radio_id, routine_id, scheduled_time, duration, repeat_pattern } = request.body as any;
    const user = request.user as any;
    
    if (!channel_id && !unit_id && !is_all_units) {
      return reply.code(400).send({ error: 'channel_id, unit_id hoặc is_all_units là bắt buộc' });
    }
    if ((!content_id && !radio_id && !routine_id) || !scheduled_time) {
      return reply.code(400).send({ error: '(content_id, radio_id hoặc routine_id) và scheduled_time là bắt buộc' });
    }

    // Security Check: Only Root Admin (User ID 1) or system-wide Admin can do GLOBAL "All Units"
    if ((is_all_units === true || is_all_units === 'true') && !unit_id) {
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        return reply.code(403).send({ error: 'Chỉ quản trị viên hệ thống mới có quyền phát cho toàn bộ đơn vị hệ thống.' });
      }
    }

    // Security Check: Unit owners (Admins of that unit)
    if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
      if (unit_id) {
        // Scoping for a specific unit
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const allowedUnits = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!allowedUnits.includes(Number(unit_id))) {
          return reply.code(403).send({ error: 'Bạn không có quyền lập lịch cho đơn vị này.' });
        }
      } else if (channel_id) {
        // Scoping for a specific channel
        const chan = await fastify.pg.query('SELECT unit_id FROM channels WHERE id = $1', [channel_id]);
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (chan.rows.length === 0 || !unitIds.includes(chan.rows[0].unit_id)) {
          return reply.code(403).send({ error: 'Bạn không có quyền lập lịch cho kênh này.' });
        }
      }
    }

    const query = `
      INSERT INTO broadcast_schedules (channel_id, unit_id, is_all_units, content_id, radio_id, routine_id, scheduled_time, duration, repeat_pattern)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [
      channel_id || null, 
      unit_id || null, 
      is_all_units || false, 
      content_id || null, 
      radio_id || null, 
      routine_id || null, 
      scheduled_time, 
      duration || null, 
      repeat_pattern || 'none'
    ]);
    
    // Return with channel name
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
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { channel_id, unit_id, is_all_units, content_id, radio_id, scheduled_time, duration, repeat_pattern, is_active } = request.body as any;
    const user = request.user;

    const client = await fastify.pg.connect();
    try {
      // Security Check
      const existing = await client.query(`
        SELECT s.id, COALESCE(c.unit_id, s.unit_id) as unit_id 
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (existing.rows.length === 0) return reply.code(404).send({ error: 'Schedule not found' });
      
      // Scoping
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(existing.rows[0].unit_id)) {
          return reply.code(403).send({ error: 'Bạn không có quyền sửa lịch phát của đơn vị khác.' });
        }
      }

      const query = `
        UPDATE broadcast_schedules 
        SET 
          channel_id = CASE WHEN $1::integer IS NOT NULL THEN $1 ELSE channel_id END,
          unit_id = CASE WHEN $9::integer IS NOT NULL THEN $9 ELSE unit_id END,
          is_all_units = COALESCE($10, is_all_units),
          content_id = CASE WHEN $2::integer IS NOT NULL THEN $2 ELSE content_id END,
          radio_id = CASE WHEN $3::integer IS NOT NULL THEN $3 ELSE radio_id END,
          scheduled_time = COALESCE($4, scheduled_time),
          duration = CASE WHEN $5::integer IS NOT NULL THEN $5 ELSE duration END,
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
        id,
        unit_id || null,
        is_all_units === undefined ? null : is_all_units
      ]);
      return result.rows[0];
    } finally {
      client.release();
    }
  });

  // 4. Play Now
  fastify.post('/:id/play', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    
    const client = await fastify.pg.connect();
    try {
      const existing = await client.query(`
        SELECT s.id, COALESCE(c.unit_id, s.unit_id) as unit_id 
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (existing.rows.length === 0) return reply.code(404).send({ error: 'Schedule not found' });
      
      // Scoping
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(existing.rows[0].unit_id)) {
          return reply.code(403).send({ error: 'Bạn không có quyền phát lệnh của đơn vị khác.' });
        }
      }

      // Update
      const updateResult = await client.query(`
        UPDATE broadcast_schedules 
        SET is_active = true, triggered_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [id]);
      
      const queryInfo = `
        SELECT 
          s.id, s.scheduled_time, s.channel_id, s.content_id, s.radio_id, s.duration,
          c.name as channel_name, c.mount_point,
          ci.title as content_title,
          mf.file_path, mf.file_name,
          r.name as radio_name, r.url as radio_url
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        LEFT JOIN content_items ci ON s.content_id = ci.id
        LEFT JOIN radios r ON s.radio_id = r.id
        LEFT JOIN media_files mf ON ci.id = mf.content_id
        WHERE s.id = $1
        LIMIT 1
      `;
      const infoResult = await client.query(queryInfo, [id]);
      const broadcastInfo = infoResult.rows[0];
      
      if ((fastify as any).broadcast && broadcastInfo) {
        const isRadio = !!broadcastInfo.radio_id;
        let audioMeta = null;
        if (!isRadio && broadcastInfo.file_path) {
          const fullPath = path.resolve(`./uploads/${broadcastInfo.file_path}`);
          audioMeta = await getAudioMetadata(fullPath);
        }

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
          scheduled: true,
          start_time: new Date().toISOString(),
          duration: audioMeta?.duration || 0,
          file_size: audioMeta?.size_formatted || ''
        });
      }
      
      if (broadcastInfo) {
        await client.query(`
          INSERT INTO broadcast_sessions (schedule_id, content_id, radio_id, channel_id, start_time, duration, status)
          VALUES ($1, $2, $3, $4, NOW(), COALESCE($5, 300), 'completed')
        `, [id, broadcastInfo.content_id, broadcastInfo.radio_id, broadcastInfo.channel_id, broadcastInfo.duration]);
      }

      return { message: 'Broadcast triggered successfully', schedule: updateResult.rows[0] };
    } finally {
      client.release();
    }
  });

  // 5. Delete schedule
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      const existing = await client.query(`
        SELECT s.id, COALESCE(c.unit_id, s.unit_id) as unit_id 
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        WHERE s.id = $1
      `, [id]);

      if (existing.rows.length === 0) return reply.code(404).send({ error: 'Schedule not found' });
      
      // Scoping
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(existing.rows[0].unit_id)) {
          return reply.code(403).send({ error: 'Bạn không có quyền xóa lịch phát của đơn vị khác.' });
        }
      }

      await client.query('DELETE FROM broadcast_schedules WHERE id = $1', [id]);
      return { message: 'Schedule deleted successfully' };
    } finally {
      client.release();
    }
  });

  // Bulk delete... (kept global as it's dangerous, but could be scoped similarly)
  fastify.post('/bulk-delete', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý'])] }, async (request: any, reply) => {
    const { ids } = request.body as { ids: number[] };
    if (!ids || !ids.length) return reply.code(400).send({ error: 'No IDs provided' });
    await fastify.pg.query('DELETE FROM broadcast_schedules WHERE id = ANY($1)', [ids]);
    return { message: 'Schedules deleted successfully' };
  });

  // 6. Pause - Simulating with a pause event
  fastify.post('/:id/pause', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    if ((fastify as any).broadcast) {
      (fastify as any).broadcast({ type: 'broadcast-status', schedule_id: Number(id), isPaused: true });
    }
    return { message: 'Broadcast paused' };
  });

  // 7. Resume - Simulating with a resume event
  fastify.post('/:id/resume', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
     if ((fastify as any).broadcast) {
      (fastify as any).broadcast({ type: 'broadcast-status', schedule_id: Number(id), isPaused: false });
    }
    return { message: 'Broadcast resumed' };
  });

  // 8. Play All for Content
  fastify.post('/content/:contentId/play-all', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { contentId } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      const schedules = await client.query(`
        SELECT s.id, s.channel_id, c.name as channel_name, c.mount_point, ci.title as content_title, mf.file_path
        FROM broadcast_schedules s
        LEFT JOIN channels c ON s.channel_id = c.id
        JOIN content_items ci ON s.content_id = ci.id
        LEFT JOIN media_files mf ON ci.id = mf.content_id
        WHERE s.content_id = $1 AND s.is_active = true
      `, [contentId]);

      if (schedules.rows.length === 0) return reply.code(404).send({ error: 'Không tìm thấy lịch phát nào cho nội dung này.' });

      for (const s of schedules.rows) {
        let audioMeta = null;
        if (s.file_path) {
          const fullPath = path.resolve(`./uploads/${s.file_path}`);
          audioMeta = await getAudioMetadata(fullPath);
        }

        if ((fastify as any).broadcast) {
          (fastify as any).broadcast({
            type: 'broadcast-start',
            channel_id: s.channel_id,
            schedule_id: s.id,
            title: s.content_title || 'Bản tin',
            channel: s.channel_name,
            mount_point: s.mount_point,
            file_url: s.file_path ? getFullURL(`uploads/${s.file_path}`) : null,
            user: user.full_name || 'Admin',
            scheduled: true,
            duration: audioMeta?.duration || 0,
            file_size: audioMeta?.size_formatted || ''
          });
        }
        await client.query('UPDATE broadcast_schedules SET triggered_at = NOW() WHERE id = $1', [s.id]);
      }

      return { message: `Đã kích hoạt ${schedules.rows.length} kênh thành công.` };
    } finally {
      client.release();
    }
  });

  // 9. Play All for Radio
  fastify.post('/radio/:radioId/play-all', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { radioId } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      const schedules = await client.query(`
        SELECT s.id, s.channel_id, c.name as channel_name, c.mount_point, r.name as radio_name, r.url as radio_url
        FROM broadcast_schedules s
        JOIN channels c ON s.channel_id = c.id
        JOIN radios r ON s.radio_id = r.id
        WHERE s.radio_id = $1 AND s.is_active = true
      `, [radioId]);

      if (schedules.rows.length === 0) return reply.code(404).send({ error: 'Không tìm thấy lịch phát nào cho đài phát thanh này.' });

      for (const s of schedules.rows) {
        if ((fastify as any).broadcast) {
          (fastify as any).broadcast({
            type: 'broadcast-start',
            channel_id: s.channel_id,
            schedule_id: s.id,
            title: `Radio: ${s.radio_name}`,
            channel: s.channel_name,
            mount_point: s.mount_point,
            file_url: s.radio_url,
            is_radio: true,
            user: user.full_name || 'Admin',
            scheduled: true
          });
        }
        await client.query('UPDATE broadcast_schedules SET triggered_at = NOW() WHERE id = $1', [s.id]);
      }

      return { message: `Đã kích hoạt ${schedules.rows.length} kênh thành công.` };
    } finally {
      client.release();
    }
  });

  // Emergency Mode Routes (Root only)
  fastify.get('/emergency/status', async (request, reply) => {
    const result = await fastify.pg.query("SELECT value FROM system_config WHERE key = 'emergency_mode'");
    return { active: (result.rowCount ?? 0) > 0 && result.rows[0].value === 'true' };
  });
}
