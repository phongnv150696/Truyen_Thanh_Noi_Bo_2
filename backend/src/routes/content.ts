import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function contentRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all content items
  fastify.get('/', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT id, title, summary, body, status, tags, author_id, created_at FROM content_items ORDER BY created_at DESC');
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Get single content item
  fastify.get('/:id', async (request: any, reply) => {
    const { id } = request.params;
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
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
    const { title, body, summary, tags, status, author_id } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO content_items (title, body, summary, tags, status, author_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [title, body, summary, tags || [], status || 'draft', author_id]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 4. Update content item
  fastify.put('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { title, body, summary, tags, status } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'UPDATE content_items SET title = $1, body = $2, summary = $3, tags = $4, status = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [title, body, summary, tags, status, id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Content not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 5. Delete content item
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
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
}
