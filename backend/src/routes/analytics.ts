import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as XLSX from 'xlsx';

export default async function analyticsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Overview Stats (Scoped by Unit)
  fastify.get('/overview', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params: any[] = [];
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      let unitIds: number[] = [];
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);

      if (!isAdmin) {
        unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'WHERE u.unit_id = ANY($1)';
        params.push(unitIds);
      }

      // Content Stats by Status
      const contentRes = await client.query(`
        SELECT c.status, COUNT(*) as count 
        FROM content_items c
        LEFT JOIN users u ON c.author_id = u.id
        ${unitFilter}
        GROUP BY c.status
      `, params);
      const contentStats = contentRes.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, { draft: 0, pending_review: 0, approved: 0 });

      // Device Stats
      const { rows: deviceColCheck } = await client.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'devices' AND column_name = 'unit_id'");
      let deviceFilter = '';
      const deviceParams = [];
      if (deviceColCheck.length > 0 && !isAdmin) {
        if (unitIds.length === 0) unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        deviceFilter = 'WHERE unit_id = ANY($1)';
        deviceParams.push(unitIds);
      }
      const deviceStatusRes = await client.query(`SELECT status, COUNT(*) as count FROM devices ${deviceFilter} GROUP BY status`, deviceParams);
      const deviceStatsByStatus = deviceStatusRes.rows.map(row => ({
        name: row.status === 'online' ? 'Trực tuyến' : row.status === 'offline' ? 'Ngoại tuyến' : 'Lỗi',
        value: parseInt(row.count),
        status: row.status
      }));
      const deviceTypeRes = await client.query(`SELECT type, COUNT(*) as count FROM devices ${deviceFilter} GROUP BY type`, deviceParams);
      const deviceStatsByType = deviceTypeRes.rows.map(row => ({
        name: row.type === 'terminal' ? 'Trung tâm' : 'Đầu cuối (Loa)',
        value: parseInt(row.count),
        type: row.type
      }));

      // Broadcast Trends
      let broadcastFilter = '';
      const broadcastParams = [];
      if (!isAdmin) {
        if (unitIds.length === 0) unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        broadcastFilter = 'JOIN channels ch ON bs.channel_id = ch.id WHERE ch.unit_id = ANY($1)';
        broadcastParams.push(unitIds);
      }
      const trendsRes = await client.query(`
        SELECT DATE(bs.scheduled_time) as date, COUNT(*) as broadcasts
        FROM broadcast_schedules bs
        ${broadcastFilter}
        GROUP BY DATE(bs.scheduled_time)
        ORDER BY date DESC
        LIMIT 7
      `, broadcastParams);
      const rawTrends = trendsRes.rows.reverse(); 
      const broadcastTrends = rawTrends.map(row => ({
        date: new Date(row.date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }),
        broadcasts: parseInt(row.broadcasts)
      }));

      // Top 10 Most Played Contents
      const topContentsRes = await client.query(`
        SELECT COALESCE(ci.title, r.name, ro.title, 'Bản tin trực tiếp') as name, COUNT(bs.id)::integer as value
        FROM broadcast_sessions bs
        LEFT JOIN content_items ci ON bs.content_id = ci.id
        LEFT JOIN radios r ON bs.radio_id = r.id
        LEFT JOIN routine_commands ro ON bs.routine_id = ro.id
        LEFT JOIN users u ON ci.author_id = u.id
        WHERE bs.status = 'completed'
        ${!isAdmin ? ' AND (u.unit_id = ANY($1) OR bs.radio_id IS NOT NULL OR bs.routine_id IS NOT NULL)' : ''}
        GROUP BY name
        ORDER BY value DESC
        LIMIT 10
      `, params.length > 0 ? params : []);
      const topContents = topContentsRes.rows;

      return {
        contentStats,
        deviceStatsByStatus,
        deviceStatsByType,
        broadcastTrends,
        topContents,
        durationTrends: [] 
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch analytics', detail: err.message });
    } finally {
      client.release();
    }
  });

  // 2. Unit Performance Scores (Thi đua) - Downward only
  fastify.get('/unit-scores', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);
      let baseUnitId = 1; 
      if (!isAdmin) {
        baseUnitId = user.unit_id;
      }

      // Filter: Only include units at or below baseUnitId
      const allowedUnitIds = await getDescendantUnitIds(fastify.pg, baseUnitId);

      const query = `
        WITH unit_scores_flat AS (
          SELECT 
            u.id, 
            (SELECT COUNT(*) * 10 FROM content_items ci WHERE ci.unit_id = u.id AND ci.status = 'approved') as content_pts,
            (SELECT COUNT(*) * 5 FROM broadcast_sessions bs JOIN channels c ON bs.channel_id = c.id WHERE c.unit_id = u.id AND bs.status = 'completed') as broadcast_pts,
            (SELECT COUNT(*) * 2 FROM recording_sessions rs WHERE rs.unit_id = u.id) as recording_pts
          FROM units u
          WHERE u.id = ANY($1)
        )
        SELECT 
          u.id, u.name, u.level, u.parent_id,
          sf.content_pts as content_points,
          sf.broadcast_pts as broadcast_points,
          sf.recording_pts as recording_points,
          (sf.content_pts + sf.broadcast_pts + sf.recording_pts) as total_score
        FROM units u
        JOIN unit_scores_flat sf ON u.id = sf.id
        ORDER BY total_score DESC
      `;
      
      const res = await client.query(query, [allowedUnitIds]);
      return res.rows;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch unit scores' });
    } finally {
      client.release();
    }
  });

  // 3. Export Unit Scores (Thi đua) - Downward only
  fastify.get('/export', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);
      let baseUnitId = 1;
      if (!isAdmin) {
        baseUnitId = user.unit_id;
      }
      const unitIds = await getDescendantUnitIds(fastify.pg, baseUnitId);

      const query = `
        SELECT 
          u.name as "Đơn vị",
          (SELECT COUNT(*) * 10 FROM content_items ci WHERE ci.unit_id = u.id AND ci.status = 'approved') as "Điểm Nội dung",
          (SELECT COUNT(*) * 5 FROM broadcast_sessions bs JOIN channels c ON bs.channel_id = c.id WHERE c.unit_id = u.id AND bs.status = 'completed') as "Điểm Phát sóng",
          (SELECT COUNT(*) * 2 FROM recording_sessions rs WHERE rs.unit_id = u.id) as "Điểm Ghi âm",
          ((SELECT COUNT(*) * 10 FROM content_items ci WHERE ci.unit_id = u.id AND ci.status = 'approved') + 
           (SELECT COUNT(*) * 5 FROM broadcast_sessions bs JOIN channels c ON bs.channel_id = c.id WHERE c.unit_id = u.id AND bs.status = 'completed') + 
           (SELECT COUNT(*) * 2 FROM recording_sessions rs WHERE rs.unit_id = u.id)) as "Tổng điểm"
        FROM units u
        WHERE u.id = ANY($1)
        ORDER BY "Tổng điểm" DESC
      `;
      
      const res = await client.query(query, [unitIds]);
      const data = res.rows;
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bảng điểm thi đua");
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="Bao_cao_thi_dua_OpenClaw.xlsx"')
        .send(buf);
    } finally {
      client.release();
    }
  });
  
  // 4. Detailed Broadcast History (Scoped by Unit)
  fastify.get('/history', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { startDate, endDate, channelId, status } = request.query as any;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      let query = `
        SELECT 
          bs.id, bs.start_time, bs.end_time, bs.status,
          c.name as channel_name, ci.title as content_title,
          EXTRACT(EPOCH FROM (bs.end_time - bs.start_time)) as duration
        FROM broadcast_sessions bs
        JOIN channels c ON bs.channel_id = c.id
        LEFT JOIN content_items ci ON bs.content_id = ci.id
        WHERE 1=1
      `;
      const values: any[] = [];
      let paramIdx = 1;
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);
      if (!isAdmin) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        query += ` AND c.unit_id = ANY($${paramIdx++})`;
        values.push(unitIds);
      }
      if (startDate) { query += ` AND bs.start_time >= $${paramIdx++}`; values.push(startDate); }
      if (endDate) { query += ` AND bs.start_time <= $${paramIdx++}`; values.push(endDate + ' 23:59:59'); }
      if (channelId && channelId !== 'all') { query += ` AND bs.channel_id = $${paramIdx++}`; values.push(channelId); }
      if (status && status !== 'all') { query += ` AND bs.status = $${paramIdx++}`; values.push(status); }
      query += ` ORDER BY bs.start_time DESC LIMIT 100`;
      const res = await client.query(query, values);
      return res.rows;
    } finally { client.release(); }
  });

  // 5. Get Channels for Filters (Scoped)
  fastify.get('/channels', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params = [];
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);
      if (!isAdmin) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'WHERE unit_id = ANY($1)';
        params.push(unitIds);
      }
      const res = await client.query(`SELECT id, name FROM channels ${unitFilter} ORDER BY name ASC`, params);
      return res.rows;
    } finally { client.release(); }
  });

  // 6. Retry (Scoped Check)
  fastify.post('/retry/:sessionId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { sessionId } = request.params as any;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const sessionRes = await client.query(`
        SELECT bs.channel_id, c.unit_id, bs.content_id, 
          EXTRACT(EPOCH FROM (bs.end_time - bs.start_time)) as duration,
          c.name as channel_name, c.mount_point, ci.title as content_title, mf.file_path
        FROM broadcast_sessions bs JOIN channels c ON bs.channel_id = c.id
        LEFT JOIN content_items ci ON bs.content_id = ci.id
        LEFT JOIN media_files mf ON ci.id = mf.content_id
        WHERE bs.id = $1
      `, [sessionId]);
      if (sessionRes.rowCount === 0) return reply.code(404).send({ error: 'Session not found' });
      const session = sessionRes.rows[0];
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);
      if (!isAdmin) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(session.unit_id)) return reply.code(403).send({ error: 'Bạn không có quyền thực hiện lại lệnh phát của đơn vị khác.' });
      }
      const scheduleRes = await client.query(`
        INSERT INTO broadcast_schedules (channel_id, content_id, scheduled_time, duration, is_active)
        VALUES ($1, $2, NOW(), $3, true) RETURNING id
      `, [session.channel_id, session.content_id, session.duration || 300]);
      const newScheduleId = scheduleRes.rows[0].id;
      if (fastify.broadcast) {
        fastify.broadcast({
          type: 'broadcast-start', schedule_id: newScheduleId,
          title: session.content_title || 'Phát lại bản tin',
          channel: session.channel_name, mount_point: session.mount_point,
          file_url: session.file_path ? `http://127.0.0.1:3000/uploads/${session.file_path}` : null,
          user: user.full_name || 'Admin'
        });
      }
      return { message: 'Broadcast retry triggered successfully', new_schedule_id: newScheduleId };
    } finally { client.release(); }
  });
}
