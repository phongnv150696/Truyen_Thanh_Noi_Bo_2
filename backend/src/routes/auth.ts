import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  rank: z.string().optional(),
});

const logFile = path.join(process.cwd(), 'auth_debug.txt');
const log = (msg: string) => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
  console.log(`[AUTH DEBUG] ${msg}`);
};

export default async function authRoutes(server: FastifyInstance, options: FastifyPluginOptions) {
  server.post('/login', async (request, reply) => {
    log('--- Login Request Received ---');
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      log('Invalid input format');
      return reply.code(400).send({ error: 'Invalid input', details: result.error.format() });
    }

    const { username, password } = result.data;
    log(`Attempting login for: "${username}"`);

    try {
      const { rows } = await server.pg.query(
        'SELECT id, username, password_hash, full_name, rank FROM users WHERE username = $1',
        [username]
      );

      if (rows.length === 0) {
        log(`User NOT FOUND in database: "${username}"`);
        return reply.code(401).send({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
      }

      const user = rows[0];
      log(`User found: ${user.username} (ID: ${user.id})`);
      log(`DB Password Hash: ${user.password_hash}`);
      log(`Password provided length: ${password.length}`);

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      log(`Bcrypt comparison result: ${isPasswordValid}`);

      if (!isPasswordValid) {
        log('Authentication FAILED: Password mismatch');
        return reply.code(401).send({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
      }

      log('Authentication SUCCESS');

      const token = server.jwt.sign({
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        rank: user.rank,
      }, { expiresIn: '1d' });

      return { 
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          rank: user.rank,
        }
      };
    } catch (error: any) {
      log(`Error during login: ${error.message}`);
      return reply.code(500).send({ error: 'Lỗi hệ thống' });
    }
  });

  server.post('/register', async (request, reply) => {
    log('--- Register Request Received ---');
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      log('Invalid registration input');
      return reply.code(400).send({ error: 'Dữ liệu không hợp lệ', details: result.error.format() });
    }

    const { username, password, full_name, email, rank } = result.data;
    
    try {
      // Check if user exists
      const existingUser = await server.pg.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(400).send({ error: 'Tên đăng nhập đã tồn tại' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // Insert new user (default role_id = 5 for 'listener')
      const { rows } = await server.pg.query(
        'INSERT INTO users (username, password_hash, full_name, email, rank, role_id) VALUES ($1, $2, $3, $4, $5, 5) RETURNING id, username, full_name',
        [username, password_hash, full_name || '', email || '', rank || '']
      );

      const newUser = rows[0];
      log(`New user registered: ${newUser.username} (ID: ${newUser.id})`);

      // Generate token
      const token = server.jwt.sign({
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
      }, { expiresIn: '1d' });

      return reply.code(201).send({
        message: 'Đăng ký thành công',
        token,
        user: newUser
      });
    } catch (error: any) {
      log(`Error during registration: ${error.message}`);
      return reply.code(500).send({ error: 'Lỗi hệ thống khi đăng ký' });
    }
  });
}
