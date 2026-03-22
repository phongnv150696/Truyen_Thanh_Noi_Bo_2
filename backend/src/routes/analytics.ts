import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as XLSX from 'xlsx';

export default async function analyticsRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  fastify.get('/overview', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      // Content Stats
      const contentRes = await client.query('SELECT status, COUNT(*) as count FROM content_items GROUP BY status');
      const contentStats = contentRes.rows.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, { draft: 0, pending_review: 0, published: 0 });

      // Device Stats by Status
      const deviceStatusRes = await client.query('SELECT status, COUNT(*) as count FROM devices GROUP BY status');
      const deviceStatsByStatus = deviceStatusRes.rows.map(row => ({
        name: row.status === 'online' ? 'Trực tuyến' : row.status === 'offline' ? 'Ngoại tuyến' : 'Lỗi',
        value: parseInt(row.count),
        status: row.status
      }));

      // Device Stats by Type
      const deviceTypeRes = await client.query('SELECT type, COUNT(*) as count FROM devices GROUP BY type');
      const deviceStatsByType = deviceTypeRes.rows.map(row => ({
        name: row.type === 'terminal' ? 'Trung tâm' : 'Đầu cuối (Loa)',
        value: parseInt(row.count),
        type: row.type
      }));

      // Broadcast Trends (Last 7 days)
      const trendsRes = await client.query(`
        SELECT DATE(scheduled_time) as date, COUNT(*) as broadcasts
        FROM broadcast_schedules
        GROUP BY DATE(scheduled_time)
        ORDER BY date DESC
        LIMIT 7
      `);
      
      const rawTrends = trendsRes.rows.reverse(); // old to new
      const broadcastTrends = rawTrends.map(row => ({
        date: new Date(row.date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }),
        broadcasts: parseInt(row.broadcasts)
      }));

      // Top 10 Most Played Contents
      const topContentsRes = await client.query(`
        SELECT ci.title as name, COUNT(bs.id)::integer as value
        FROM broadcast_sessions bs
        JOIN content_items ci ON bs.content_id = ci.id
        WHERE bs.status = 'completed'
        GROUP BY ci.title
        ORDER BY value DESC
        LIMIT 10
      `);
      const topContents = topContentsRes.rows;

      // Duration Trends (Daily total minutes)
      const durationRes = await client.query(`
        SELECT DATE(start_time) as date, SUM(duration/60)::integer as duration
        FROM broadcast_sessions
        WHERE status = 'completed'
        GROUP BY DATE(start_time)
        ORDER BY date DESC
        LIMIT 7
      `);
      const rawDuration = durationRes.rows.reverse();
      const durationTrends = rawDuration.map(row => ({
        date: new Date(row.date).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }),
        duration: row.duration
      }));

      return {
        contentStats,
        deviceStatsByStatus,
        deviceStatsByType,
        broadcastTrends,
        topContents,
        durationTrends
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch analytics', detail: err.message });
    } finally {
      client.release();
    }
  });

  fastify.get('/unit-scores', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      // Calculate scores on the fly for transparency
      // 1. Content Points: 10 per published item
      // 2. Broadcast Points: 5 per completed session
      // 3. Recording Points: 2 per session
      const query = `
        WITH content_pts AS (
          SELECT unit_id, COUNT(*) * 10 as pts
          FROM content_items
          WHERE status = 'published'
          GROUP BY unit_id
        ),
        broadcast_pts AS (
          SELECT u.id as unit_id, COUNT(bs.id) * 5 as pts
          FROM units u
          LEFT JOIN channels c ON c.unit_id = u.id
          LEFT JOIN broadcast_sessions bs ON bs.channel_id = c.id
          WHERE bs.status = 'completed'
          GROUP BY u.id
        ),
        recording_pts AS (
          SELECT unit_id, COUNT(*) * 2 as pts
          FROM recording_sessions
          GROUP BY unit_id
        )
        SELECT 
          u.id, 
          u.name,
          COALESCE(c.pts, 0) as content_points,
          COALESCE(b.pts, 0) as broadcast_points,
          COALESCE(r.pts, 0) as recording_points,
          (COALESCE(c.pts, 0) + COALESCE(b.pts, 0) + COALESCE(r.pts, 0)) as total_score
        FROM units u
        LEFT JOIN content_pts c ON c.unit_id = u.id
        LEFT JOIN broadcast_pts b ON b.unit_id = u.id
        LEFT JOIN recording_pts r ON r.unit_id = u.id
        ORDER BY total_score DESC
      `;
      
      const res = await client.query(query);
      return res.rows;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch unit scores' });
    } finally {
      client.release();
    }
  });

  // 3. Export Unit Scores to Excel
  fastify.get('/export', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const query = `
        WITH content_pts AS (
          SELECT unit_id, COUNT(*) * 10 as pts
          FROM content_items
          WHERE status = 'published'
          GROUP BY unit_id
        ),
        broadcast_pts AS (
          SELECT u.id as unit_id, COUNT(bs.id) * 5 as pts
          FROM units u
          LEFT JOIN channels c ON c.unit_id = u.id
          LEFT JOIN broadcast_sessions bs ON bs.channel_id = c.id
          WHERE bs.status = 'completed'
          GROUP BY u.id
        ),
        recording_pts AS (
          SELECT unit_id, COUNT(*) * 2 as pts
          FROM recording_sessions
          GROUP BY unit_id
        )
        SELECT 
          u.name as "Đơn vị",
          COALESCE(c.pts, 0) as "Điểm Nội dung",
          COALESCE(b.pts, 0) as "Điểm Phát sóng",
          COALESCE(r.pts, 0) as "Điểm Ghi âm",
          (COALESCE(c.pts, 0) + COALESCE(b.pts, 0) + COALESCE(r.pts, 0)) as "Tổng điểm"
        FROM units u
        LEFT JOIN content_pts c ON c.unit_id = u.id
        LEFT JOIN broadcast_pts b ON b.unit_id = u.id
        LEFT JOIN recording_pts r ON r.unit_id = u.id
        ORDER BY "Tổng điểm" DESC
      `;
      
      const res = await client.query(query);
      const data = res.rows;

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Bảng điểm thi đua");

      // Generate buffer
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', 'attachment; filename="Bao_cao_thi_dua_OpenClaw.xlsx"')
        .send(buf);

    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to generate export' });
    } finally {
      client.release();
    }
  });
  
  // 4. Detailed Broadcast History with Filters
  fastify.get('/history', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { startDate, endDate, channelId, status } = request.query as any;
    const client = await fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          bs.id,
          bs.start_time,
          bs.end_time,
          bs.status,
          c.name as channel_name,
          ci.title as content_title,
          EXTRACT(EPOCH FROM (bs.end_time - bs.start_time)) as duration
        FROM broadcast_sessions bs
        JOIN channels c ON bs.channel_id = c.id
        LEFT JOIN content_items ci ON bs.content_id = ci.id
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramIdx = 1;
      
      if (startDate) {
        query += ` AND bs.start_time >= $${paramIdx++}`;
        values.push(startDate);
      }
      
      if (endDate) {
        // Add 1 day to include the full end date
        query += ` AND bs.start_time <= $${paramIdx++}`;
        values.push(endDate + ' 23:59:59');
      }
      
      if (channelId && channelId !== 'all') {
        query += ` AND bs.channel_id = $${paramIdx++}`;
        values.push(channelId);
      }
      
      if (status && status !== 'all') {
        query += ` AND bs.status = $${paramIdx++}`;
        values.push(status);
      }
      
      query += ` ORDER BY bs.start_time DESC LIMIT 100`;
      
      const res = await client.query(query, values);
      return res.rows;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch broadcast history' });
    } finally {
      client.release();
    }
  });

  // 5. Get Channels for Filters
  fastify.get('/channels', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const res = await client.query('SELECT id, name FROM channels ORDER BY name ASC');
      return res.rows;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch channels' });
    } finally {
      client.release();
    }
  });

  // 6. Retry a failed broadcast session
  fastify.post('/retry/:sessionId', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { sessionId } = request.params as any;
    const client = await fastify.pg.connect();
    
    try {
      // 1. Get session info
      const sessionRes = await client.query(`
        SELECT 
          bs.channel_id, 
          bs.content_id, 
          EXTRACT(EPOCH FROM (bs.end_time - bs.start_time)) as duration,
          c.name as channel_name, c.mount_point,
          ci.title as content_title,
          mf.file_path
        FROM broadcast_sessions bs
        JOIN channels c ON bs.channel_id = c.id
        LEFT JOIN content_items ci ON bs.content_id = ci.id
        LEFT JOIN media_files mf ON ci.id = mf.content_id
        WHERE bs.id = $1
      `, [sessionId]);

      if (sessionRes.rowCount === 0) {
        return reply.code(404).send({ error: 'Session not found' });
      }

      const session = sessionRes.rows[0];

      // 2. Create new immediate schedule
      const scheduleRes = await client.query(`
        INSERT INTO broadcast_schedules (channel_id, content_id, scheduled_time, duration, is_active)
        VALUES ($1, $2, NOW(), $3, true)
        RETURNING id
      `, [session.channel_id, session.content_id, session.duration || 300]);

      const newScheduleId = scheduleRes.rows[0].id;

      // 3. Trigger broadcast via WebSocket (if available)
      if (fastify.broadcast) {
        fastify.broadcast({
          type: 'broadcast-start',
          schedule_id: newScheduleId,
          title: session.content_title || 'Phát lại bản tin',
          channel: session.channel_name,
          mount_point: session.mount_point,
          file_url: session.file_path ? `http://127.0.0.1:3000/uploads/${session.file_path}` : null,
          user: (request.user as any)?.full_name || 'Admin'
        });
      }

      // 4. Log to audit_logs
      await client.query(`
        INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
        VALUES ($1, 'BROADCAST_RETRY', 'broadcast_sessions', $2, $3)
      `, [(request.user as any).id, sessionId, JSON.stringify({ new_schedule_id: newScheduleId })]);

      return { 
        message: 'Broadcast retry triggered successfully', 
        new_schedule_id: newScheduleId 
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to retry broadcast' });
    } finally {
      client.release();
    }
  });
}
