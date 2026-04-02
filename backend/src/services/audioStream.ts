import ffmpeg from 'fluent-ffmpeg';
import { WebSocket } from 'ws';
import { PassThrough } from 'stream';
import fs from 'fs';
import path from 'path';

const LOG_FILE = './debug_audio.log';
function logToFile(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(LOG_FILE, `[${timestamp}] ${msg}\n`);
}

interface AudioClient {
  socket: WebSocket;
  protocol?: string;
}

export class AudioStreamService {
  private static activeStreams = new Map<string, any>();

  /**
   * Bắt đầu stream một file audio hoặc URL tới một tập hợp các WebSocket
   * @param sourcePath Đường dẫn file hoặc URL stream
   * @param clients Danh sách các client nhận dữ liệu
   * @param streamId ID định danh cho luồng stream này (để dừng sau này)
   */
  static async startStream(sourcePath: string, clients: AudioClient[], streamId: string) {
    // Dừng stream cũ nếu trùng ID
    this.stopStream(streamId);

    // Resolve local path if it's an uploads file
    let finalPath = sourcePath;
    if (sourcePath.includes('/uploads/')) {
      const fileName = sourcePath.split('/uploads/')[1];
      // Giả định thư mục gốc của backend có folder uploads
      finalPath = `./uploads/${fileName}`; 
      logToFile(`[AudioStream] Resolved local path for ${streamId}: ${finalPath}`);
    } else {
      logToFile(`[AudioStream] Streaming from URL for ${streamId}: ${finalPath}`);
    }

    const pcmStream = new PassThrough({ highWaterMark: 64 * 1024 });
    
    // Cấu hình FFmpeg: Convert sang PCM 16kHz, 16-bit, Mono + Bình thường hóa âm lượng
    const command = ffmpeg(finalPath)
      .format('s16le')
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .audioFilters([
        'volume=0.9', // Giảm nhẹ volume để tránh rè (clipping)
        'compand=0.3|0.3:6:-90/-90/-70/-55/-43/-31/-21/-21:6:0:-90:0.2' // Nén dải động để nghe rõ hơn trên loa nhỏ
      ])
      .on('start', (cmdLine) => {
        logToFile(`[AudioStream] FFmpeg started with: ${cmdLine}`);
        logToFile(`[AudioStream] Target clients for ${streamId}: ${clients.length}`);
      })
      .on('progress', (progress) => {
        // console.log(`[AudioStream] Progress: ${progress.timemark}`);
      })
      .on('error', (err) => {
        console.error(`[AudioStream] FFmpeg Error: ${err.message}`);
        this.stopStream(streamId);
      })
      .on('end', () => {
        logToFile(`[AudioStream] Stream finished: ${streamId}`);
        this.stopStream(streamId);
      });

    const outputStream = command.pipe(pcmStream);
    this.activeStreams.set(streamId, command);

    // Store state for possible resume
    (command as any)._pcmStream = pcmStream;
    (command as any)._clients = clients;

    this.startInterval(streamId, pcmStream, command, clients);
  }

  private static startInterval(streamId: string, pcmStream: any, command: any, clients: AudioClient[]) {
    // Thông số kỹ thuật
    const CHUNK_SIZE = 640; // 20ms of audio at 16000Hz 16-bit Mono
    const INTERVAL_MS = 10; // Chạy timer mỗi 10ms để linh hoạt gửi bù
    const PREBUFFER_CHUNKS = 50; // 1 giây ban đầu
    
    let chunksSent = 0;
    const startTime = Date.now();

    // Cơ chế Flow Control: Gửi theo thời gian thực (Dynamic Catch-up)
    const sendInterval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - startTime;
      
      // Tính toán số lượng chunk LẼ RA phải được gửi dựa trên thời gian đã trôi qua
      const expectedChunks = Math.floor(elapsedMs / 20) + PREBUFFER_CHUNKS;
      
      const maxBurst = 5;
      let burstCount = 0;

      while (chunksSent < expectedChunks && burstCount < maxBurst) {
        const chunk = pcmStream.read(CHUNK_SIZE);
        if (chunk) {
          clients.forEach(client => {
            if (client.socket.readyState === WebSocket.OPEN) {
              if (client.protocol === 'xiaozhi-v3') {
                const header = Buffer.alloc(4);
                header[0] = 0x01; 
                header[1] = 0x00;
                header.writeUInt16BE(chunk.length, 2);
                client.socket.send(Buffer.concat([header, chunk]), { binary: true });
              } else {
                client.socket.send(chunk, { binary: true });
              }
            }
          });
          chunksSent++;
          burstCount++;
        } else {
          if (pcmStream.readableEnded) {
            console.log(`[AudioStream] End of stream detected for ${streamId}`);
            this.stopStream(streamId);
            return;
          }
          break;
        }
      }
    }, INTERVAL_MS);

    // Lưu interval để clear khi stop/pause
    (command as any)._streamInterval = sendInterval;
  }

  static pauseStream(streamId: string) {
    const command = this.activeStreams.get(streamId);
    if (command && (command as any)._streamInterval) {
      clearInterval((command as any)._streamInterval);
      (command as any)._streamInterval = null;
      console.log(`[AudioStream] Stream paused: ${streamId}`);
      return true;
    }
    return false;
  }

  static resumeStream(streamId: string) {
    const command = this.activeStreams.get(streamId);
    if (command && !(command as any)._streamInterval && (command as any)._pcmStream && (command as any)._clients) {
      this.startInterval(streamId, (command as any)._pcmStream, command, (command as any)._clients);
      console.log(`[AudioStream] Stream resumed: ${streamId}`);
      return true;
    }
    return false;
  }

  static stopStream(streamId: string) {
    const command = this.activeStreams.get(streamId);
    if (command) {
      if ((command as any)._streamInterval) {
        clearInterval((command as any)._streamInterval);
      }
      try {
        command.kill('SIGKILL');
      } catch (e) {}
      this.activeStreams.delete(streamId);
      console.log(`[AudioStream] Stream stopped: ${streamId}`);
    }
  }

  static stopAll() {
    for (const id of this.activeStreams.keys()) {
      this.stopStream(id);
    }
  }
}
