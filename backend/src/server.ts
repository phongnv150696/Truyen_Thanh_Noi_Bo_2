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
import radioRoutes from './routes/radios.js';
import rbacRoutes from './routes/rbac.js';
import routineRoutes from './routes/routines.js';
import fastifyRateLimit from '@fastify/rate-limit';

import { startScheduler } from './scheduler.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Startup Guard: Fail fast if critical secrets are missing ──
const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`\n❌ STARTUP ERROR: Environment variable "${key}" is not set.`);
    console.error('   Please check your .env file and ensure all required variables are configured.');
    process.exit(1);
  }
}

const server: FastifyInstance = fastify({
  logger: true,
  bodyLimit: 1073741824 // 1GB
});

// Middleware & Plugins
async function setupServer() {
    // CORS
    await server.register(cors, {
      origin: (origin, cb) => {
        // In development / Codespaces, allow all origins
        if (!origin || origin.includes('github.dev') || origin.includes('app.github.dev') || origin.includes('localhost')) {
          cb(null, true);
          return;
        }
        cb(new Error("Not allowed by CORS"), false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
      credentials: true,
      preflightContinue: false
    });

    // Rate Limiting (Global: 1000 req/min)
    await server.register(fastifyRateLimit, {
      max: 1000,
      timeWindow: '1 minute',
      errorResponseBuilder: (request, context) => {
        return {
          statusCode: 429,
          error: 'Too Many Requests',
          message: `Hệ thống bận. Vui lòng thử lại sau ${context.after}.`
        };
      }
    });

    // Database (Must be registered early as routes depend on it)
    await server.register(postgres, {
      connectionString: process.env.DATABASE_URL // validated at startup — never undefined here
    });

    // WebSocket support
    await server.register(fastifyWebsocket);
    await server.register(socketRoutes);

    // JWT (Must be registered before auth-dependent routes)
    await server.register(fastifyJwt, {
      secret: process.env.JWT_SECRET! // validated at startup — never undefined here
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

    // RBAC: Check if user has specific roles and optionally filter by Unit/Clearance
    server.decorate("authorize", (allowedRoles: string[], options?: { checkUnit?: boolean, minClearance?: number }) => {
      return async (request: any, reply: any) => {
        const user = request.user;
        
        if (!user) {
          return reply.code(401).send({ error: 'Unauthorized' });
        }

        // 1. Root ID-1 always bypasses all role checks
        if (user.id === 1) return;

        // 2. Role name check (case-insensitive)
        const userRole = user.role_name?.toLowerCase();
        const isAuthorized = allowedRoles.some(role => role.toLowerCase() === userRole || userRole === 'admin');

        if (!isAuthorized) {
          // Check active delegation
          const { rowCount } = await server.pg.query(
            `SELECT 1 FROM delegations d JOIN roles r ON d.role_id = r.id 
             WHERE d.delegatee_id = $1 AND r.name = ANY($2)
             AND d.status = 'active' 
             AND d.start_time <= CURRENT_TIMESTAMP 
             AND d.end_time >= CURRENT_TIMESTAMP`,
             [user.id, allowedRoles]
          );

          if (!rowCount) {
            return reply.code(403).send({ 
              error: 'Forbidden', 
              message: 'Bạn không có quyền thực hiện hành động này.' 
            });
          }
        }

        // 2. Clearance Level Check (ID 1 always bypasses)
        if (options?.minClearance && user.role_name?.toLowerCase() !== 'admin' && user.id !== 1) {
          if ((user.clearance_level || 1) < options.minClearance) {
            return reply.code(403).send({ 
              error: 'Forbidden', 
              message: 'Tài liệu vượt quá mức độ tiếp cận (độ mật) của bạn.' 
            });
          }
        }

        // 3. Optional Unit Check (Bypass for admin with ID 1)
        if (options?.checkUnit && user.role_name?.toLowerCase() !== 'admin' && user.id !== 1) {
          const targetUnitId = request.params.unitId || request.query.unitId || request.body.unit_id || request.body.unitId;
          
          if (targetUnitId) {
            const { getDescendantUnitIds } = await import('./utils/unit_utils.js');
            const unitScope = await getDescendantUnitIds(server.pg, user.unit_id);
            
            if (!unitScope.includes(parseInt(targetUnitId))) {
              return reply.code(403).send({ 
                error: 'Forbidden', 
                message: 'Bạn chỉ có quyền quản lý trong phạm vi đơn vị của mình và các đơn vị trực thuộc.' 
              });
            }
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
    await server.register(radioRoutes, { prefix: '/radios' });
    await server.register(rbacRoutes, { prefix: '/rbac' });
    await server.register(routineRoutes, { prefix: '/routines' });


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

