import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getFullURL } from '../utils/url.js';
import mammoth from 'mammoth';

export default async function contentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 0. Import Word Content
  fastify.post('/import-word', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor', 'commander'])] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'Không tìm thấy tệp tải lên' });
    }

    if (!data.filename.endsWith('.docx')) {
      return reply.code(400).send({ error: 'Vui lòng chỉ tải lên tệp định dạng .docx' });
    }

    try {
      const buffer = await data.toBuffer();
      const result = await mammoth.extractRawText({ buffer });
      
      return { 
        text: result.value,
        title: data.filename.replace('.docx', '')
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Lỗi khi đọc tệp Word' });
    }
  });
  
  // 1. Get all content items
  fastify.get('/', async (request: any, reply) => {
    const { status } = request.query;
    const client = await fastify.pg.connect();
    try {
      let query = `
        SELECT 
          c.id, c.title, c.summary, c.body, c.status, c.tags, c.author_id, c.created_at,
          u.full_name as author_name,
          EXISTS(SELECT 1 FROM broadcast_schedules s WHERE s.content_id = c.id AND s.is_active = TRUE) as is_scheduled,
          EXISTS(SELECT 1 FROM media_files m WHERE m.content_id = c.id) as has_audio
        FROM content_items c 
        LEFT JOIN users u ON c.author_id = u.id
      `;
      const params = [];
      if (status) {
        query += ` WHERE c.status = $1`;
        params.push(status);
      }
      query += ` ORDER BY c.created_at DESC`;
      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  fastify.get('/pending', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const query = `
        SELECT 
          c.*, 
          u.full_name as author_name, 
          u.rank as author_rank,
          un.name as unit_name,
          (SELECT file_path FROM media_files WHERE content_id = c.id LIMIT 1) as audio_path
        FROM content_items c
        LEFT JOIN users u ON c.author_id = u.id
        LEFT JOIN units un ON u.unit_id = un.id
        WHERE c.status = 'pending_review'
        ORDER BY c.created_at DESC
      `;
      const { rows } = await client.query(query);
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Get single content item
  fastify.get('/:id', async (request: any, reply) => {
    const { id } = request.params; console.log("[PLAY] Request to play content ID: " + id);
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM content_items WHERE id = $1', [id]);
      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Content not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 3. Create content item
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor', 'commander'])] }, async (request: any, reply) => {
    const { title, body, summary, tags, status, author_id } = request.body;
    const client = await fastify.pg.connect();
    try {
      const tagsArray = tags || [];
      const isEmergency = tagsArray.includes('Khẩn');
      const finalStatus = isEmergency ? 'approved' : (status || 'pending_review');

      const { rows } = await client.query(
        'INSERT INTO content_items (title, body, summary, tags, status, author_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, body, summary, tagsArray, finalStatus, author_id]
      );
      const content = rows[0];

      // EMERGENCY BYPASS LOGGING: If it was an emergency, log it specifically
      if (isEmergency) {
        try {
          await client.query(
            'INSERT INTO audit_logs (user_id, action, target_table, details) VALUES ($1, $2, $3, $4)',
            [author_id, 'EMERGENCY_BYPASS', 'content_items', JSON.stringify({ 
              reason: 'Tag Khẩn detected', 
              content_id: content.id, 
              title: content.title 
            })]
          );
        } catch (logErr) {
          fastify.log.error(logErr, 'Failed to log emergency bypass');
        }
      }
      
      // Notify when new content is pending review (wrapped in try-catch to avoid breaking main flow)
      if (content.status === 'pending_review') {
        try {
          const userIdResult = await client.query(`
            SELECT u.id FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE r.name = $1 LIMIT 1
          `, ['admin']);
          const adminId = userIdResult.rows[0]?.id || null;

          await client.query(
            `INSERT INTO notifications (user_id, title, message, type, link, sender_name, priority) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [adminId, 'Bản tin mới chờ duyệt', 'Bạn có 1 bản tin mới chờ duyệt.', 'info', 'ai', 'Hệ thống Content', 'medium']
          );
        } catch (notifyErr) {
          fastify.log.error({ err: notifyErr }, 'Failed to send notification');
        }
      }

      return content;
    } finally {
      client.release();
    }
  });

  // 4. Update content item
  fastify.put('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { title, body, summary, tags, status, comments } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        `UPDATE content_items SET 
          title = COALESCE($1, title), 
          body = COALESCE($2, body), 
          summary = COALESCE($3, summary), 
          tags = COALESCE($4, tags), 
          status = COALESCE($5, status), 
          updated_at = CURRENT_TIMESTAMP 
        WHERE id = $6 RETURNING *`,
        [title, body, summary, tags, status, id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Content not found' });
      }

      const content = rows[0];

      // Record human review if status is being updated to a final state
      if (status === 'approved' || status === 'rejected') {
        try {
          await client.query(
            'INSERT INTO content_reviews (content_id, reviewer_type, reviewer_id, comments) VALUES ($1, $2, $3, $4)',
            [id, 'human', request.user.id, comments || '']
          );
        } catch (err) {
          fastify.log.error(err, 'Failed to insert content review record');
        }
      }

      return content;
    } finally {
      client.release();
    }
  });

  // 5. Delete content item
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('DELETE FROM content_items WHERE id = $1', [id]);
      if (rowCount === 0) {
        return reply.status(404).send({ message: 'Content not found' });
      }
      return { message: 'Content deleted successfully' };
    } finally {
      client.release();
    }
  });

  // 6. Play content item immediately
  fastify.post('/:id/play', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor', 'commander', 'leader', 'technician'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      // 1. Check content and audio
      const contentRes = await client.query(`
        SELECT c.title, mf.file_path, mf.file_name
        FROM content_items c
        JOIN media_files mf ON c.id = mf.content_id
        WHERE c.id = $1 AND c.status = 'approved'
      `, [id]);
      
      if (contentRes.rowCount === 0) {
        return reply.code(400).send({ error: 'Bản tin chưa được duyệt hoặc chưa có file âm thanh.' });
      }
      
      const content = contentRes.rows[0];
      
      // 2. Get first available channel
      const channelRes = await client.query("SELECT id, name, mount_point FROM channels WHERE status = 'online' LIMIT 1");
      if (channelRes.rowCount === 0) {
        return reply.code(400).send({ error: 'Không có kênh nào đang trực tuyến để phát.' });
      }
      const channel = channelRes.rows[0];
      
      // 3. Create a temporary schedule
      const scheduleRes = await client.query(`
        INSERT INTO broadcast_schedules (channel_id, content_id, scheduled_time, duration, is_active)
        VALUES ($1, $2, NOW(), '00:10:00', true)
        RETURNING id
      `, [channel.id, id]);
      
      const scheduleId = scheduleRes.rows[0].id;

      // 4. Trigger broadcast via WebSocket
      if (fastify.broadcast) {
        const host = request.headers.host || 'localhost:3000';
        const protocol = request.protocol || 'http';
        
        fastify.broadcast({
          type: 'broadcast-start',
          channel_id: channel.id,
          schedule_id: scheduleId,
          title: content.title,
          channel: channel.name,
          mount_point: channel.mount_point,
          file_url: content.file_path ? getFullURL(`uploads/${content.file_path}`) : null,
          user: request.user?.full_name || 'Admin'
        });
      }

      // 5. Audit Log
      await client.query(`
        INSERT INTO audit_logs (user_id, action, target_table, target_id, details)
        VALUES ($1, 'IMMEDIATE_BROADCAST', 'content_items', $2, $3)
      `, [request.user.id, id, JSON.stringify({ channel_id: channel.id, schedule_id: scheduleId })]);
      
      return { 
        message: 'Đã bắt đầu phát bản tin ngay lập tức.',
        channel_name: channel.name
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Lỗi hệ thống khi kích hoạt phát sóng.' });
    } finally {
      client.release();
    }
  });
}
