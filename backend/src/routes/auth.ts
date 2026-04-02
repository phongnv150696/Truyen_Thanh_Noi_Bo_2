import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, 
    "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt."),
  full_name: z.string().optional(),
  email: z.string().email().optional(),
  rank: z.string().optional(),
  position: z.string().optional(),
  unit_id: z.number().optional(),
});


export default async function authRoutes(server: FastifyInstance, options: FastifyPluginOptions) {
  server.post('/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Bạn đã đăng nhập quá nhiều lần. Vui lòng đợi 1 phút rồi thử lại.'
        })
      }
    }
  }, async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: 'Invalid input', details: result.error.format() });
    }

    const { username, password } = result.data;

    try {
      const { rows } = await server.pg.query(
        'SELECT u.id, u.username, u.password_hash, u.full_name, u.rank, u.unit_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.username = $1',
        [username]
      );

      if (rows.length === 0) {
        return reply.code(401).send({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
      }

      const user = rows[0];
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return reply.code(401).send({ error: 'Sai tên đăng nhập hoặc mật khẩu' });
      }

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
      return reply.code(500).send({ error: 'Lỗi hệ thống' });
    }
  });

  server.post('/register', {
    config: {
      rateLimit: {
        max: 3, // Register even stricter
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
          statusCode: 429,
          error: 'Too Many Requests',
          message: 'Bạn đang đăng ký quá nhanh. Vui lòng đợi 1 phút.'
        })
      }
    }
  }, async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
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

      return reply.code(201).send({
        message: 'Đăng ký thành công. Vui lòng chờ quản trị viên phê duyệt tài khoản của bạn.'
      });
    } catch (error: any) {
      return reply.code(500).send({ error: 'Lỗi hệ thống khi đăng ký' });
    }
  });

  // 9. Check registration status (Public)
  server.get('/registration-status/:username', async (request: any, reply) => {
    const { username } = request.params;
    try {
      const { rows } = await server.pg.query(
        "SELECT status, created_at, approved_at, rejected_reason FROM user_registrations WHERE username = $1 ORDER BY created_at DESC LIMIT 1",
        [username]
      );

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Không tìm thấy hồ sơ đăng ký cho người dùng này.' });
      }

      return rows[0];
    } catch (err: any) {
      return reply.code(500).send({ error: 'Lỗi khi kiểm tra trạng thái' });
    }
  });

  // 10. Verify token and return user info
  server.get('/verify', { preHandler: [server.authenticate] }, async (request: any, reply) => {
    return { user: request.user };
  });
}
