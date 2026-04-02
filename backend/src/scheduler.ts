import { FastifyInstance } from 'fastify';
import { getFullURL } from './utils/url.js';
import { exec } from 'child_process';

/**
 * Chuyển đổi đối tượng INTERVAL của Postgres (từ pg) thành tổng số giây
 */
function intervalToSeconds(interval: any): number {
  if (!interval) return 300; // Mặc định 5p
  if (typeof interval === 'number') return interval;
  if (typeof interval === 'string') return parseInt(interval) || 300;
  
  // pg trả về object: { hours, minutes, seconds, milliseconds, ... }
  const h = interval.hours || 0;
  const m = interval.minutes || 0;
  const s = interval.seconds || 0;
  const ms = interval.milliseconds || 0;
  
  return h * 3600 + m * 60 + s + Math.round(ms / 1000);
}

/**
 * Auto-Scheduler: Runs every 30 seconds, checks DB for pending broadcasts.
 * A broadcast is triggered when:
 *   - scheduled_time <= NOW()
 *   - is_active = true
 *   - has not been triggered yet (status != 'completed' AND triggered_at IS NULL)
 */
export async function startScheduler(fastify: FastifyInstance) {
  fastify.log.info('🕐 Auto-Scheduler started (checking every 30s)');

  // Auto-migrate: ensure correct types for timezone handling
  try {
    // 1. Chuyển đổi các cột hiện có sang TIMESTAMPTZ (nếu chưa có)
    await fastify.pg.query(`
      ALTER TABLE broadcast_schedules 
      ADD COLUMN IF NOT EXISTS triggered_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS radio_id INTEGER REFERENCES radios(id);
      
      -- Convert existing columns to TIMESTAMPTZ
      ALTER TABLE broadcast_schedules ALTER COLUMN scheduled_time TYPE TIMESTAMPTZ;
      ALTER TABLE broadcast_schedules ALTER COLUMN created_at TYPE TIMESTAMPTZ;
    `);
    
    // 2. Chuyển đổi bảng sessions
    await fastify.pg.query(`
      ALTER TABLE broadcast_sessions ALTER COLUMN start_time TYPE TIMESTAMPTZ;
      ALTER TABLE broadcast_sessions ALTER COLUMN end_time TYPE TIMESTAMPTZ;
      ALTER TABLE broadcast_sessions ALTER COLUMN created_at TYPE TIMESTAMPTZ;
    `);

    fastify.log.info('✅ Scheduler: Schema migrated to TIMESTAMPTZ for accurate timezone support');
  } catch (err: any) {
    fastify.log.warn(`Scheduler migration warning: ${err.message}`);
  }

    const checkAndBroadcast = async () => {
      try {
        // Luôn đảm bảo so sánh thời gian chính xác theo múi giờ Việt Nam
        await fastify.pg.query("SET timezone = 'Asia/Ho_Chi_Minh'");
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
          // If it's a recurring schedule, calculate and set the NEXT occurrence
          const repeatPattern = schedule.repeat_pattern || 'none';
          if (repeatPattern === 'daily') {
            await fastify.pg.query(
              `UPDATE broadcast_schedules 
               SET triggered_at = NULL, 
                   scheduled_time = scheduled_time + INTERVAL '1 day',
                   stopped_at = NULL 
               WHERE id = $1`,
              [schedule.id]
            );
            fastify.log.info(`[SCHEDULER] Daily schedule ${schedule.id} updated to next occurrence.`);
          } else if (repeatPattern === 'weekly') {
            await fastify.pg.query(
              `UPDATE broadcast_schedules 
               SET triggered_at = NULL, 
                   scheduled_time = scheduled_time + INTERVAL '7 days',
                   stopped_at = NULL 
               WHERE id = $1`,
              [schedule.id]
            );
            fastify.log.info(`[SCHEDULER] Weekly schedule ${schedule.id} updated to next occurrence.`);
          } else {
            // No repeat - standard trigger marking
            await fastify.pg.query(
              `UPDATE broadcast_schedules SET triggered_at = $1 WHERE id = $2`,
              [dbNow, schedule.id]
            );
          }

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
              duration: intervalToSeconds(schedule.duration),
              user: schedule.created_by_name || 'Hệ thống',
              scheduled: true
            });
            fastify.log.info(`[SCHEDULER] Broadcast command sent for id=${schedule.id} (${isRadio ? 'Radio' : 'Content'}, duration=${intervalToSeconds(schedule.duration)}s)`);
          } else {
            fastify.log.error('[SCHEDULER] fastify.broadcast decorator is NOT found!');
          }

          // Log into broadcast_sessions
          try {
            await fastify.pg.query(`
              INSERT INTO broadcast_sessions (schedule_id, content_id, radio_id, channel_id, start_time, duration, status)
              SELECT s.id, s.content_id, s.radio_id, s.channel_id, $1, COALESCE(s.duration, INTERVAL '300 seconds'), 'completed'
              FROM broadcast_schedules s WHERE s.id = $2
              ON CONFLICT DO NOTHING
            `, [dbNow, schedule.id]);
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
          AND s.duration IS NOT NULL
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
      // Find devices that are 'online' but haven't been seen for more than 2 minutes
      // Only mark devices offline if they have NO ip_address (WebSocket-only devices)
      // Devices with ip_address are managed by pingAllDevices() instead
      const query = `
        UPDATE devices 
        SET status = 'offline' 
        WHERE status = 'online' 
          AND (ip_address IS NULL OR ip_address = '')
          AND (last_seen < NOW() - INTERVAL '2 minutes' OR last_seen IS NULL)
        RETURNING *
      `;
      const result = await fastify.pg.query(query);
      
      if (result.rows.length > 0) {
        fastify.log.info(`[HEALTH CHECK] Marked ${result.rows.length} device(s) as offline due to inactivity.`);
        
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

  // Ping devices by IP using ICMP (system ping) to auto-detect online/offline
  const pingDevice = (ip: string): Promise<boolean> => {
    return new Promise((resolve) => {
      // Windows: ping -n 1 -w 1500 <ip>
      // -n 1: 1 packet, -w 1500: 1.5s timeout
      exec(`ping -n 1 -w 1500 ${ip}`, (error: any, stdout: string) => {
        if (error) {
          resolve(false);
          return;
        }
        // Success if output contains 'Reply from' or 'bytes='
        const isAlive = stdout.includes('Reply from') || stdout.includes('bytes=');
        resolve(isAlive);
      });
    });
  };

  const pingAllDevices = async () => {
    try {
      // Get all devices that have an IP address
      const { rows: devices } = await fastify.pg.query(`
        SELECT id, name, ip_address, status 
        FROM devices 
        WHERE ip_address IS NOT NULL AND ip_address != ''
      `);

      if (devices.length === 0) return;

      for (const device of devices) {
        try {
          const isAlive = await pingDevice(device.ip_address);

          const newStatus = isAlive ? 'online' : 'offline';

          if (newStatus !== device.status) {
            const { rows } = await fastify.pg.query(
              `UPDATE devices SET status = $1, last_seen = CASE WHEN $1 = 'online' THEN NOW() ELSE last_seen END WHERE id = $2 RETURNING *`,
              [newStatus, device.id]
            );

            fastify.log.info(`[PING] Device "${device.name}" (${device.ip_address}): ${device.status} → ${newStatus}`);

            if ((fastify as any).broadcast && rows.length > 0) {
              (fastify as any).broadcast({
                type: 'device_status_update',
                device: rows[0]
              });
            }
          } else if (isAlive) {
            // Keep last_seen fresh
            await fastify.pg.query(
              `UPDATE devices SET last_seen = NOW() WHERE id = $1`,
              [device.id]
            );
          }
        } catch (pingErr: any) {
          fastify.log.warn(`[PING] Failed to ping device ${device.name}: ${pingErr.message}`);
        }
      }
    } catch (err: any) {
      fastify.log.error(`[PING] Error in pingAllDevices: ${err.message}`);
    }
  };

  // Run immediately on start, then every 30 seconds
  await checkAndBroadcast();
  await checkAndStop();
  await checkDeviceHealth();
  await pingAllDevices(); // Run ping on startup

  setInterval(async () => {
    await checkAndBroadcast();
    await checkAndStop();
    await checkDeviceHealth();
    await pingAllDevices(); // Ping every 30 seconds
  }, 30000);
}
