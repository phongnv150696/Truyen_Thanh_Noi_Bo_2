import { FastifyInstance, FastifyPluginOptions } from 'fastify';

export default async function deviceRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get all devices with unit info (Scoped by Unit)
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params: any[] = [];

      // Only the unique System Owner (ID 1) bypasses the unit filter
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'AND d.unit_id = ANY($1)';
        params.push(unitIds);
      }

      const query = `
        SELECT d.*, u.name as unit_name, c.name as channel_name 
        FROM devices d
        LEFT JOIN units u ON d.unit_id = u.id
        LEFT JOIN channels c ON d.channel_id = c.id
        WHERE 1=1 ${unitFilter}
        ORDER BY d.id DESC
      `;
      const { rows } = await client.query(query, params);
      return rows;
    } finally {
      client.release();
    }
  });

  // 2. Add a new device (Scope Check)
  fastify.post('/', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { name, type, ip_address, unit_id, channel_id } = request.body;
    const user = request.user;
    const { resolveUnitId } = await import('../utils/unit_resolver.js');

    try {
      const resolvedUnitId = await resolveUnitId(fastify.pg, unit_id, user.unit_id, user.role_name?.toLowerCase() === 'admin' || user.id === 1);
      if (!resolvedUnitId) return reply.code(400).send({ error: 'Đơn vị không hợp lệ.' });
      
      const targetUnitId = resolvedUnitId;

      // Security check: Local managers cannot bypass hierarchy
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(targetUnitId)) {
          return reply.code(403).send({ error: 'Bạn chỉ có thể thêm thiết bị vào đơn vị thuộc phạm vi quản lý của mình.' });
        }
      }

      const client = await fastify.pg.connect();
      try {
        const { rows } = await client.query(
          'INSERT INTO devices (name, type, ip_address, unit_id, channel_id, status, last_seen) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
          [name, type || 'speaker', ip_address, targetUnitId, channel_id, 'offline']
        );
        return rows[0];
      } finally {
        client.release();
      }
    } catch (err) {
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // 3. Update a device (Scope Check)
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { name, type, ip_address, status, unit_id, channel_id, volume, signal_strength, firmware_version, last_maintenance, maintenance_notes } = request.body;
    const user = request.user;
    
    const client = await fastify.pg.connect();
    try {
      const existing = await client.query('SELECT unit_id FROM devices WHERE id = $1', [id]);
      if (existing.rows.length === 0) return reply.status(404).send({ error: 'Device not found' });
      
      const { resolveUnitId } = await import('../utils/unit_resolver.js');
      let targetUnitId = unit_id;
      if (unit_id) {
        const resolved = await resolveUnitId(fastify.pg, unit_id, user.unit_id, user.role_name?.toLowerCase() === 'admin' || user.id === 1);
        if (!resolved) return reply.code(400).send({ error: 'Đơn vị không hợp lệ.' });
        targetUnitId = resolved;
      }

      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(existing.rows[0].unit_id)) return reply.code(403).send({ error: 'Bạn không có quyền sửa thiết bị thuộc đơn vị khác.' });
        if (targetUnitId && !unitIds.includes(parseInt(targetUnitId))) return reply.code(403).send({ error: 'Bạn không có quyền chuyển thiết bị sang đơn vị khác.' });
      }

      const { rows } = await client.query(
        `UPDATE devices 
         SET name = COALESCE($1, name), type = COALESCE($2, type), ip_address = COALESCE($3, ip_address),
             status = COALESCE($4, status), unit_id = COALESCE($5, unit_id), channel_id = COALESCE($6, channel_id),
             volume = COALESCE($7, volume), signal_strength = COALESCE($8, signal_strength),
             firmware_version = COALESCE($9, firmware_version), last_maintenance = COALESCE($10, last_maintenance),
             maintenance_notes = COALESCE($11, maintenance_notes)
         WHERE id = $12 RETURNING *`,
        [name, type, ip_address, status, targetUnitId, channel_id, volume, signal_strength, firmware_version, last_maintenance, maintenance_notes, id]
      );
      
      fastify.broadcast({ type: 'device_status_update', device: rows[0] });
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 4. Delete a device
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      const existing = await client.query('SELECT unit_id FROM devices WHERE id = $1', [id]);
      if (existing.rows.length === 0) return reply.status(404).send({ error: 'Device not found' });
      
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(existing.rows[0].unit_id)) return reply.code(403).send({ error: 'Bạn không có quyền xóa thiết bị thuộc đơn vị khác.' });
      }

      await client.query('DELETE FROM devices WHERE id = $1', [id]);
      return { success: true };
    } finally {
      client.release();
    }
  });

  // 5. Execute Command (Scoped)
  fastify.post('/:id/command', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] }, async (request: any, reply) => {
    const { id } = request.params;
    const { command, payload } = request.body;
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      const existingRes = await client.query('SELECT unit_id FROM devices WHERE id = $1', [id]);
      if (existingRes.rows.length === 0) return reply.status(404).send({ error: 'Device not found' });
      
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        if (!unitIds.includes(existingRes.rows[0].unit_id)) return reply.code(403).send({ error: 'Bạn không có quyền điều khiển thiết bị của đơn vị khác.' });
      }

      await client.query('INSERT INTO device_commands (device_id, operator_id, command, payload, status) VALUES ($1, $2, $3, $4, $5)', [id, user.id, command, JSON.stringify(payload || {}), 'pending']);
      
      let updatedDevice;
      if (command === 'REBOOT') {
        const res = await client.query('UPDATE devices SET status = \'offline\', last_seen = NOW() WHERE id = $1 RETURNING *', [id]);
        updatedDevice = res.rows[0];
        setTimeout(async () => {
          const bClient = await fastify.pg.connect();
          try {
            const bRes = await bClient.query('UPDATE devices SET status = \'online\', last_seen = NOW() WHERE id = $1 RETURNING *', [id]);
            fastify.broadcast({ type: 'device_status_update', device: bRes.rows[0] });
          } finally { bClient.release(); }
        }, 5000);
      } else if (command === 'SET_VOLUME') {
        const res = await client.query('UPDATE devices SET volume = $1 WHERE id = $2 RETURNING *', [payload.volume, id]);
        updatedDevice = res.rows[0];
      }

      await client.query('UPDATE device_commands SET status = \'success\' WHERE id = (SELECT id FROM device_commands WHERE device_id = $1 ORDER BY created_at DESC LIMIT 1)', [id]);
      if (updatedDevice) fastify.broadcast({ type: 'device_status_update', device: updatedDevice });

      return { success: true, device: updatedDevice };
    } finally {
      client.release();
    }
  });

  // 6. Bulk Delete (Scoped)
  fastify.post('/bulk-delete', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { ids } = request.body as { ids: number[] };
    const user = request.user;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params = [ids];
      if (!(user.role_name?.toLowerCase() === 'admin' || user.id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        unitFilter = 'AND unit_id = ANY($2)';
        params.push(unitIds);
      }
      const { rowCount } = await client.query(`DELETE FROM devices WHERE id = ANY($1) ${unitFilter}`, params);
      return { message: `${rowCount} devices deleted successfully` };
    } finally {
      client.release();
    }
  });

  // 7. Register XiaoZhi device (Internal API called by Python Server)
  fastify.post('/register-xiaozhi', async (request: any, reply) => {
    const { device_id, name, ip_address, type } = request.body;
    const client = await fastify.pg.connect();
    try {
      const existing = await client.query('SELECT id FROM devices WHERE ip_address = $1 OR name = $2', [ip_address, `XiaoZhi-${device_id}`]);
      let device;
      if (existing.rows.length > 0) {
        const { rows } = await client.query('UPDATE devices SET last_seen = NOW(), ip_address = $1 WHERE id = $2 RETURNING *', [ip_address, existing.rows[0].id]);
        device = rows[0];
      } else {
        const unitRes = await client.query('SELECT id FROM units LIMIT 1');
        const channelRes = await client.query('SELECT id FROM channels LIMIT 1');
        const unitId = unitRes.rows[0]?.id || 1;
        const channelId = channelRes.rows[0]?.id || 1;
        const { rows } = await client.query(
          'INSERT INTO devices (name, type, ip_address, unit_id, channel_id, status, last_seen) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *',
          [name || `Loa XiaoZhi [${device_id}]`, type || 'xiaozhi-speaker', ip_address, unitId, channelId, 'offline']
        );
        device = rows[0];
      }
      fastify.broadcast({ type: 'device_status_update', device: device });
      return { success: true, device };
    } finally {
      client.release();
    }
  });
}
