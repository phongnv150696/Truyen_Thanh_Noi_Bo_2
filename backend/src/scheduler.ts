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
      ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS radio_id INTEGER REFERENCES radios(id)
    `);
    fastify.log.info('✅ Scheduler: schema columns ensured (triggered_at, stopped_at, radio_id)');
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
            s.id, s.scheduled_time, s.triggered_at, s.channel_id, s.content_id, s.radio_id, s.duration,
            c.name as channel_name, c.mount_point,
            ci.title as content_title,
            mf.file_path, mf.file_name,
            r.name as radio_name, r.url as radio_url,
            u.full_name as created_by_name
          FROM broadcast_schedules s
          JOIN channels c ON s.channel_id = c.id
          LEFT JOIN content_items ci ON s.content_id = ci.id
          LEFT JOIN radios r ON s.radio_id = r.id
          LEFT JOIN media_files mf ON ci.id = mf.content_id
          LEFT JOIN users u ON ci.author_id = u.id
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
            const isRadio = !!schedule.radio_id;
            (fastify as any).broadcast({
              type: 'broadcast-start',
              channel_id: schedule.channel_id,
              schedule_id: schedule.id,
              title: isRadio ? `Radio: ${schedule.radio_name}` : (schedule.content_title || 'Bản tin mới'),
              channel: schedule.channel_name || 'Kênh mặc định',
              mount_point: schedule.mount_point,
              file_url: isRadio 
                ? schedule.radio_url 
                : (schedule.file_path ? getFullURL(`uploads/${schedule.file_path}`) : null),
              is_radio: isRadio,
              duration: schedule.duration ? parseInt(schedule.duration) : 300,
              user: schedule.created_by_name || 'Hệ thống',
              scheduled: true
            });
            fastify.log.info(`[SCHEDULER] Broadcast command sent for id=${schedule.id} (${isRadio ? 'Radio' : 'Content'}, duration=${schedule.duration}s)`);
          } else {
            fastify.log.error('[SCHEDULER] fastify.broadcast decorator is NOT found!');
          }

        // Log into broadcast_sessions
        try {
          await fastify.pg.query(`
            INSERT INTO broadcast_sessions (schedule_id, content_id, radio_id, channel_id, start_time, duration, status)
            SELECT s.id, s.content_id, s.radio_id, s.channel_id, NOW(), COALESCE(s.duration, 300), 'completed'
            FROM broadcast_schedules s WHERE s.id = $1
            ON CONFLICT DO NOTHING
          `, [schedule.id]);
        } catch (e: any) {
          fastify.log.error(`[SCHEDULER] Failed to log session: ${e.message}`);
        }
      }

      if (result.rows.length > 0) {
        fastify.log.info(`✅ Triggered ${result.rows.length} scheduled broadcast(s)`);
      }
    } catch (err: any) {
      fastify.log.error(`[SCHEDULER] Broadcast error: ${err.message}`);
    }
  };

  const checkAndStop = async () => {
    try {
      const timeCheck = await fastify.pg.query('SELECT NOW() as db_now');
      const dbNow = timeCheck.rows[0].db_now;

      // Find all schedules with a duration that have been triggered but not stopped yet
      const query = `
        SELECT s.id, s.channel_id, c.name as channel_name
        FROM broadcast_schedules s
        JOIN channels c ON s.channel_id = c.id
        WHERE s.triggered_at IS NOT NULL
          AND s.stopped_at IS NULL
          AND s.duration > 0
          AND s.triggered_at + (s.duration * INTERVAL '1 second') <= $1
      `;
      const result = await fastify.pg.query(query, [dbNow]);

      for (const row of result.rows) {
        fastify.log.info(`[SCHEDULER] Stopping expired broadcast: schedule_id=${row.id} on channel=${row.channel_name}`);
        
        if ((fastify as any).broadcast) {
          (fastify as any).broadcast({
            type: 'broadcast-stop',
            channel_id: row.channel_id,
            schedule_id: row.id
          });
        }
        
        await fastify.pg.query('UPDATE broadcast_schedules SET stopped_at = $1 WHERE id = $2', [dbNow, row.id]);
      }
    } catch (err: any) {
      fastify.log.error(`[SCHEDULER] Stop check error: ${err.message}`);
    }
  };

  const checkDeviceHealth = async () => {
    try {
      // 1. Find devices that are 'online' but haven't been seen for more than 2 minutes
      // We use RETURNING * to get the devices that were actually updated
      const query = `
        UPDATE devices 
        SET status = 'offline' 
        WHERE status = 'online' 
          AND (last_seen < NOW() - INTERVAL '2 minutes' OR last_seen IS NULL)
        RETURNING *
      `;
      const result = await fastify.pg.query(query);
      
      if (result.rows.length > 0) {
        fastify.log.info(`[HEALTH CHECK] Marked ${result.rows.length} device(s) as offline due to inactivity.`);
        
        // 2. Broadcast each status change via WebSocket
        for (const device of result.rows) {
          if ((fastify as any).broadcast) {
            (fastify as any).broadcast({
              type: 'device_status_update',
              device: device
            });
          }
        }
      }
    } catch (err: any) {
      fastify.log.error(`[HEALTH CHECK] Error during device health check: ${err.message}`);
    }
  };

  // Run immediately on start, then every 30 seconds
  await checkAndBroadcast();
  await checkAndStop();
  await checkDeviceHealth();
  
  setInterval(async () => {
    await checkAndBroadcast();
    await checkAndStop();
    await checkDeviceHealth();
  }, 30000);
}
