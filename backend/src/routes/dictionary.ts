import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function dictionaryRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all dictionary entries
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM military_dictionary ORDER BY created_at DESC');
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Add new dictionary entry
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
    const { word, phonetic_reading, category } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO military_dictionary (word, phonetic_reading, category) VALUES ($1, $2, $3) RETURNING *',
        [word, phonetic_reading, category]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 3. Update dictionary entry
  fastify.put('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { word, phonetic_reading, category } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'UPDATE military_dictionary SET word = $1, phonetic_reading = $2, category = $3 WHERE id = $4 RETURNING *',
        [word, phonetic_reading, category, id]
      );
      if (rows.length === 0) {
        return reply.status(404).send({ message: 'Entry not found' });
      }
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 4. Delete dictionary entry
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query('DELETE FROM military_dictionary WHERE id = $1', [id]);
      if (rowCount === 0) {
        return reply.status(404).send({ message: 'Entry not found' });
      }
      return { message: 'Entry deleted successfully' };
    } finally {
      client.release();
    }
  });
}
