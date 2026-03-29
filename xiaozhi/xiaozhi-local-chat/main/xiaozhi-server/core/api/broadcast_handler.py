import json
import asyncio
import aiohttp
import os
import subprocess
import uuid
from aiohttp import web
from core.utils.util import audio_to_data
from core.handle.sendAudioHandle import sendAudio

TAG = "BroadcastHandler"

class BroadcastHandler:
    def __init__(self, config, ws_server):
        self.config = config
        self.ws_server = ws_server

    async def handle_post(self, request):
        try:
            data = await request.json()
            media_url = data.get("media_url")
            device_id = data.get("device_id", "*") # * for all
            title = data.get("title", "Thông báo")
            is_emergency = data.get("is_emergency", False)

            if not media_url:
                return web.json_response({"error": "Missing media_url"}, status=400)

            # 1. Decide if it's a stream or a file
            is_stream = any(ext in media_url for ext in [".m3u8", ".pls", ".ashx"]) or "icecast" in media_url.lower() or media_url.endswith(".mp3") and not "storage" in media_url

            if is_stream:
                print(f"[{TAG}] Starting LIVE STREAM: {media_url}", flush=True)
                # For stream, we use a separate play function that uses ffmpeg pipe
                for conn in targets:
                    conn.client_abort = True 
                    asyncio.create_task(self._play_stream_on_connection(conn, media_url, title))
                return web.json_response({"success": True, "stream_started": count})

            # Existing file download logic
            temp_filename = f"tmp/broadcast_{uuid.uuid4().hex}.mp3"
            os.makedirs("tmp", exist_ok=True)
            
            async with aiohttp.ClientSession() as session:
                async with session.get(media_url) as resp:
                    if resp.status != 200:
                        return web.json_response({"error": f"Failed to download media: {resp.status}"}, status=400)
                    with open(temp_filename, "wb") as f:
                        f.write(await resp.read())

            # 2. Convert to Opus using ffmpeg
            # XiaoZhi expects Opus packets (16kHz, mono)
            # We use audio_to_data from core.utils.util which handles ffmpeg call
            try:
                # This function returns a list of opus packets
                opus_packets = audio_to_data(temp_filename, is_opus=True)
            except Exception as e:
                if os.path.exists(temp_filename):
                    os.remove(temp_filename)
                return web.json_response({"error": f"Conversion failed: {str(e)}"}, status=500)

            # Cleanup temp file
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

            # 3. Inject to active connections
            count = 0
            if device_id == "*":
                targets = self.ws_server.active_connections.values()
            else:
                conn = self.ws_server.active_connections.get(device_id)
                targets = [conn] if conn else []

            for conn in targets:
                # Stop current AI speaking if any
                conn.client_abort = True 
                
                # We need to run this in the background for each connection
                asyncio.create_task(self._play_on_connection(conn, opus_packets, title))
                count += 1

            return web.json_response({"success": True, "devices_triggered": count})

        except Exception as e:
            print(f"[{TAG}] Error: {str(e)}", flush=True)
            return web.json_response({"error": str(e)}, status=500)

    async def _play_on_connection(self, conn, opus_packets, title):
        try:
            # Mark as template playing to mute other TTS
            conn.audio_template_playing = True
            
            # Send a UI message to the device if supported
            await conn.websocket.send(json.dumps({
                "type": "stt", 
                "text": f"[TRUYỀN THANH] {title}",
                "session_id": conn.session_id
            }))
            
            # Use the existing sendAudio logic
            await sendAudio(conn, opus_packets)
            
            conn.audio_template_playing = False
        except Exception as e:
            print(f"[{TAG}] Playback error on {conn}: {e}", flush=True)
            conn.audio_template_playing = False

    async def _play_stream_on_connection(self, conn, media_url, title):
        import subprocess
        import opuslib_next
        import numpy as np
        from core.handle.sendAudioHandle import sendAudio

        try:
            conn.audio_template_playing = True
            await conn.websocket.send(json.dumps({
                "type": "stt", 
                "text": f"[RADIO] {title}",
                "session_id": conn.session_id
            }))

            # FFmpeg to raw PCM 16k mono
            cmd = [
                'ffmpeg', '-i', media_url,
                '-f', 's16le', '-acodec', 'pcm_s16le',
                '-ar', '16000', '-ac', '1', '-'
            ]
            
            # Use asyncio.create_subprocess_exec for non-blocking read if possible, 
            # but for simplicity in this thread-like task, Popen is okay if we are careful.
            # However, to avoid blocking the event loop on process.stdout.read, 
            # we should use asyncio subprocess.
            
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL
            )
            
            encoder = opuslib_next.Encoder(16000, 1, opuslib_next.APPLICATION_AUDIO)
            frame_duration = 60
            frame_size = int(16000 * frame_duration / 1000)
            chunk_size = frame_size * 2

            print(f"[{TAG}] Stream for {conn.device_id} started.", flush=True)

            while not conn.client_abort:
                chunk = await process.stdout.read(chunk_size)
                if not chunk:
                    break
                
                if len(chunk) < chunk_size:
                    chunk += b"\x00" * (chunk_size - len(chunk))
                
                np_frame = np.frombuffer(chunk, dtype=np.int16)
                opus_data = encoder.encode(np_frame.tobytes(), frame_size)
                
                await sendAudio(conn, opus_data)
                
            if process.returncode is None:
                process.terminate()
            
            conn.audio_template_playing = False
            print(f"[{TAG}] Stream for {conn.device_id} stopped.", flush=True)

        except Exception as e:
            print(f"[{TAG}] Stream error on {conn.device_id}: {e}", flush=True)
            conn.audio_template_playing = False
