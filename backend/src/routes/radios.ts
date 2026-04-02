import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import axios from 'axios';

export default async function radioRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // Get all radios
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM radios ORDER BY id DESC');
      return rows;
    } finally {
      client.release();
    }
  });

  // Add a new radio
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster'])] }, async (request: any, reply) => {
    const { name, url, description } = request.body;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO radios (name, url, description) VALUES ($1, $2, $3) RETURNING *',
        [name, url, description]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // Delete a radio
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const client = await fastify.pg.connect();
    try {
      await client.query('DELETE FROM radios WHERE id = $1', [id]);
      return { success: true };
    } finally {
      client.release();
    }
  });

  // Play a radio station
  fastify.post('/:id/play', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'broadcaster', 'commander'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { channel_id } = request.body; // Optional: specify channel
    
    const client = await fastify.pg.connect();
    try {
      const radioRes = await client.query('SELECT * FROM radios WHERE id = $1', [id]);
      if (radioRes.rows.length === 0) return reply.status(404).send({ error: 'Radio not found' });
      
      const radio = radioRes.rows[0];
      
      // Trigger XiaoZhi Broadcast
      // We send a request to the Python server
      try {
        await axios.post('http://127.0.0.1:8003/xiaozhi/broadcast', {
          media_url: radio.url,
          title: `Radio: ${radio.name}`,
          is_emergency: false,
          device_id: "*" // Broadcast to all for now, or filter by channel if needed
        });
      } catch (err: any) {
        fastify.log.error(`Failed to trigger XiaoZhi Radio: ${err.message}`);
      }

      // Also broadcast to standard ESP32 devices via WebSocket if they support stream URLs
      fastify.broadcast({
        type: 'broadcast-start',
        content: {
          id: `radio-${radio.id}`,
          title: radio.name,
          file_url: radio.url,
          is_radio: true
        },
        channel_id: channel_id || null
      });

      return { success: true, message: `Đang phát đài ${radio.name}` };
    } finally {
      client.release();
    }
  });

  // Stop broadcasting
  fastify.post('/stop', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    fastify.broadcast({
      type: 'broadcast-stop'
    });
    return { success: true };
  });
}
