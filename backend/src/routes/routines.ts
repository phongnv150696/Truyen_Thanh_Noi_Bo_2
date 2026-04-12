import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as musicMetadata from 'music-metadata';
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import { getFullURL } from '../utils/url.js';
import { getAudioMetadata } from '../utils/audio_meta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export default async function routineRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

  // 1. Get routines for the current unit
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'SELECT * FROM routine_commands WHERE unit_id = $1 ORDER BY id ASC',
        [user.unit_id]
      );
      return rows;
    } finally {
      client.release();
    }
  });

  // 1.5 Create a new routine signal
  fastify.post('/', { 
    preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] 
  }, async (request, reply) => {
    const { title, type } = request.body as { title: string, type: string };
    const user = request.user as any;

    if (!title || !type) return reply.code(400).send({ error: 'Thiếu title hoặc type' });

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        'INSERT INTO routine_commands (title, type, unit_id) VALUES ($1, $2, $3) RETURNING *',
        [title, type, user.unit_id]
      );
      return rows[0];
    } finally {
      client.release();
    }
  });

  // 2. Upload/Replace audio file for a routine
  fastify.post('/:id/upload', { 
    preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] 
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as any;
    const data = await request.file();
    
    if (!data) return reply.code(400).send({ error: 'No file uploaded' });

    const { filename, file, mimetype } = data;
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/vnd.wav'];
    if (!allowedMimeTypes.includes(mimetype) && !filename.match(/\.(mp3|wav)$/i)) {
      return reply.code(400).send({ error: 'Chỉ chấp nhận file định dạng MP3 hoặc WAV' });
    }

    const extension = path.extname(filename);
    const tempFilename = `temp_routine_${uuidv4()}${extension}`;
    const finalFilename = `routine_${uuidv4()}.mp3`;
    const tempPath = path.join(UPLOADS_DIR, tempFilename);
    const finalPath = path.join(UPLOADS_DIR, finalFilename);

    const client = await fastify.pg.connect();
    try {
      // Check ownership
      const { rows: existing } = await client.query('SELECT file_path, unit_id FROM routine_commands WHERE id = $1', [id]);
      if (existing.length === 0) return reply.code(404).send({ error: 'Routine not found' });
      if (existing[0].unit_id !== user.unit_id && user.id !== 1) {
        return reply.code(403).send({ error: 'Bạn không có quyền sửa đổi nội dung của đơn vị khác' });
      }

      // Save temp
      await pipeline(file, fs.createWriteStream(tempPath));

      // Process with FFmpeg
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .toFormat('mp3')
          .audioBitrate(128)
          .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11')
          .on('error', (err) => reject(err))
          .on('end', () => resolve(true))
          .save(finalPath);
      });

      const metadata = await musicMetadata.parseFile(finalPath);
      const durationSeconds = Math.round(metadata.format.duration || 0);
      const fileSize = fs.statSync(finalPath).size;
      const fileSizeStr = (fileSize / (1024 * 1024)).toFixed(2) + ' MB';

      // Clean up temp
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      // Delete old file if exists
      if (existing[0].file_path) {
        const oldFile = path.join(UPLOADS_DIR, existing[0].file_path);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }

      // Update DB
      await client.query(
        'UPDATE routine_commands SET file_path = $1, duration = $2, file_size = $3, updated_at = NOW() WHERE id = $4',
        [finalFilename, durationSeconds, fileSizeStr, id]
      );

      return { 
        message: 'Tải lên thành công', 
        file_path: finalFilename, 
        duration: durationSeconds, 
        file_size: fileSizeStr 
      };
    } catch (err) {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Lỗi trong quá trình xử lý âm thanh' });
    } finally {
      client.release();
    }
  });

  // 3. Play routine immediately
  fastify.post('/:id/play', { 
    preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] 
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { channel_id } = request.body as { channel_id?: number };
    const user = request.user as any;
    
    if (!channel_id) return reply.code(400).send({ error: 'Thiếu channel_id' });

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM routine_commands WHERE id = $1', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'Routine not found' });
      if (rows[0].unit_id !== user.unit_id && user.id !== 1) {
        return reply.code(403).send({ error: 'Bạn không có quyền này' });
      }
      if (!rows[0].file_path) return reply.code(400).send({ error: 'Chưa có file âm thanh cho hiệu lệnh này' });

      // Fetch channel info
      const { rows: channels } = await client.query('SELECT id, name, mount_point FROM channels WHERE id = $1', [channel_id]);
      if (channels.length === 0) return reply.code(404).send({ error: 'Kênh không tồn tại' });

      const routine = rows[0];
      const channel = channels[0];

      if ((fastify as any).broadcast) {
        (fastify as any).broadcast({
          type: 'broadcast-start',
          channel_id: channel.id,
          title: `Hiệu lệnh: ${routine.title}`,
          channel: channel.name,
          mount_point: channel.mount_point,
          file_url: getFullURL(`uploads/${routine.file_path}`),
          is_routine: true,
          duration: routine.duration || 0,
          file_size: routine.file_size || '',
          user: user.full_name || 'Admin',
          scheduled: false
        });
      }

      // Log into session
      await client.query(
        `INSERT INTO broadcast_sessions (routine_id, channel_id, start_time, duration, status)
         VALUES ($1, $2, NOW(), $3, 'completed')`,
        [routine.id, channel.id, routine.duration || 300]
      );

      return { message: 'Đã bắt đầu phát hiệu lệnh' };
    } finally {
      client.release();
    }
  });

  // 4. Delete audio file
  fastify.delete('/:id/file', { 
    preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] 
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as any;

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT file_path, unit_id FROM routine_commands WHERE id = $1', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'Routine not found' });
      if (rows[0].unit_id !== user.unit_id && user.id !== 1) {
        return reply.code(403).send({ error: 'Truy cập bị từ chối' });
      }

      if (rows[0].file_path) {
        const filePath = path.join(UPLOADS_DIR, rows[0].file_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      await client.query(
        'UPDATE routine_commands SET file_path = NULL, duration = NULL, file_size = NULL, updated_at = NOW() WHERE id = $1',
        [id]
      );

      return { message: 'Đã xóa file âm thanh' };
    } finally {
      client.release();
    }
  });

  // 5. Delete entire routine command
  fastify.delete('/:id', { 
    preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar', 'Thành viên'])] 
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as any;

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT file_path, unit_id FROM routine_commands WHERE id = $1', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'Routine not found' });
      
      // Ownership check (allow id 1 - system admin)
      if (rows[0].unit_id !== user.unit_id && user.id !== 1) {
        return reply.code(403).send({ error: 'Bạn không có quyền xóa hiệu lệnh của đơn vị khác' });
      }

      // 1. Delete file if exists
      if (rows[0].file_path) {
        const filePath = path.join(UPLOADS_DIR, rows[0].file_path);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }

      // 2. Delete record (Cascades to schedules due to migration)
      await client.query('DELETE FROM routine_commands WHERE id = $1', [id]);

      return { message: 'Đã xóa hiệu lệnh và các lịch phát liên quan' };
    } finally {
      client.release();
    }
  });
}
