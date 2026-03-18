import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AIAgentService } from '../services/ai-agent.js';

export default async function aiRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const aiService = new AIAgentService(fastify);

  // 1. Trigger AI Review
  fastify.get('/review/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
    const { id } = request.params;
    try {
      const result = await aiService.reviewContent(parseInt(id));
      
      // Also generate a schedule suggestion automatically after review
      await aiService.generateScheduleSuggestion(parseInt(id));
      
      return { 
        message: 'AI Review completed and schedule suggested', 
        analysis: result 
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: err.message });
    }
  });

  // 2. Clear/List AI Suggestions
  fastify.get('/suggestions', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'commander', 'editor'])] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const query = `
        SELECT 
          s.*, 
          c.title as content_title 
        FROM ai_suggestions s
        JOIN content_items c ON s.content_id = c.id
        WHERE s.is_applied = FALSE
        ORDER BY s.created_at DESC
      `;
      const { rows } = await client.query(query);
      return rows;
    } finally {
      client.release();
    }
  });

  // 3. Apply Suggestion
  fastify.get('/suggestions/:id/apply', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    
    try {
      // Get suggestion details
      const { rows } = await client.query('SELECT * FROM ai_suggestions WHERE id = $1', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'Suggestion not found' });
      
      const suggestion = rows[0];
      
      // Simulate applying: In a real app, this would parse 'suggested_text' or use structured data
      // For this simulator, we'll just create a placeholder schedule
      const insertSchedule = `
        INSERT INTO broadcast_schedules (content_id, channel_id, scheduled_time, repeat_pattern)
        VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '1 day', 'none')
        RETURNING id
      `;
      // Default to channel 1 if not specified
      const scheduleResult = await client.query(insertSchedule, [suggestion.content_id, 1]);
      
      // Mark suggestion as applied
      await client.query('UPDATE ai_suggestions SET is_applied = TRUE WHERE id = $1', [id]);
      
      return { 
        message: 'Suggestion applied successfully', 
        scheduleId: scheduleResult.rows[0].id 
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to apply suggestion' });
    } finally {
      client.release();
    }
  });

  // 4. Generate Script from Raw Text
  fastify.post('/generate-script', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { rawText } = request.body;
    if (!rawText) return reply.code(400).send({ error: 'Raw text is required' });
    
    try {
      const result = await aiService.generateScript(rawText);
      return result;
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'AI Generation failed' });
    }
  });
}
