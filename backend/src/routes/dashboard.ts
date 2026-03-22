import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function dashboardRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get Dashboard Summary Stats
  fastify.get('/stats', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      // Aggregate data from multiple tables
      let deviceStats, mediaStats, userStats, broadcastHistory, scheduleProposals, pendingContentCount;
      
      try {
        const res = await client.query('SELECT COUNT(*) as total, COUNT(status) FILTER (WHERE status = $1) as online FROM devices', ['online']);
        deviceStats = res.rows[0];
      } catch (err) {
        fastify.log.error(err as any);
        throw err;
      }

      try {
        const res = await client.query('SELECT COUNT(*) as total, SUM(file_size) as total_size FROM media_files');
        mediaStats = res.rows[0];
      } catch (err) {
        fastify.log.error(err as any);
        throw err;
      }

      try {
        const [usersCount, pendingCount] = await Promise.all([
            client.query('SELECT COUNT(*) as total FROM users'),
            client.query('SELECT COUNT(*) as pending FROM user_registrations WHERE status = $1', ['pending'])
        ]);
        userStats = {
            total: usersCount.rows[0].total,
            pending: pendingCount.rows[0].pending
        };
      } catch (err) {
        fastify.log.error(err as any);
        throw err;
      }

      try {
        // Checking for history - using broadcast_schedules and joining with content/channels
        // Using scheduled_time as seen in seed scripts
        const res = await client.query(`
          SELECT 
            bs.id, 
            bs.scheduled_time as start_time, 
            c.name as channel_name, 
            ci.title as content_title 
          FROM broadcast_schedules bs
          JOIN channels c ON bs.channel_id = c.id
          JOIN content_items ci ON bs.content_id = ci.id
          ORDER BY bs.scheduled_time DESC 
          LIMIT 5
        `);
        broadcastHistory = res.rows;
      } catch (err) {
        fastify.log.error(err as any);
        throw err;
      }

      try {
        const res = await client.query('SELECT COUNT(*) as count FROM content_items WHERE status = $1', ['pending_review']);
        pendingContentCount = res.rows[0].count;
      } catch (err) {
        fastify.log.error(err as any);
        throw err;
      }

      try {
        // Proposals - Let's make this reflect total pending actions (content + users)
        const res = await client.query('SELECT COUNT(*) as count FROM broadcast_schedules');
        scheduleProposals = res.rows[0];
      } catch (err) {
        fastify.log.error(err as any);
        throw err;
      }

      return {
        devices: {
          total: parseInt(deviceStats.total || '0'),
          online: parseInt(deviceStats.online || '0')
        },
        media: {
          total: parseInt(mediaStats.total || '0'),
          totalSize: parseInt(mediaStats.total_size || '0')
        },
        users: {
          total: parseInt(userStats.total || '0'),
          pending: parseInt(userStats.pending || '0')
        },
        pending_content: parseInt(pendingContentCount || '0'),
        history: broadcastHistory,
        proposals: parseInt(scheduleProposals.count || '0')
      };
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to fetch dashboard stats', detail: err.message });
    } finally {
      client.release();
    }
  });
}
