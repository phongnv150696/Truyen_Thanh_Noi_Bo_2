import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function dashboardRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get Dashboard Summary Stats (Scoped by Unit)
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
      let unitFilter = '';
      const params: any[] = [];
      let unitIds: number[] = [];
      const isAdmin = (user.role_name?.toLowerCase() === 'admin' || user.id === 1);

      if (!isAdmin) {
        unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'WHERE unit_id = ANY($1)';
        params.push(unitIds);
      }

      // 1. Device Stats
      const deviceRes = await client.query(`
        SELECT COUNT(*) as total, COUNT(status) FILTER (WHERE status = 'online') as online 
        FROM devices ${unitFilter}
      `, params);
      const deviceStats = deviceRes.rows[0];

      // 2. Media Stats
      const mediaRes = await client.query(`
        SELECT COUNT(id) as total, SUM(file_size) as total_size 
        FROM media_files
        ${!isAdmin ? 'WHERE unit_id = ANY($1)' : ''}
      `, params);
      const mediaStats = mediaRes.rows[0];

      // 3. User Stats
      const usersCountRes = await client.query(`SELECT COUNT(*) as total FROM users ${unitFilter}`, params);
      const pendingRegRes = await client.query(`
        SELECT COUNT(*) as pending 
        FROM user_registrations 
        WHERE status = 'pending' ${!isAdmin ? 'AND unit_id = ANY($1)' : ''}
      `, params);
      const userStats = {
        total: usersCountRes.rows[0].total,
        pending: pendingRegRes.rows[0].pending
      };

      // 4. Pending Content
      const pendingContentRes = await client.query(`
        SELECT COUNT(c.id) as count 
        FROM content_items c
        LEFT JOIN users u ON c.author_id = u.id
        WHERE c.status = 'pending_review' 
        ${!isAdmin ? 'AND (u.unit_id = ANY($1) OR c.unit_id = ANY($1))' : ''}
      `, params);
      const pendingContentCount = pendingContentRes.rows[0].count;

      // 5. Broadcast History (Last 5)
      const broadcastHistoryRes = await client.query(`
        SELECT 
          bs.id, bs.scheduled_time as start_time, 
          c.name as channel_name, ci.title as content_title 
        FROM broadcast_schedules bs
        JOIN channels c ON bs.channel_id = c.id
        LEFT JOIN content_items ci ON bs.content_id = ci.id
        ${!isAdmin ? 'WHERE c.unit_id = ANY($1)' : ''}
        ORDER BY bs.scheduled_time DESC 
        LIMIT 5
      `, params);
      const broadcastHistory = broadcastHistoryRes.rows;

      // 6. Schedule Proposals (Total active schedules for unit)
      const scheduleRes = await client.query(`
        SELECT COUNT(bs.id) as count 
        FROM broadcast_schedules bs
        JOIN channels c ON bs.channel_id = c.id
        ${!isAdmin ? 'WHERE c.unit_id = ANY($1)' : ''}
      `, params);
      const scheduleProposals = scheduleRes.rows[0];

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
    } finally {
      client.release();
    }
  });
}
