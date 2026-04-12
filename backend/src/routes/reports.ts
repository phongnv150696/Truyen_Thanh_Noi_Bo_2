import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import * as XLSX from 'xlsx';

export default async function reportRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Get detailed broadcast history for devices (Scoped)
  fastify.get('/history', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { startDate, endDate, channelId, unitId, status, deviceId } = request.query as any;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          l.id, l.start_time, l.end_time, l.status, l.error_message,
          d.name as device_name, d.ip_address, u.name as unit_name,
          c.name as channel_name, ci.title as content_title,
          EXTRACT(EPOCH FROM (l.end_time - l.start_time)) as duration
        FROM device_broadcast_logs l
        JOIN devices d ON l.device_id = d.id
        LEFT JOIN units u ON d.unit_id = u.id
        LEFT JOIN channels c ON l.channel_id = c.id
        LEFT JOIN content_items ci ON l.content_id = ci.id
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramIdx = 1;

      // Scoped Admin Logic
      if (!(user.role_name === 'admin' && user.unit_id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const allowedUnitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        
        if (unitId && unitId !== 'all') {
          const target = parseInt(unitId);
          if (!allowedUnitIds.includes(target)) return reply.code(403).send({ error: 'Bạn không có quyền xem báo cáo của đơn vị này.' });
          query += ` AND d.unit_id = $${paramIdx++}`;
          values.push(target);
        } else {
          query += ` AND d.unit_id = ANY($${paramIdx++})`;
          values.push(allowedUnitIds);
        }
      } else if (unitId && unitId !== 'all') {
        query += ` AND d.unit_id = $${paramIdx++}`;
        values.push(unitId);
      }
      
      if (startDate) {
        query += ` AND l.start_time >= $${paramIdx++}`;
        values.push(startDate);
      }
      if (endDate) {
        query += ` AND l.start_time <= $${paramIdx++}`;
        values.push(endDate + ' 23:59:59');
      }
      if (channelId && channelId !== 'all') {
        query += ` AND l.channel_id = $${paramIdx++}`;
        values.push(channelId);
      }
      if (status && status !== 'all') {
        query += ` AND l.status = $${paramIdx++}`;
        values.push(status);
      }
      if (deviceId) {
        query += ` AND l.device_id = $${paramIdx++}`;
        values.push(deviceId);
      }
      
      query += ` ORDER BY l.start_time DESC LIMIT 500`;
      const res = await client.query(query, values);
      return res.rows;
    } finally {
      client.release();
    }
  });

  // 2. Export History to Excel (Scoped)
  fastify.get('/export', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { startDate, endDate, channelId, unitId, status } = request.query as any;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    
    try {
      let query = `
        SELECT 
          l.start_time as "Thời gian bắt đầu",
          l.end_time as "Thời gian kết thúc",
          d.name as "Tên thiết bị",
          u.name as "Đơn vị",
          c.name as "Kênh",
          ci.title as "Nội dung",
          l.status as "Trạng thái",
          l.error_message as "Ghi chú/Lỗi"
        FROM device_broadcast_logs l
        JOIN devices d ON l.device_id = d.id
        LEFT JOIN units u ON d.unit_id = u.id
        LEFT JOIN channels c ON l.channel_id = c.id
        LEFT JOIN content_items ci ON l.content_id = ci.id
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramIdx = 1;

      if (!(user.role_name === 'admin' && user.unit_id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const allowedUnitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        
        if (unitId && unitId !== 'all') {
          const target = parseInt(unitId);
          if (!allowedUnitIds.includes(target)) return reply.code(403).send({ error: 'Bạn không có quyền xuất báo cáo cho đơn vị này.' });
          query += ` AND d.unit_id = $${paramIdx++}`;
          values.push(target);
        } else {
          query += ` AND d.unit_id = ANY($${paramIdx++})`;
          values.push(allowedUnitIds);
        }
      } else if (unitId && unitId !== 'all') {
        query += ` AND d.unit_id = $${paramIdx++}`;
        values.push(unitId);
      }
      
      if (startDate) {
        query += ` AND l.start_time >= $${paramIdx++}`;
        values.push(startDate);
      }
      if (endDate) {
        query += ` AND l.start_time <= $${paramIdx++}`;
        values.push(endDate + ' 23:59:59');
      }
      if (channelId && channelId !== 'all') {
        query += ` AND l.channel_id = $${paramIdx++}`;
        values.push(channelId);
      }
      
      query += ` ORDER BY l.start_time DESC`;
      const res = await client.query(query, values);

      const formattedData = res.rows.map(row => ({
        ...row,
        "Thời gian bắt đầu": row["Thời gian bắt đầu"] ? new Date(row["Thời gian bắt đầu"]).toLocaleString('vi-VN') : '',
        "Thời gian kết thúc": row["Thời gian kết thúc"] ? new Date(row["Thời gian kết thúc"]).toLocaleString('vi-VN') : '',
        "Trạng thái": row["Trạng thái"] === 'success' ? 'Thành công' : row["Trạng thái"] === 'failed' ? 'Lỗi' : 'Đang phát'
      }));

      const ws = XLSX.utils.json_to_sheet(formattedData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Lich_su_phat_thanh");
      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      reply
        .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        .header('Content-Disposition', `attachment; filename="Bao_cao_phat_thanh_${new Date().getTime()}.xlsx"`)
        .send(buf);

    } finally {
      client.release();
    }
  });
}
