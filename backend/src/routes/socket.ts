import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import fp from 'fastify-plugin';
import axios from 'axios';
import { getLocalIp } from '../utils/ip.js';
import { AudioStreamService } from '../services/audioStream.js';
import fs from 'fs';

// Store connected clients with metadata
const clients = new Map<WebSocket, { channel_id?: number, device_id?: number, protocol?: string, isBrowser?: boolean }>();

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

// Helper to trigger broadcast on XiaoZhi server (Python)
async function triggerXiaoZhiBroadcast(fastify: FastifyInstance, data: any) {
  const { type, channel_id, file_url, title } = data;
  if (!['broadcast-start', 'emergency-start'].includes(type)) return;
  if (!file_url) return;

  try {
    const pythonUrl = "http://127.0.0.1:8003/xiaozhi/broadcast";
    fastify.log.info(`[XiaoZhi Bridge] Triggering broadcast on Python server: ${title}`);
    
    // We don't await this to keep the WebSocket response fast
    axios.post(pythonUrl, {
      media_url: file_url,
      channel_id: channel_id || 0,
      title: title || 'Thông báo',
      is_emergency: type === 'emergency-start'
    }, { timeout: 3000 }).catch(err => {
      fastify.log.warn(`[XiaoZhi Bridge] Python server unreachable or error: ${err.message}`);
    });
  } catch (err: any) {
    fastify.log.error(`[XiaoZhi Bridge] Failed to send trigger: ${err.message}`);
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
    fastify.log.info(`[BROADCAST] Decorator triggered. Total clients connected: ${clients.size}`);
    try {
      const type = data.type;
      const channel_id = data.channel_id || data.content?.channel_id;
      let file_url = data.file_url || data.content?.file_url;
      const title = data.title || data.content?.title;
      
      const message = JSON.stringify(data);
      const targetChannelId = channel_id;
      const localIp = getLocalIp();

      // Ensure file_url is reachable if it exists
      if (file_url && typeof file_url === 'string' && file_url.includes('127.0.0.1')) {
        file_url = file_url.replace('127.0.0.1', localIp);
        if (data.file_url) data.file_url = file_url;
        if (data.content?.file_url) data.content.file_url = file_url;
      }

      fastify.log.info(`[BROADCAST] Type: ${type}, Channel: ${targetChannelId}, URL: ${file_url}`);

      // Log start if it's a broadcast start message
      if (type === 'broadcast-start' || type === 'emergency-start') {
        await logBroadcastStart(fastify, data);
        // Trigger XiaoZhi Python Server (Legacy Support)
        triggerXiaoZhiBroadcast(fastify, data);

        // NEW: Binary Streaming (The XiaoZhi Principle)
        if (file_url) {
          const allClients = Array.from(clients.entries());
          fastify.log.info(`[BROADCAST] Total clients connected: ${allClients.length}`);
          
          allClients.forEach(([_, meta], idx) => {
             fastify.log.info(`[BROADCAST] Client #${idx}: Device=${meta.device_id}, Chan=${meta.channel_id}, Proto=${meta.protocol || 'raw'}`);
          });

          const targetSockets = allClients
            .filter(([socket, metadata]) => {
              // Only send to identified hardware devices
              if (!metadata.channel_id) {
                fs.appendFileSync('./debug_audio.log', `[${new Date().toISOString()}] [BROADCAST] Skipping Device ${metadata.device_id}: No channel_id\n`);
                return false;
              }
              if (metadata.isBrowser) {
                return false; // Silently skip browsers
              }
              
              // Wildcard or channel match
              const channelMatch = targetChannelId === undefined || 
                                  targetChannelId === null || 
                                  targetChannelId === 0 || 
                                  targetChannelId === '0' ||
                                  String(metadata.channel_id) === String(targetChannelId);
              
              fs.appendFileSync('./debug_audio.log', `[${new Date().toISOString()}] [BROADCAST] Checking Device ${metadata.device_id}, Chan=${metadata.channel_id}, Target=${targetChannelId}, Match=${channelMatch}\n`);
              return channelMatch;
            })
            .map(([socket, metadata]) => ({
              socket,
              protocol: metadata.protocol
            }));

          fastify.log.info(`[BROADCAST] Target sockets found: ${targetSockets.length}`);

          if (targetSockets.length > 0) {
             fastify.log.info(`[SOCKET] Starting binary stream for channel ${targetChannelId || 'global'}`);
             AudioStreamService.startStream(file_url, targetSockets, `chan_${targetChannelId || 'global'}`);
           }
         }
       }
 
       // Pause/Resume/Stop binary stream
       const streamId = `chan_${targetChannelId || 'global'}`;
       if (type === 'broadcast-pause') {
         AudioStreamService.pauseStream(streamId);
       } else if (type === 'broadcast-resume') {
         AudioStreamService.resumeStream(streamId);
       } else if (type === 'broadcast-stop' || type === 'emergency-stop' || type === 'stop') {
         AudioStreamService.stopStream(streamId);
       }

      // Still send the JSON message for control 
      clients.forEach((metadata, socket) => {
        try {
          if (socket.readyState === WebSocket.OPEN) {
            let shouldSend = false;
            if (targetChannelId === undefined || targetChannelId === null || targetChannelId === 0 || targetChannelId === '0') {
              shouldSend = true;
            } else if (metadata.channel_id != null && String(metadata.channel_id) === String(targetChannelId)) {
              shouldSend = true;
            }
            if (shouldSend) {
              socket.send(message);
            }
          }
        } catch (e) {}
      });
    } catch (err: any) {
      console.error(`[SOCKET] Broadcast failed: ${err.message}`);
    }
  });

  // Robust handler for different @fastify/websocket patterns
  fastify.get('/ws', { websocket: true }, (connection: any, req) => {
    // In some versions connection is the socket, in others it's { socket, duplex }
    const socket = connection.socket || connection;
    const remoteAddr = req.socket.remoteAddress;
    
    fs.appendFileSync('./debug_audio.log', `[${new Date().toISOString()}] [SOCKET] NEW CONNECTION from ${remoteAddr}\n`);
    
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
        fastify.log.info(`[WS] INCOMING: ${data.type} from ${socket.readyState === WebSocket.OPEN ? 'active' : 'closed'} client`);
        
        // Log all fields for debugging (don't do this in production with sensitive data)
        console.log('[WS DEBUG]', JSON.stringify(data));

        if (data.type === 'hello') {
          // Official XiaoZhi Handshake
          const sessionId = `sess_${Math.random().toString(36).substring(2, 10)}`;
          const response = {
            type: 'hello',
            transport: 'websocket',
            session_id: sessionId,
            audio_params: {
              format: 'pcm', // We suggest PCM to see if firmware accepts it
              sample_rate: 16000,
              channels: 1,
              frame_duration: 20
            }
          };
          socket.send(JSON.stringify(response));
          
          clients.set(socket, { 
            channel_id: 1, // Default channel for XiaoZhi
            device_id: data.device_id || 999,
            protocol: 'xiaozhi-v3'
          });
          
          console.log(`[SOCKET DEBUG] XiaoZhi Hello received. Device ID: ${data.device_id}`);
          // We'll write to a specific file since console might be hard to read
          fs.appendFileSync('./debug_audio.log', `[${new Date().toISOString()}] [SOCKET] XiaoZhi Hello - Device: ${data.device_id}, Session: ${sessionId}\n`);
          
          fastify.log.info(`XiaoZhi identified via Hello - Session: ${sessionId}`);
          await updateChannelStatus(fastify, 1, 'online');
          return;
        }

        if (data.type === 'identify') {
          const channelId = parseInt(data.channel_id);
          const deviceId = parseInt(data.device_id);
          
          if (!isNaN(channelId)) {
            // Check if this is a browser terminal/dashboard
            const isBrowser = (data.device_name && (data.device_name.includes('Browser') || data.device_name.includes('Dashboard'))) || 
                              (data.device_id === 999);

            clients.set(socket, { 
              channel_id: channelId,
              device_id: !isNaN(deviceId) ? deviceId : undefined,
              isBrowser: !!isBrowser
            });
            
            fastify.log.info(`[SOCKET] Identified Client: Device ${deviceId}, Channel ${channelId} ${isBrowser ? '(Browser)' : ''}`);
            fs.appendFileSync('./debug_audio.log', `[${new Date().toISOString()}] [SOCKET] Identify - Device: ${deviceId}, Channel: ${channelId}, IsBrowser: ${isBrowser}\n`);
            
            // Set new channel to online
            await updateChannelStatus(fastify, channelId, 'online');

            // If changing channels, check if old channel should go offline
            const oldMetadata = clients.get(socket);
            const oldChannelId = oldMetadata?.channel_id;
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

        if (['broadcast-start', 'broadcast-stop', 'emergency-start', 'emergency-stop', 'broadcast-pause', 'broadcast-resume'].includes(data.type)) {
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
