import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import fp from 'fastify-plugin';

// Store connected clients with metadata
const clients = new Map<WebSocket, { channel_id?: number, device_id?: number }>();

// Helper to update channel status in DB
async function updateChannelStatus(fastify: FastifyInstance, channelId: number, status: 'online' | 'offline') {
  try {
    await fastify.pg.query(
      "UPDATE channels SET status = $1 WHERE id = $2",
      [status, channelId]
    );
    fastify.log.info(`Channel ${channelId} set to ${status}`);
  } catch (err: any) {
    fastify.log.error(`Failed to update channel ${channelId} status: ${err.message}`);
  }
}

// Helper to log broadcast start for all connected devices in a channel
async function logBroadcastStart(fastify: FastifyInstance, data: any) {
  const { channel_id, schedule_id, content_id } = data;
  if (!channel_id) return;

  try {
    // Get all online devices for this channel that are currently connected via WS
    const connectedDevices = Array.from(clients.values())
      .filter(m => m.channel_id === channel_id && m.device_id)
      .map(m => m.device_id);

    if (connectedDevices.length === 0) return;

    const client = await fastify.pg.connect();
    try {
      for (const deviceId of connectedDevices) {
        await client.query(`
          INSERT INTO device_broadcast_logs (device_id, schedule_id, content_id, channel_id, status)
          VALUES ($1, $2, $3, $4, 'playing')
        `, [deviceId, schedule_id || null, content_id || null, channel_id]);
      }
    } finally {
      client.release();
    }
  } catch (err: any) {
    fastify.log.error(`Failed to log broadcast start: ${err.message}`);
  }
}

// Helper to update log on completion/error
async function updateBroadcastLog(fastify: FastifyInstance, deviceId: number, status: 'success' | 'failed', errorMsg?: string) {
  try {
    await fastify.pg.query(`
      UPDATE device_broadcast_logs 
      SET status = $1, end_time = CURRENT_TIMESTAMP, error_message = $2
      WHERE device_id = $3 AND status = 'playing'
    `, [status, errorMsg || null, deviceId]);
  } catch (err: any) {
    fastify.log.error(`Failed to update broadcast log for device ${deviceId}: ${err.message}`);
  }
}

async function socketRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering Socket Routes...');

  // 1. Initialize all channels to offline on startup
  try {
    await fastify.pg.query("UPDATE channels SET status = 'offline'");
    fastify.log.info('✅ All channels initialized to offline');
  } catch (err: any) {
    fastify.log.error(`Failed to initialize channel statuses: ${err.message}`);
  }

  // 2. Decorate broadcast BEFORE routes
  fastify.decorate('broadcast', async (data: any) => {
    try {
      const message = JSON.stringify(data);
      const targetChannelId = data.channel_id;

      // Log start if it's a broadcast start message
      if (data.type === 'broadcast-start' || data.type === 'emergency-start') {
        await logBroadcastStart(fastify, data);
      }

      clients.forEach((metadata, socket) => {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            // Very robust check: Global or Match
            let shouldSend = false;
            
            if (targetChannelId === undefined || targetChannelId === null || targetChannelId === 0 || targetChannelId === '0') {
              shouldSend = true; // Global/Emergency
            } else if (metadata.channel_id != null && String(metadata.channel_id) === String(targetChannelId)) {
              shouldSend = true; // Match
            }
            
            if (shouldSend) {
              socket.send(message);
            }
          }
        } catch (e) {
          // ignore
        }
      });
    } catch (err: any) {
      console.error(`[SOCKET] Broadcast failed: ${err.message}`);
      fastify.log.error(`Broadcast failed: ${err.message}`);
    }
  });

  // Robust handler for different @fastify/websocket patterns
  fastify.get('/ws', { websocket: true }, (connection: any, req) => {
    // In some versions connection is the socket, in others it's { socket, duplex }
    const socket = connection.socket || connection;
    
    if (!socket || typeof socket.on !== 'function') {
      fastify.log.error('Invalid socket connection object received');
      return;
    }

    clients.set(socket, {});

    socket.on('message', async (message: any, isBinary: boolean) => {
      try {
        if (isBinary) {
          // Forward audio to all other clients
          clients.forEach((_, client) => {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              client.send(message, { binary: true });
            }
          });
          return;
        }
        const data = JSON.parse(message.toString());
        fastify.log.info(`WS message type: ${data.type}`);

        if (data.type === 'identify') {
          const channelId = parseInt(data.channel_id);
          const deviceId = parseInt(data.device_id);
          
          if (!isNaN(channelId)) {
            const oldMetadata = clients.get(socket);
            const oldChannelId = oldMetadata?.channel_id;

            clients.set(socket, { 
              channel_id: channelId,
              device_id: !isNaN(deviceId) ? deviceId : undefined
            });
            
            fastify.log.info(`Socket identified - Channel: ${channelId}, Device: ${deviceId || 'N/A'}`);
            
            // Set new channel to online
            await updateChannelStatus(fastify, channelId, 'online');

            // If changing channels, check if old channel should go offline
            if (oldChannelId && oldChannelId !== channelId) {
              const otherClientsOnOldChannel = Array.from(clients.values()).filter(m => m.channel_id === oldChannelId);
              if (otherClientsOnOldChannel.length === 0) {
                await updateChannelStatus(fastify, oldChannelId, 'offline');
              }
            }

            socket.send(JSON.stringify({ type: 'identified', channel_id: channelId, device_id: deviceId }));
          }
          return;
        }

        // Feedback from devices
        if (data.type === 'broadcast-complete') {
          const metadata = clients.get(socket);
          if (metadata?.device_id) {
            await updateBroadcastLog(fastify, metadata.device_id, 'success');
          }
          return;
        }

        if (data.type === 'broadcast-error') {
          const metadata = clients.get(socket);
          if (metadata?.device_id) {
            await updateBroadcastLog(fastify, metadata.device_id, 'failed', data.message || 'Unknown error');
          }
          return;
        }

        if (['broadcast-start', 'broadcast-stop', 'emergency-start', 'emergency-stop'].includes(data.type)) {
          (fastify as any).broadcast(data);
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    socket.on('close', async () => {
      const metadata = clients.get(socket);
      const channelId = metadata?.channel_id;
      
      clients.delete(socket);
      fastify.log.info('WebSocket client disconnected');

      // If this was the last client for the channel, set to offline
      if (channelId) {
        const stillConnected = Array.from(clients.values()).some(m => m.channel_id === channelId);
        if (!stillConnected) {
          await updateChannelStatus(fastify, channelId, 'offline');
        }
      }
    });

    socket.on('error', (err: any) => {
      fastify.log.error(`WebSocket socket error: ${err.message}`);
      clients.delete(socket);
    });

    // Send connected confirmation
    socket.send(JSON.stringify({ type: 'connected', message: 'Ready' }));
  });
}

export default fp(socketRoutes);
