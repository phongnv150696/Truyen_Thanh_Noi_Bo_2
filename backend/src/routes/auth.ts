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
  position: z.string().optional(),
  unit_id: z.number().optional(),
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
        'SELECT u.id, u.username, u.password_hash, u.full_name, u.rank, u.unit_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = $1',
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
        role_name: user.role_name,
        unit_id: user.unit_id
      }, { expiresIn: '7d' });

      return { 
        message: 'Đăng nhập thành công',
        token,
        user: {
          id: user.id,
          username: user.username,
          full_name: user.full_name,
          rank: user.rank,
          role_name: user.role_name,
          unit_id: user.unit_id
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

    const { username, password, full_name, email, rank, position, unit_id } = result.data;
    
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

      // Insert into user_registrations (status = 'pending')
      await server.pg.query(
        'INSERT INTO user_registrations (username, password_hash, full_name, email, rank, position, unit_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [username, password_hash, full_name || '', email || '', rank || '', position || '', unit_id || null, 'pending']
      );

      // Notify Admin about new registration
      await server.pg.query(
        `INSERT INTO notifications (title, message, type, link, sender_name, priority) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          'Đăng ký tài khoản mới',
          `Người dùng "${full_name || username}" đang chờ phê duyệt tài khoản.`,
          'info',
          'users',
          'Hệ thống Auth',
          'high'
        ]
      );

      log(`User registration pending approval: ${username}`);

      return reply.code(201).send({
        message: 'Đăng ký thành công. Vui lòng chờ quản trị viên phê duyệt tài khoản của bạn.'
      });
    } catch (error: any) {
      log(`Error during registration: ${error.message}`);
      return reply.code(500).send({ error: 'Lỗi hệ thống khi đăng ký' });
    }
  });

  // 10. Verify token and return user info
  server.get('/verify', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    return { user: request.user };
  });
}
