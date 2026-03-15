import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function userRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all users with roles and units
  fastify.get('/', async (request, reply) => {
    const query = `
      SELECT 
        u.id, u.username, u.full_name, u.rank, u.email, u.created_at,
        r.name as role_name, r.description as role_description,
        un.name as unit_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN units un ON u.unit_id = un.id
      ORDER BY u.created_at DESC
    `;
    const result = await fastify.pg.query(query);
    return result.rows;
  });

  // 2. Get all roles
  fastify.get('/roles', async (request, reply) => {
    const result = await fastify.pg.query('SELECT * FROM roles ORDER BY id');
    return result.rows;
  });

  // 3. Get all units
  fastify.get('/units', async (request, reply) => {
    const result = await fastify.pg.query('SELECT * FROM units ORDER BY level, name');
    return result.rows;
  });

  // 4. Update user
  fastify.patch('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const { full_name, rank, role_id, unit_id } = request.body as any;
    
    const query = `
      UPDATE users 
      SET full_name = $1, rank = $2, role_id = $3, unit_id = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
    `;
    const result = await fastify.pg.query(query, [full_name, rank, role_id, unit_id, id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return result.rows[0];
  });

  // 5. Delete user
  fastify.delete('/:id', async (request: any, reply) => {
    const { id } = request.params;
    const result = await fastify.pg.query('DELETE FROM users WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return { message: 'User deleted successfully' };
  });

  // 6. List pending registrations
  fastify.get('/registrations', async (request, reply) => {
    const query = `
      SELECT ur.*, un.name as unit_name
      FROM user_registrations ur
      LEFT JOIN units un ON ur.unit_id = un.id
      WHERE ur.status = 'pending'
      ORDER BY ur.created_at DESC
    `;
    const result = await fastify.pg.query(query);
    return result.rows;
  });

  // 7. Approve registration
  fastify.post('/registrations/:id/approve', async (request: any, reply) => {
    const { id } = request.params;
    const { role_id } = request.body as any;

    try {
      // Get registration data
      const regResult = await fastify.pg.query('SELECT * FROM user_registrations WHERE id = $1', [id]);
      if (regResult.rowCount === 0) return reply.code(404).send({ error: 'Registration not found' });
      
      const reg = regResult.rows[0];

      // Move to users table (default password for now, should be set by user later or during registration)
      const insertUserQuery = `
        INSERT INTO users (username, password_hash, full_name, rank, email, role_id, unit_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;
      // Using a placeholder hash for 'password123' - $2a$10$7vN3G2P6rG8vY6.V7X.9u.XfG5ZpG3X5ZpG3X5ZpG3X5ZpG3X5Zp
      const newUser = await fastify.pg.query(insertUserQuery, [
        reg.username, 
        '$2a$10$7vN3G2P6rG8vY6.V7X.9u.BfH6ZpG3X5ZpG3X5ZpG3X5ZpG3X5ZpG3X5Zp', // placeholder hash
        reg.full_name,
        reg.rank,
        reg.email,
        role_id || 5, // default to listener (id 5) if not provided
        reg.unit_id
      ]);

      // Update registration status
      await fastify.pg.query("UPDATE user_registrations SET status = 'approved' WHERE id = $1", [id]);

      return { message: 'User approved and created', userId: newUser.rows[0].id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 8. Reject registration
  fastify.post('/registrations/:id/reject', async (request: any, reply) => {
    const { id } = request.params;
    const result = await fastify.pg.query("UPDATE user_registrations SET status = 'rejected' WHERE id = $1", [id]);
    
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Registration not found' });
    return { message: 'Registration rejected' };
  });
}
