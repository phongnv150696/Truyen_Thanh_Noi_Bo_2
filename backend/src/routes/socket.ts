import { FastifyInstance } from 'fastify';

export default async function socketRoutes(fastify: FastifyInstance) {
  fastify.log.info('Registering Socket Routes...');
  fastify.get('/ws', { websocket: true }, (connection, req) => {
    fastify.log.info(`New WebSocket Connection from ${req.ip}`);
    console.log('SERVER: New WS Connection established');
    
    connection.socket.on('message', (message: any, isBinary: boolean) => {
      // If it's binary, it's an audio chunk
      if (isBinary) {
        // Broadcast audio chunk to all OTHER clients
        if (fastify.websocketServer) {
          fastify.websocketServer.clients.forEach((client: any) => {
            if (client !== connection.socket && client.readyState === 1) {
              client.send(message, { binary: true });
            }
          });
        }
        return;
      }

      // Handle JSON messages
      try {
        const data = JSON.parse(message.toString());
        fastify.log.info('Received WS message:', data);

        // Forward certain control messages to all clients
        if (data.type === 'broadcast-start' || data.type === 'broadcast-stop' || data.type === 'emergency-start' || data.type === 'emergency-stop') {
          fastify.broadcast(data);
        }
      } catch (e) {
        fastify.log.error('Failed to parse WS message');
      }
    });

    connection.socket.on('close', () => {
      fastify.log.info('Client disconnected from WebSocket');
    });

    connection.socket.send(JSON.stringify({ type: 'connected', message: 'Welcome to OpenClaw Real-time Monitor' }));
  });

  fastify.decorate('broadcast', (data: any) => {
    const message = JSON.stringify(data);
    if (fastify.websocketServer) {
        fastify.websocketServer.clients.forEach((client: any) => {
            if (client.readyState === 1) {
                client.send(message);
            }
        });
    }
  });
}
