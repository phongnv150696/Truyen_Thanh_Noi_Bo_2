import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

export default async function profileRoutes(fastify: FastifyInstance) {
  
  // 1. Get current user profile
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const userId = request.user.id;
    const query = `
      SELECT 
        u.id, u.username, u.full_name, u.rank, u.position, u.email, u.created_at, u.updated_at,
        r.name as role_name,
        un.name as unit_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN units un ON u.unit_id = un.id
      WHERE u.id = $1
    `;
    const result = await fastify.pg.query(query, [userId]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return result.rows[0];
  });

  // 2. Update profile information
  fastify.patch('/me', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const userId = request.user.id;
    const { full_name, rank, position, email } = request.body as any;

    try {
      const query = `
        UPDATE users 
        SET 
          full_name = COALESCE($1, full_name), 
          rank = COALESCE($2, rank), 
          position = COALESCE($3, position),
          email = COALESCE($4, email),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
        RETURNING id, username, full_name, rank, position, email
      `;
      const result = await fastify.pg.query(query, [full_name, rank, position, email, userId]);
      
      // Log action
      await fastify.pg.query(`
        INSERT INTO audit_logs (user_id, action, target_table, details)
        VALUES ($1, 'PROFILE_UPDATED', 'users', $2)
      `, [userId, JSON.stringify({ full_name, rank, position, email })]);

      return result.rows[0];
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update profile' });
    }
  });

  // 3. Change password
  fastify.post('/me/change-password', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const userId = request.user.id;
    const { current_password, new_password } = request.body as any;

    if (!current_password || !new_password) {
      return reply.code(400).send({ error: 'Current and new password are required' });
    }

    try {
      // Get current password hash
      const userRes = await fastify.pg.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (userRes.rowCount === 0) return reply.code(404).send({ error: 'User not found' });
      
      const isMatch = await bcrypt.compare(current_password, userRes.rows[0].password_hash);
      if (!isMatch) {
        return reply.code(400).send({ error: 'Mật khẩu hiện tại không chính xác' });
      }

      // Hash new password
      const newHash = await bcrypt.hash(new_password, 10);
      await fastify.pg.query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);

      // Log action
      await fastify.pg.query(`
        INSERT INTO audit_logs (user_id, action, target_table, details)
        VALUES ($1, 'PASSWORD_CHANGED', 'users', '{}')
      `, [userId]);

      return { message: 'Đổi mật khẩu thành công' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 4. Get personal audit logs
  fastify.get('/me/logs', { preHandler: [fastify.authenticate] }, async (request: any, reply) => {
    const userId = request.user.id;
    const query = `
      SELECT id, action, target_table, details, created_at
      FROM audit_logs
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const result = await fastify.pg.query(query, [userId]);
    return result.rows;
  });
}
