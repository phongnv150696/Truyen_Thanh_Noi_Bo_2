import { fastify } from 'fastify';
import fastifyPostgres from '@fastify/postgres';
import fastifyCors from '@fastify/cors';
import fastifyEnv from '@fastify/env';
import fastifyJwt from '@fastify/jwt';
import authRoutes from './routes/auth.js';
import 'dotenv/config';

const server = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

const schema = {
  type: 'object',
  required: ['DATABASE_URL', 'PORT'],
  properties: {
    PORT: { type: 'string', default: '3000' },
    DATABASE_URL: { type: 'string' },
    REDIS_URL: { type: 'string' },
    JWT_SECRET: { type: 'string' },
  },
};

const options = {
  schema: schema,
  dotenv: true,
  data: process.env,
};

async function bootstrap() {
  try {
    // Environment variables
    await server.register(fastifyEnv, options);

    // CORS
    await server.register(fastifyCors, {
      origin: true, // Allow all origins for dev
    });

    // PostgreSQL
    await server.register(fastifyPostgres, {
      connectionString: process.env.DATABASE_URL,
    });

    // JWT
    await server.register(fastifyJwt, {
      secret: process.env.JWT_SECRET || 'OpenClawSecret2024',
    });

    // Routes
    await server.register(authRoutes, { prefix: '/auth' });

    // Root route
    server.get('/', async () => {
      return { 
        name: 'OpenClaw API', 
        version: '2.0.0', 
        status: 'running',
        endpoints: ['/ping', '/db-test', '/auth/login']
      };
    });

    // Health check
    server.get('/ping', async (_request, _reply) => {
      return { status: 'ok', message: 'pong', timestamp: new Date().toISOString() };
    });

    // Test DB connection
    server.get('/db-test', async (_request, _reply) => {
      const client = await server.pg.connect();
      try {
        const { rows } = await client.query('SELECT NOW()');
        return { database: 'connected', time: rows[0].now };
      } finally {
        client.release();
      }
    });

    const port = Number(process.env.PORT) || 3000;
    await server.listen({ port, host: '0.0.0.0' });
    
    console.log(`🚀 Server is running at http://0.0.0.0:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

bootstrap();
