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

  // 2. Analyze policy
  fastify.post('/analyze-policy', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { text } = request.body;
    if (!text) return reply.code(400).send({ error: 'No text provided' });
    const result = await aiService.analyzeContentPolicy(text);
    return result;
  });

  // 3. Generate script (moved from existing logic if needed, or kept redundant)
  fastify.post('/generate-script', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const { rawText } = request.body;
    const script = await aiService.generateScript(rawText);
    return script;
  });
}
