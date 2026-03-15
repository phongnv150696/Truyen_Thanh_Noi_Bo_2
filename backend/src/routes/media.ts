import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import '@fastify/multipart';
import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export default async function mediaRoutes(fastify: FastifyInstance, options: FastifyPluginOptions) {
  
  // 1. Upload Media
  fastify.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.code(400).send({ error: 'No file uploaded' });
    }

    const { filename, file, mimetype } = data;
    const extension = path.extname(filename);
    const uniqueFilename = `${uuidv4()}${extension}`;
    const uploadPath = path.join(process.cwd(), 'uploads', uniqueFilename);

    try {
      // Save file to disk
      await pipeline(file, fs.createWriteStream(uploadPath));

      // Get file size
      const stats = fs.statSync(uploadPath);
      const fileSize = stats.size;

      // Insert into Database (media_files table)
      const client = await fastify.pg.connect();
      try {
        const query = `
          INSERT INTO media_files (file_name, file_path, file_size, mime_type, status)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        const values = [filename, uniqueFilename, fileSize, mimetype, 'ready'];
        const { rows } = await client.query(query, values);
        
        return reply.code(201).send({ 
          message: 'Upload successful', 
          fileId: rows[0].id,
          fileName: filename
        });
      } finally {
        client.release();
      }
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to save media file' });
    }
  });

  // 2. List Media
  fastify.get('/', async (request, reply) => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query('SELECT * FROM media_files ORDER BY created_at DESC');
      return rows;
    } finally {
      client.release();
    }
  });

  // 3. Delete Media
  fastify.delete('/:id', async (request, reply) => {
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
  fastify.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { file_name } = request.body as { file_name: string };

    if (!file_name) {
      return reply.code(400).send({ error: 'File name is required' });
    }

    const client = await fastify.pg.connect();
    try {
      const query = 'UPDATE media_files SET file_name = $1 WHERE id = $2 RETURNING *';
      const { rows } = await client.query(query, [file_name, id]);
      
      if (rows.length === 0) {
        return reply.code(404).send({ error: 'File not found' });
      }

      return { message: 'Media updated successfully', file: rows[0] };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to update media' });
    } finally {
      client.release();
    }
  });
}
