import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AIAgentService } from '../services/ai-agent.js';

export default async function aiRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  const aiService = new AIAgentService(fastify);

  // 1. Summarize content
  fastify.post('/summarize', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { text } = request.body;
    if (!text) return reply.code(400).send({ error: 'No text provided' });
    const summary = await aiService.summarizeContent(text);
    return { summary };
  });

  // 2. Validate content fully (Replaces old analyze-policy with new logic)
  fastify.post('/analyze-policy', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { text } = request.body;
    if (!text) return reply.code(400).send({ error: 'No text provided' });
    const result = await aiService.analyzeContentPolicy(text);
    return result;
  });

  // 3. Generate broadcast script from raw text
  fastify.post('/generate-script', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { rawText } = request.body;
    if (!rawText) return reply.code(400).send({ error: 'No raw text provided' });
    const result = await aiService.generateScript(rawText);
    return result;
  });
}
