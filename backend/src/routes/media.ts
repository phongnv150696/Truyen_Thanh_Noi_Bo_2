import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import '@fastify/multipart';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as musicMetadata from 'music-metadata';
import ffmpeg from 'fluent-ffmpeg';
import { generateTTS } from '../utils/tts.js';

export default async function mediaRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {

  // 1. Upload Media
  fastify.post('/upload', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'editor'])] }, async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const { filename, file, mimetype } = data;

    // Validation: Mime-type
    const allowedMimeTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/vnd.wav'];
    if (!allowedMimeTypes.includes(mimetype) && !filename.match(/\.(mp3|wav)$/i)) {
      return reply.code(400).send({ error: 'Chỉ chấp nhận file định dạng MP3 hoặc WAV' });
    }

    const extension = path.extname(filename);
    const tempFilename = `temp_${uuidv4()}${extension}`;
    const finalFilename = `${uuidv4()}.mp3`;
    const tempPath = path.join(process.cwd(), 'uploads', tempFilename);
    const finalPath = path.join(process.cwd(), 'uploads', finalFilename);

    try {
      // 1. Save temp file
      await pipeline(file, fs.createWriteStream(tempPath));

      // 2. Validate Size (< 20MB)
      const stats = fs.statSync(tempPath);
      if (stats.size > 20 * 1024 * 1024) {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        return reply.code(400).send({ error: 'Dung lượng file vượt quá giới hạn 20MB' });
      }

      // 3. Standardize (Convert to MP3 128kbps + Normalize)
      await new Promise((resolve, reject) => {
        ffmpeg(tempPath)
          .toFormat('mp3')
          .audioBitrate(128)
          .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11') // EBU R128 Normalization
          .on('error', (err) => reject(err))
          .on('end', () => resolve(true))
          .save(finalPath);
      });

      // 4. Extract Metadata
      const metadata = await musicMetadata.parseFile(finalPath);
      const durationSeconds = metadata.format.duration || 0;

      // Cleanup temp file
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      // 5. Save to Database
      const client = await fastify.pg.connect();
      try {
        const parts = data.fields as any;
        const content_id = parts.content_id ? parseInt(parts.content_id.value) : null;

        const query = `
          INSERT INTO media_files (file_name, file_path, file_size, mime_type, status, content_id, duration)
          VALUES ($1, $2, $3, $4, $5, $6, $7::interval)
          RETURNING id
        `;
        const values = [
          filename,
          finalFilename,
          fs.statSync(finalPath).size,
          'audio/mpeg',
          'ready',
          content_id,
          `${Math.round(durationSeconds)} seconds`
        ];
        const { rows } = await client.query(query, values);

        return reply.code(201).send({
          message: 'Xử lý file thành công',
          fileId: rows[0].id,
          fileName: filename,
          duration: durationSeconds
        });
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      return reply.code(500).send({ error: 'Lỗi trong quá trình xử lý âm thanh' });
    }
  });

  // 2. List Media
  fastify.get('/', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'editor'])] }, async (request, reply) => {
    const { content_id } = request.query as { content_id?: string };
    const client = await fastify.pg.connect();
    try {
      let query = `
        SELECT 
          mf.*, 
          ci.title as content_title 
        FROM media_files mf
        LEFT JOIN content_items ci ON mf.content_id = ci.id
      `;
      const values: any[] = [];
      if (content_id) {
        query += ` WHERE mf.content_id = $1`;
        values.push(content_id);
      }
      query += ` ORDER BY mf.created_at DESC`;

      const { rows } = await client.query(query, values);
      return rows;
    } finally {
      client.release();
    }
  });

  // 3. Delete Media
  fastify.delete('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();

    try {
      // Get file path first
      const { rows } = await client.query('SELECT file_path FROM media_files WHERE id = $1', [id]);
      if (rows.length === 0) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const filePath = path.join(process.cwd(), 'uploads', rows[0].file_path);

      // Delete from DB
      await client.query('DELETE FROM media_files WHERE id = $1', [id]);

      // Delete from disk
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      return { message: 'Media deleted successfully' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete media' });
    } finally {
      client.release();
    }
  });

  // 4. Update Media (Rename)
  fastify.patch('/:id', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { file_name, content_id } = request.body as { file_name?: string; content_id?: number | null };

    const client = await fastify.pg.connect();
    try {
      // Build dynamic update query
      const updates = [];
      const values = [];
      let idx = 1;

      if (file_name !== undefined) {
        updates.push(`file_name = $${idx++}`);
        values.push(file_name);
      }
      if (content_id !== undefined) {
        updates.push(`content_id = $${idx++}`);
        values.push(content_id);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      values.push(id);
      const query = `
        UPDATE media_files 
        SET ${updates.join(', ')} 
        WHERE id = $${idx} 
        RETURNING *
      `;
      const { rows } = await client.query(query, values);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'File not found' });
      }

      // Fetch with joined title for frontend consistency
      const { rows: joinedRows } = await client.query(`
        SELECT mf.*, ci.title as content_title 
        FROM media_files mf 
        LEFT JOIN content_items ci ON mf.content_id = ci.id 
        WHERE mf.id = $1
      `, [id]);

      return { message: 'Media updated successfully', file: joinedRows[0] };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update media' });
    } finally {
      client.release();
    }
  });

  // 5. TTS Generation
  fastify.post('/tts', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request, reply) => {
    const { text, voice, file_name, content_id, rate, pitch } = request.body as {
      text: string;
      voice?: string;
      file_name?: string;
      content_id?: number;
      rate?: string;
      pitch?: string;
    };

    if (!text) {
      return reply.code(400).send({ error: 'Text is required' });
    }

    const uniqueFilename = `${uuidv4()}.mp3`;
    const uploadPath = path.join(process.cwd(), 'uploads', uniqueFilename);
    const finalFileName = file_name || `TTS_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.mp3`;

    try {
      // 1. Generate TTS
      await generateTTS({
        text,
        voice: voice || 'vi-VN-HoaiMyNeural',
        rate: rate || '+0%',
        pitch: pitch || '+0Hz',
        outputPath: uploadPath
      });

      // 2. Get file size
      const stats = fs.statSync(uploadPath);
      const fileSize = stats.size;

      // 3. Save to database
      const client = await fastify.pg.connect();
      try {
        const query = `
          INSERT INTO media_files (file_name, file_path, file_size, mime_type, status, content_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;
        const values = [finalFileName, uniqueFilename, fileSize, 'audio/mpeg', 'ready', content_id || null];
        const { rows } = await client.query(query, values);

        return reply.code(201).send({
          message: 'TTS generation successful',
          fileId: rows[0].id,
          fileName: finalFileName
        });
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to generate TTS' });
    }
  });

  // 6. Bulk delete media
  fastify.post('/bulk-delete', async (request, reply) => {
    const { ids } = request.body as { ids: number[] };
    if (!ids || !ids.length) {
      return reply.code(400).send({ error: 'No IDs provided' });
    }

    const client = await fastify.pg.connect();
    try {
      // Get file paths first
      const { rows } = await client.query('SELECT file_path FROM media_files WHERE id = ANY($1)', [ids]);

      // Delete from DB
      const result = await client.query('DELETE FROM media_files WHERE id = ANY($1)', [ids]);

      // Delete from disk
      for (const row of rows) {
        const filePath = path.join(process.cwd(), 'uploads', row.file_path);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }

      return { message: `${result.rowCount} media files deleted successfully` };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to delete media files' });
    } finally {
      client.release();
    }
  });

  // 7. Trim Media
  fastify.post('/trim', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request, reply) => {
    const { id, startTime, endTime } = request.body as { id: number, startTime: number, endTime: number };
    if (startTime < 0 || endTime <= startTime) {
      return reply.code(400).send({ error: 'Thời gian bắt đầu hoặc kết thúc không hợp lệ' });
    }

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT file_path, file_name, content_id FROM media_files WHERE id = $1', [id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'Không tìm thấy file' });

      const sourcePath = path.join(process.cwd(), 'uploads', rows[0].file_path);
      const uniqueFilename = `trim_${uuidv4()}.mp3`;
      const outputPath = path.join(process.cwd(), 'uploads', uniqueFilename);
      const duration = endTime - startTime;

      await new Promise((resolve, reject) => {
        ffmpeg(sourcePath)
          .setStartTime(startTime)
          .setDuration(duration)
          .audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11') // Keep normalization
          .on('error', (err) => reject(err))
          .on('end', () => resolve(true))
          .save(outputPath);
      });

      const stats = fs.statSync(outputPath);
      const query = `
        INSERT INTO media_files (file_name, file_path, file_size, mime_type, status, content_id, duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7::interval)
        RETURNING id
      `;
      const values = [
        `Trimmed_${rows[0].file_name}`,
        uniqueFilename,
        stats.size,
        'audio/mpeg',
        'ready',
        rows[0].content_id,
        `${Math.round(duration)} seconds`
      ];
      const result = await client.query(query, values);

      return reply.code(201).send({
        message: 'Cắt đoạn thành công',
        fileId: result.rows[0].id,
        duration: duration
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Lỗi khi cắt audio' });
    } finally {
      client.release();
    }
  });

  // 8. Merge Media
  fastify.post('/merge', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'editor'])] }, async (request, reply) => {
    const { ids, content_id } = request.body as { ids: number[], content_id?: number };
    if (!ids || ids.length < 2) {
      return reply.code(400).send({ error: 'Cần ít nhất 2 file để ghép' });
    }

    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(`
        SELECT file_path FROM media_files 
        WHERE id = ANY($1) 
        ORDER BY array_position($1, id)
      `, [ids]);

      if (rows.length !== ids.length) {
        return reply.code(404).send({ error: 'Một số file không tồn tại' });
      }

      const uniqueFilename = `merge_${uuidv4()}.mp3`;
      const outputPath = path.join(process.cwd(), 'uploads', uniqueFilename);
      const tempDir = path.join(process.cwd(), 'uploads');

      const ff = ffmpeg();
      rows.forEach(r => ff.input(path.join(process.cwd(), 'uploads', r.file_path)));

      await new Promise((resolve, reject) => {
        ff.on('error', (err) => reject(err))
          .on('end', () => resolve(true))
          .mergeToFile(outputPath, tempDir);
      });

      const metadata = await musicMetadata.parseFile(outputPath);
      const durationSeconds = metadata.format.duration || 0;
      const stats = fs.statSync(outputPath);

      const query = `
        INSERT INTO media_files (file_name, file_path, file_size, mime_type, status, content_id, duration)
        VALUES ($1, $2, $3, $4, $5, $6, $7::interval)
        RETURNING id
      `;
      const values = [
        `Merged_${new Date().getTime()}.mp3`,
        uniqueFilename,
        stats.size,
        'audio/mpeg',
        'ready',
        content_id || null,
        `${Math.round(durationSeconds)} seconds`
      ];
      const result = await client.query(query, values);

      return reply.code(201).send({
        message: 'Ghép file thành công',
        fileId: result.rows[0].id,
        duration: durationSeconds
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Lỗi khi ghép audio' });
    } finally {
      client.release();
    }
  });

  // 9. Broadcast Media (Play Now through speakers)
  fastify.post('/:id/broadcast', { preHandler: [fastify.authenticate, fastify.authorize(['admin', 'technician', 'commander'])] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();

    try {
      const { rows } = await client.query(`
        SELECT mf.*, ci.title as content_title 
        FROM media_files mf
        LEFT JOIN content_items ci ON mf.content_id = ci.id
        WHERE mf.id = $1
      `, [id]);

      if (rows.length === 0) {
        return reply.code(404).send({ error: 'Không tìm thấy tệp tin' });
      }

      const file = rows[0];

      // Get first available channel
      const channelRes = await client.query("SELECT id, name, mount_point FROM channels WHERE status = 'online' LIMIT 1");
      if (channelRes.rowCount === 0) {
        return reply.code(400).send({ error: 'Không có kênh nào đang trực tuyến để phát.' });
      }
      const channel = channelRes.rows[0];

      // Trigger the broadcast via WebSocket
      if ((fastify as any).broadcast) {
        (fastify as any).broadcast({
          type: 'broadcast-start',
          channel_id: channel.id,
          media_id: id,
          title: file.content_title || file.file_name,
          channel: channel.name,
          file_url: `http://127.0.0.1:3000/uploads/${file.file_path}`,
          user: (request.user as any)?.full_name || 'Admin'
        });

        fastify.log.info(`Direct broadcast triggered for media ${id}`);
        return { message: 'Đã kích hoạt phát sóng trực tiếp thành công' };
      } else {
        return reply.code(500).send({ error: 'Hệ thống WebSocket chưa sẵn sàng' });
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Lỗi khi kích hoạt phát sóng' });
    } finally {
      client.release();
    }
  });
}
