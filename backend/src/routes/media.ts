import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import '@fastify/multipart';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { getLocalIp } from '../utils/ip.js';
import { v4 as uuidv4 } from 'uuid';
import * as musicMetadata from 'music-metadata';
import ffmpeg from 'fluent-ffmpeg';
import { generateTTS } from '../utils/tts.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export default async function mediaRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

  // 1. Upload Media
  fastify.post('/upload', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request, reply) => {
    const data = await request.file();
    if (!data) return reply.code(400).send({ error: 'No file uploaded' });

    const { filename, file, mimetype } = data;
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/vnd.wav'];
    if (!allowedMimeTypes.includes(mimetype) && !filename.match(/\.(mp3|wav)$/i)) {
      return reply.code(400).send({ error: 'Chỉ chấp nhận file định dạng MP3 hoặc WAV' });
    }

    const extension = path.extname(filename);
    const tempFilename = `temp_${uuidv4()}${extension}`;
    const finalFilename = `${uuidv4()}.mp3`;
    const tempPath = path.join(UPLOADS_DIR, tempFilename);
    const finalPath = path.join(UPLOADS_DIR, finalFilename);

    try {
      await pipeline(file, fs.createWriteStream(tempPath));
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
      const durationSeconds = metadata.format.duration || 0;
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      const client = await fastify.pg.connect();
      try {
        const parts = data.fields as any;
        const content_id = parts.content_id ? parseInt(parts.content_id.value) : null;
        const user = request.user as any;
        const query = `
          INSERT INTO media_files (file_name, file_path, file_size, mime_type, status, content_id, duration, unit_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7::interval, $8)
          RETURNING id
        `;
        const values = [filename, finalFilename, fs.statSync(finalPath).size, 'audio/mpeg', 'ready', content_id, `${Math.round(durationSeconds)} seconds`, user.unit_id];
        const { rows } = await client.query(query, values);
        return reply.code(201).send({ message: 'Xử lý file thành công', fileId: rows[0].id, fileName: filename, duration: durationSeconds });
      } finally { client.release(); }
    } catch (err) {
      fastify.log.error(err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return reply.code(500).send({ error: 'Lỗi trong quá trình xử lý âm thanh' });
    }
  });

  // 2. List Media (Strictly Scoped by Entity Unit)
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { content_id } = request.query as { content_id?: string };
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      let unitFilter = '';
      const params: any[] = [];
      let paramIdx = 1;

      // Only Global Admins bypass unit scoping
      if (!(user.role_name === 'admin' && user.unit_id === 1)) {
        const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
        const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
        // STRICT: Only files explicitly marked as belonging to this unit tree are visible.
        unitFilter = `WHERE mf.unit_id = ANY($${paramIdx++})`;
        params.push(unitIds);
      }

      if (content_id) {
        unitFilter += unitFilter ? ` AND mf.content_id = $${paramIdx++}` : ` WHERE mf.content_id = $${paramIdx++}`;
        params.push(content_id);
      }

      const query = `
        SELECT mf.*, ci.title as content_title 
        FROM media_files mf
        LEFT JOIN content_items ci ON mf.content_id = ci.id
        ${unitFilter}
        ORDER BY mf.created_at DESC
      `;
      const { rows } = await client.query(query, params);
      return rows;
    } finally { client.release(); }
  });

  // 3. Delete Media (Scoped)
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as any;
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT file_path, unit_id FROM media_files WHERE id = $1', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'File not found' });
      if (!(user.role_name === 'admin' && user.unit_id === 1)) {
          const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
          const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
          if (!unitIds.includes(rows[0].unit_id)) return reply.code(403).send({ error: 'Bạn không có quyền xóa tệp tin của đơn vị khác.' });
      }
      const filePath = path.join(UPLOADS_DIR, rows[0].file_path);
      await client.query('DELETE FROM media_files WHERE id = $1', [id]);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { message: 'Media deleted successfully' };
    } finally { client.release(); }
  });

  // 4.5 Link media to content
  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request: any, reply: any) => {
    const { id } = request.params;
    const { content_id } = request.body;
    const user = request.user as any;
    const client = await fastify.pg.connect();
    
    try {
      // Validate unit constraints
      if (!(user.role_name === 'admin' && user.unit_id === 1)) {
          const { rows } = await client.query('SELECT unit_id FROM media_files WHERE id = $1', [id]);
          if (rows.length === 0) return reply.code(404).send({ error: 'File not found' });
          const { getDescendantUnitIds } = await import('../utils/unit_utils.js');
          const unitIds = await getDescendantUnitIds(fastify.pg, user.unit_id);
          if (!unitIds.includes(rows[0].unit_id)) return reply.code(403).send({ error: 'Truy cập bị từ chối' });
      }

      await client.query('UPDATE media_files SET content_id = $1 WHERE id = $2', [content_id, id]);
      return { success: true };
    } finally {
      client.release();
    }
  });

  // 5. TTS Generation
  fastify.post('/tts', { preHandler: [fastify.authenticate, fastify.authorize(['Admin', 'Quản trị viên', 'Quản lý', 'operations_commander', 'political_commissar'])] }, async (request: any, reply) => {
    const { text, voice, file_name, content_id, rate, pitch } = request.body as any;
    const user = request.user as any;
    const uniqueFilename = `${uuidv4()}.mp3`;
    const uploadPath = path.join(UPLOADS_DIR, uniqueFilename);
    const finalFileName = file_name || `TTS_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.mp3`;
      try {
        await generateTTS({ text, voice: voice || 'vi-VN-HoaiMyNeural', rate: rate || '+0%', pitch: pitch || '+0Hz', outputPath: uploadPath });
        
        // Calculate duration using already imported musicMetadata
        const metadata = await musicMetadata.parseFile(uploadPath);
        const durationSeconds = metadata.format.duration || 0;

        const client = await fastify.pg.connect();
        try {
          const query = `
            INSERT INTO media_files (file_name, file_path, file_size, mime_type, status, content_id, duration, unit_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7::interval, $8) RETURNING id
          `;
          const values = [
            finalFileName, 
            uniqueFilename, 
            fs.statSync(uploadPath).size, 
            'audio/mpeg', 
            'ready', 
            content_id || null, 
            `${Math.round(durationSeconds)} seconds`,
            user.unit_id
          ];
          const { rows } = await client.query(query, values);
          return reply.code(201).send({ 
            message: 'TTS generation successful', 
            fileId: rows[0].id, 
            fileName: finalFileName,
            filePath: uniqueFilename, // Added for frontend immediate play
            duration: durationSeconds   // Added for frontend immediate info
          });
        } finally { client.release(); }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to generate TTS' });
    }
  });

  fastify.post('/stop', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    fastify.broadcast({ type: 'broadcast-stop' });
    return { success: true };
  });
}
