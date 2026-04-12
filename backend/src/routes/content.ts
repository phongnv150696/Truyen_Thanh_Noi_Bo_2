import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { getFullURL } from '../utils/url.js';
import mammoth from 'mammoth';
import { AIAgentService } from '../services/ai-agent.js';

export default async function contentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const aiService = new AIAgentService(fastify);
  
  // 1. Get all content items (Strictly Scoped by Entity Unit)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    const { status } = request.query;
    const user = request.user;
    const client = await fastify.pg.connect();
    
    try {
      let unitFilter = '';
      const params: any[] = [];
      let paramIdx = 1;

      // Only the unique System Owner (ID 1) bypasses unit scoping completely
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        
        // Add Unit 1 (Root) to visibility for all users to see Global News
        if (!unitIds.includes(1)) unitIds.push(1);

        unitFilter = `WHERE c.unit_id = ANY($${paramIdx++})`;
        params.push(unitIds);
      }

      if (status) {
        unitFilter += unitFilter ? ` AND c.status = $${paramIdx++}` : ` WHERE c.status = $${paramIdx++}`;
        params.push(status);
      }

      const query = `
        SELECT 
          c.id, c.title, c.summary, c.body, c.status, c.tags, c.author_id, c.created_at,
          u.full_name as author_name,
          EXISTS(SELECT 1 FROM broadcast_schedules s WHERE s.content_id = c.id AND s.is_active = TRUE) as is_scheduled,
          EXISTS(SELECT 1 FROM media_files m WHERE m.content_id = c.id) as has_audio
        FROM content_items c 
        LEFT JOIN users u ON c.author_id = u.id
        ${unitFilter}
        ORDER BY c.created_at DESC
      `;
      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  // 1.1 Get pending content items (Strictly Scoped)
  fastify.get('/pending', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = "WHERE c.status = 'pending_review'";
      const params: any[] = [];

      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        
        // Add Unit 1 (Root) to visibility for all users to see Global News
        if (!unitIds.includes(1)) unitIds.push(1);

        unitFilter += ' AND c.unit_id = ANY($1)';
        params.push(unitIds);
      }

      const query = `
        SELECT 
          c.*, 
          u.full_name as author_name, 
          u.rank as author_rank,
          un.name as unit_name,
          (SELECT file_path FROM media_files WHERE content_id = c.id LIMIT 1) as audio_path
        FROM content_items c
        LEFT JOIN users u ON c.author_id = u.id
        LEFT JOIN units un ON c.unit_id = un.id
        ${unitFilter}
        ORDER BY c.created_at DESC
      `;
      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  // 3. Create content item
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply: any) => {
    const { title, body, summary, tags, status, author_id } = request.body;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const tagsArray = tags || [];
      const validationResults = await aiService.analyzeContentPolicy(body);

      const { rows } = await client.query(
        'INSERT INTO content_items (title, body, summary, tags, status, author_id, unit_id, validation_results) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [title, body, summary, tagsArray, status || 'pending_review', author_id, user.unit_id, JSON.stringify(validationResults)]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 4. Update content item (Scoped)
  const updateHandler = async (request: any, reply: any) => {
    const { id } = request.params;
    const { title, body, summary, tags, status } = request.body;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
        if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
            const existing = await client.query('SELECT unit_id FROM content_items WHERE id = $1', [id]);
            if (existing.rowCount === 0) return reply.code(404).send({ error: 'Content not found' });
            
            const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
            const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
            if (!unitIds.includes(existing.rows[0].unit_id)) {
                return reply.code(403).send({ error: 'Bạn không có quyền chỉnh sửa nội dung của đơn vị khác.' });
            }
        }

      const { rows } = await client.query(
        `UPDATE content_items SET 
          title = COALESCE($1, title), body = COALESCE($2, body), 
          summary = COALESCE($3, summary), tags = COALESCE($4, tags), 
          status = COALESCE($5, status), updated_at = CURRENT_TIMESTAMP 
        WHERE id = $6 RETURNING *`,
        [title, body, summary, tags, status, id]
      );
      return rows[0];
    } finally {
      client.release();
    }
  };

  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, updateHandler);
  fastify.put('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, updateHandler);

  // 5. Delete content item (Scoped)
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply: any) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
          const existing = await client.query('SELECT unit_id FROM content_items WHERE id = $1', [id]);
          const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
          const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
          if (existing.rowCount === 0 || !unitIds.includes(existing.rows[0].unit_id)) {
              return reply.code(403).send({ error: 'Bạn không có quyền xóa nội dung của đơn vị khác.' });
          }
      }
      await client.query('DELETE FROM content_items WHERE id = $1', [id]);
      return { message: 'Content deleted successfully' };
    } finally {
      client.release();
    }
  });
  // 6. Import Word document (.docx) to raw text
  fastify.post('/import-word', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    try {
      const data = await request.file();
      if (!data) {
        return reply.code(400).send({ error: 'Không tìm thấy tệp đính kèm.' });
      }

      if (!data.filename.toLowerCase().endsWith('.docx')) {
        return reply.code(400).send({ error: 'Chỉ hỗ trợ tệp định dạng .docx' });
      }

      const buffer = await data.toBuffer();
      
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value;

      let title = data.filename.replace(/\.docx$/i, '');
      
      return { 
        title, 
        text 
      };
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Lỗi trong quá trình trích xuất nội dung từ tệp Word.' });
    }
  });
}
