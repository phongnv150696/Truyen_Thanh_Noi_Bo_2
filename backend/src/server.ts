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
import settingsRoutes from './routes/settings.js';
import notificationRoutes from './routes/notifications.js';
import dashboardRoutes from './routes/dashboard.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const server: FastifyInstance = fastify({
  logger: true
});

// Middleware & Plugins
async function setupServer() {
    // CORS
    await server.register(cors, {
      origin: true
    });

    // Database
    await server.register(postgres, {
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:YourStrongPassword@localhost:5433/openclaw'
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
    await server.register(fastifyMultipart);

    // Decorate server with auth validation
    server.decorate("authenticate", async (request: any, reply: any) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // Routes
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(mediaRoutes, { prefix: '/media' });
    await server.register(deviceRoutes, { prefix: '/devices' });
    await server.register(channelRoutes, { prefix: '/channels' });
    await server.register(scheduleRoutes, { prefix: '/schedules' });
    await server.register(userRoutes, { prefix: '/users' });
    await server.register(settingsRoutes, { prefix: '/settings' });
    await server.register(notificationRoutes, { prefix: '/notifications' });
    await server.register(dashboardRoutes, { prefix: '/dashboard' });

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

