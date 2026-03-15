import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function dashboardRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get Dashboard Summary Stats
  fastify.get('/stats', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      // Aggregate data from multiple tables
      const [
        deviceStats,
        mediaStats,
        userStats,
        broadcastHistory,
        scheduleProposals
      ] = await Promise.all([
        client.query('SELECT COUNT(*) as total, COUNT(status) FILTER (WHERE status = $1) as online FROM devices', ['online']),
        client.query('SELECT COUNT(*) as total, SUM(file_size) as total_size FROM media_files'),
        client.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE rank = $1) as pending FROM users', ['pending']),
        client.query(`
          SELECT 
            bs.id, 
            bs.start_time, 
            c.name as channel_name, 
            ci.title as content_title 
          FROM broadcast_schedules bs
          JOIN channels c ON bs.channel_id = c.id
          JOIN content_items ci ON bs.content_id = ci.id
          ORDER BY bs.start_time DESC 
          LIMIT 5
        `),
        client.query('SELECT COUNT(*) as count FROM broadcast_schedules WHERE active = FALSE')
      ]);

      return {
        devices: {
          total: parseInt(deviceStats.rows[0].total),
          online: parseInt(deviceStats.rows[0].online)
        },
        media: {
          total: parseInt(mediaStats.rows[0].total),
          totalSize: parseInt(mediaStats.rows[0].total_size || '0')
        },
        users: {
          total: parseInt(userStats.rows[0].total),
          pending: parseInt(userStats.rows[0].pending)
        },
        history: broadcastHistory.rows,
        proposals: parseInt(scheduleProposals.rows[0].count)
      };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch dashboard stats' });
    } finally {
      client.release();
    }
  });
}
