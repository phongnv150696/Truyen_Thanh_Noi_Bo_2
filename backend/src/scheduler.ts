import { FastifyInstance } from 'fastify';
import { getFullURL } from './utils/url.js';

/**
 * Auto-Scheduler: Runs every 30 seconds, checks DB for pending broadcasts.
 * A broadcast is triggered when:
 *   - scheduled_time <= NOW()
 *   - is_active = true
 *   - has not been triggered yet (status != 'completed' AND triggered_at IS NULL)
 */
export async function startScheduler(fastify: FastifyInstance) {
  fastify.log.info('🕐 Auto-Scheduler started (checking every 30s)');

  // Auto-migrate: add triggered_at column if it doesn't exist
  try {
    await fastify.pg.query(`
      ALTER TABLE broadcast_schedules 
      ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ
    `);
    fastify.log.info('✅ Scheduler: triggered_at column ensured');
  } catch (err: any) {
    fastify.log.warn(`Scheduler migration warning: ${err.message}`);
  }

    const checkAndBroadcast = async () => {
      try {
        const timeCheck = await fastify.pg.query('SELECT NOW() as db_now, CURRENT_TIMESTAMP as db_ts');
        const dbNow = timeCheck.rows[0].db_now;
        
        // Find all schedules that are due (be more lenient with time windows)
        const query = `
          SELECT 
            s.id, s.scheduled_time, s.triggered_at, s.channel_id,
            c.name as channel_name, c.mount_point,
            ci.title as content_title,
            mf.file_path, mf.file_name,
            u.full_name as created_by_name
          FROM broadcast_schedules s
          JOIN channels c ON s.channel_id = c.id
          JOIN content_items ci ON s.content_id = ci.id
          LEFT JOIN media_files mf ON ci.id = mf.content_id
          LEFT JOIN users u ON s.created_by = u.id
          WHERE s.is_active = true
            AND s.scheduled_time <= $1
            AND (s.triggered_at IS NULL)
            AND s.scheduled_time >= $1 - INTERVAL '15 minutes'
          LIMIT 5
        `;

        const result = await fastify.pg.query(query, [dbNow]);
        
        if (result.rows.length > 0) {
          fastify.log.info(`[SCHEDULER] Found ${result.rows.length} due schedules at DB Time: ${dbNow}`);
        }

        for (const schedule of result.rows) {
          fastify.log.info(`⏰ Triggering scheduled broadcast: ${schedule.id} - ${schedule.content_title}`);
          
          // Mark as triggered FIRST to avoid race conditions
          await fastify.pg.query(
            `UPDATE broadcast_schedules SET triggered_at = $1 WHERE id = $2`,
            [dbNow, schedule.id]
          );

          // Broadcast via WebSocket
          if ((fastify as any).broadcast) {
            (fastify as any).broadcast({
              type: 'broadcast-start',
              channel_id: schedule.channel_id,
              schedule_id: schedule.id,
              title: schedule.content_title || 'Bản tin mới',
              channel: schedule.channel_name || 'Kênh mặc định',
              mount_point: schedule.mount_point,
              file_url: schedule.file_path
                ? getFullURL(`uploads/${schedule.file_path}`)
                : null,
              user: schedule.created_by_name || 'Hệ thống',
              scheduled: true
            });
            fastify.log.info(`[SCHEDULER] Broadcast command sent for id=${schedule.id}`);
          } else {
            fastify.log.error('[SCHEDULER] fastify.broadcast decorator is NOT found!');
          }

        // Log into broadcast_sessions
        try {
          await fastify.pg.query(`
            INSERT INTO broadcast_sessions (schedule_id, content_id, channel_id, start_time, duration, status)
            SELECT s.id, s.content_id, s.channel_id, NOW(), COALESCE(s.duration, 300), 'completed'
            FROM broadcast_schedules s WHERE s.id = $1
            ON CONFLICT DO NOTHING
          `, [schedule.id]);
        } catch (e) {
          fastify.log.error(`[SCHEDULER] Failed to log session: ${e.message}`);
        }
      }

      if (result.rows.length > 0) {
        fastify.log.info(`✅ Triggered ${result.rows.length} scheduled broadcast(s)`);
      }
    } catch (err: any) {
      fastify.log.error(`Scheduler error: ${err.message}`);
    }
  };

  // Run immediately on start, then every 30 seconds
  await checkAndBroadcast();
  setInterval(checkAndBroadcast, 30000);
}
