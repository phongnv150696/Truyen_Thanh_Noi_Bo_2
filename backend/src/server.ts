import fastify, { FastifyInstance } from 'fastify';
import postgres from '@fastify/postgres';
import cors from '@fastify/cors';
import fastifyJwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';
import fastifyMultipart from '@fastify/multipart';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRoutes from './routes/auth.js';
import mediaRoutes from './routes/media.js';
import deviceRoutes from './routes/devices.js';
import channelRoutes from './routes/channels.js';
import scheduleRoutes from './routes/schedules.js';
import userRoutes from './routes/users.js';
import contentRoutes from './routes/content.js';
import settingsRoutes from './routes/settings.js';
import notificationRoutes from './routes/notifications.js';
import aiRoutes from './routes/ai.js';
import dashboardRoutes from './routes/dashboard.js';
import dictionaryRoutes from './routes/dictionary.js';
import fastifyWebsocket from '@fastify/websocket';
import socketRoutes from './routes/socket.js';
import profileRoutes from './routes/profile.js';
import analyticsRoutes from './routes/analytics.js';
import reportRoutes from './routes/reports.js';
import { startScheduler } from './scheduler.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server: FastifyInstance = fastify({
  logger: true,
  bodyLimit: 1073741824 // 1GB
});

// Middleware & Plugins
async function setupServer() {
    // CORS
    await server.register(cors, {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    });

    // WebSocket support (Register early)
    await server.register(fastifyWebsocket);
    await server.register(socketRoutes);

    // Database
    await server.register(postgres, {
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5432/openclaw'
    });

    // JWT
    await server.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'openclaw_v2_secret_key_2024'
    });

    // Static Files (for uploads)
    await server.register(fastifyStatic, {
      root: join(__dirname, '../uploads'),
      prefix: '/uploads/',
    });

    // Multipart/File Upload
    await server.register(fastifyMultipart, {
      limits: {
        fileSize: 1073741824 // 1GB
      }
    });

    // Decorate server with auth validation
    server.decorate("authenticate", async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // RBAC: Check if user has specific roles and optionally filter by Unit
    server.decorate("authorize", (allowedRoles: string[], options?: { checkUnit?: boolean }) => {
      return async (request: any, reply: any) => {
        const user = request.user;
        
        // 1. Basic Role Check
        if (!user || !allowedRoles.includes(user.role_name)) {
          return reply.code(403).send({ 
            error: 'Forbidden', 
            message: 'Bạn không có quyền thực hiện hành động này.' 
          });
        }

        // 2. Optional Unit Check (Bypass for admin)
        if (options?.checkUnit && user.role_name !== 'admin') {
          const targetUnitId = request.params.unitId || request.query.unitId || request.body.unit_id;
          
          if (targetUnitId && parseInt(targetUnitId) !== user.unit_id) {
            return reply.code(403).send({ 
              error: 'Forbidden', 
              message: 'Bạn chỉ có quyền quản lý trong đơn vị của mình.' 
            });
          }
        }
      };
    });

    // Routes
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(mediaRoutes, { prefix: '/media' });
    await server.register(deviceRoutes, { prefix: '/devices' });
    await server.register(channelRoutes, { prefix: '/channels' });
    await server.register(scheduleRoutes, { prefix: '/schedules' });
    await server.register(userRoutes, { prefix: '/users' });
    await server.register(contentRoutes, { prefix: '/content' });
    await server.register(settingsRoutes, { prefix: '/settings' });
    await server.register(notificationRoutes, { prefix: '/notifications' });
    await server.register(aiRoutes, { prefix: '/ai' });
    
    await server.register(dashboardRoutes, { prefix: '/dashboard' });
    await server.register(dictionaryRoutes, { prefix: '/dictionary' });
    await server.register(analyticsRoutes, { prefix: '/analytics' });
    await server.register(reportRoutes, { prefix: '/reports' });
    await server.register(profileRoutes, { prefix: '/profile' });

    // Root route
    server.get('/', async () => {
      return { 
        name: 'OpenClaw API', 
        version: '2.0.0', 
        status: 'online' 
      };
    });

    // Health check
    server.get('/health', async () => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });

    // Start the auto-scheduler (checks for pending broadcasts every 30s)
    await startScheduler(server);

    return server;
}

// Start server
const start = async () => {
  try {
    const app = await setupServer();
    const port = Number(process.env.PORT) || 3000;
    
    await app.listen({ 
      port, 
      host: '0.0.0.0' 
    });
    
    console.log(`
    🚀 OpenClaw Backend V2 is running!
    📡 Port: ${port}
    🔗 URL: http://localhost:${port}
    `);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

