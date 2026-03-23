import os
import io
import wave
import uuid
import json
import time
import queue
import asyncio
import traceback
import threading
import opuslib_next
import concurrent.futures
import gc
from abc import ABC, abstractmethod
from config.logger import setup_logging
from typing import Optional, Tuple, List
from core.handle.receiveAudioHandle import startToChat
from core.handle.reportHandle import enqueue_asr_report
from core.utils.util import remove_punctuation_and_length
from core.handle.receiveAudioHandle import handleAudioMessage

TAG = __name__
logger = setup_logging()
import re


class ASRProviderBase(ABC):
    def __init__(self):
        pass

    # Mở kênh audio
    async def open_audio_channels(self, conn):
        conn.asr_priority_thread = threading.Thread(
            target=self.asr_text_priority_thread, args=(conn,), daemon=True
        )
        conn.asr_priority_thread.start()

    # Xử lý audio ASR theo thứ tự
    def asr_text_priority_thread(self, conn):
        while not conn.stop_event.is_set():
            try:
                message = conn.asr_audio_queue.get(timeout=1)
                future = asyncio.run_coroutine_threadsafe(
                    handleAudioMessage(conn, message),
                    conn.loop,
                )
                future.result()
            except queue.Empty:
                continue
            except Exception as e:
                self.logger.bind(tag=TAG).error(
                    f"Xử lý văn bản ASR thất bại: {str(e)}, Loại: {type(e).__name__}, Stack trace: {traceback.format_exc()}"
                )
                continue

    # 接收音频
    async def receive_audio(self, conn, audio, audio_have_voice):
        if conn.client_listen_mode == "auto" or conn.client_listen_mode == "realtime":
            have_voice = audio_have_voice
        else:
            have_voice = conn.client_have_voice
        
        if len(audio) < 5:
            # Filter out keep-alive or empty packets to prevent ASR hallucination
            return

        conn.asr_audio.append(audio)
        if not have_voice and not conn.client_have_voice:
            conn.asr_audio = conn.asr_audio[-10:]
            return

        if conn.client_voice_stop:
            asr_audio_task = conn.asr_audio.copy()
            conn.asr_audio.clear()
            conn.reset_vad_states()

            if len(asr_audio_task) > 15:
                await self.handle_voice_stop(conn, asr_audio_task)

    # 处理语音停止
    async def handle_voice_stop(self, conn, asr_audio_task: List[bytes]):
        """Xử lý song song ASR và nhận diện giọng nói"""


        try:
            total_start_time = time.monotonic()
            
            # 准备音频数据
            if conn.audio_format == "pcm":
                pcm_data = asr_audio_task
            else:
                pcm_data = self.decode_opus(asr_audio_task)
            
            combined_pcm_data = b"".join(pcm_data)
            
            # 预先准备WAV数据
            wav_data = None
            if conn.voiceprint_provider and combined_pcm_data:
                wav_data = self._pcm_to_wav(combined_pcm_data)
            
            # 定义ASR任务
            def run_asr():
                start_time = time.monotonic()
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        result = loop.run_until_complete(
                            self.speech_to_text(asr_audio_task, conn.session_id, conn.audio_format)
                        )
                        end_time = time.monotonic()
                        logger.bind(tag=TAG).debug(f"Thời gian ASR: {end_time - start_time:.3f}s")
                        return result
                    finally:
                        loop.close()
                except Exception as e:
                    end_time = time.monotonic()
                    logger.bind(tag=TAG).error(f"ASR thất bại: {e}")
                    return ("", None)
            
            # 定义声纹识别任务
            def run_voiceprint():
                if not wav_data:
                    return None
                try:
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        # 使用连接的声纹识别提供者
                        result = loop.run_until_complete(
                            conn.voiceprint_provider.identify_speaker(wav_data, conn.session_id)
                        )
                        return result
                    finally:
                        loop.close()
                except Exception as e:
                    logger.bind(tag=TAG).error(f"Nhận diện giọng nói thất bại: {e}")
                    return None
            
            # 使用线程池执行器并行运行
            with concurrent.futures.ThreadPoolExecutor(max_workers=2) as thread_executor:
                asr_future = thread_executor.submit(run_asr)
                
                if conn.voiceprint_provider and wav_data:
                    voiceprint_future = thread_executor.submit(run_voiceprint)
                    
                    # 等待两个线程都完成
                    asr_result = asr_future.result(timeout=15)
                    voiceprint_result = voiceprint_future.result(timeout=15)
                    
                    results = {"asr": asr_result, "voiceprint": voiceprint_result}
                else:
                    asr_result = asr_future.result(timeout=15)
                    results = {"asr": asr_result, "voiceprint": None}
            
            
            # 处理结果
            raw_text, _ = results.get("asr", ("", None))
            speaker_name = results.get("voiceprint", None)
            
            print(f"DEBUG: ASR Result: '{raw_text}'", flush=True)

            # 记录识别结果
            if raw_text:
                if self._is_garbage_text(raw_text):
                    logger.bind(tag=TAG).warning(f"Phát hiện văn bản rác/ảo giác, hủy bỏ: {raw_text}")
                    print(f"DEBUG: Garbage text detected, discarding.", flush=True)
                    raw_text = ""
                else:
                    logger.bind(tag=TAG).info(f"Văn bản nhận dạng: {raw_text}")

            if speaker_name:
                logger.bind(tag=TAG).info(f"Người nói: {speaker_name}")
            
            # Giám sát hiệu năng
            total_time = time.monotonic() - total_start_time
            logger.bind(tag=TAG).debug(f"Tổng thời gian xử lý: {total_time:.3f}s")
            
            # 检查文本长度
            text_len, _ = remove_punctuation_and_length(raw_text)
            self.stop_ws_connection()
            
            if text_len > 0:
                # Check for Wake Word interception (Sophia)
                lower_text = raw_text.lower().strip()
                logger.bind(tag=TAG).info(f"Checking Wake Word in: '{lower_text}'")
                
                # Extended fuzzy match for Sophia variants
                # Only intercept if it looks like a short wake-up call (less than 10 words)
                wake_variants = ["sophia", "so phi a", "xô phi a", "sofia", "xô pha", "xô pia", "phi a", "xiaozhi", "trợ lý"]
                is_wake_word = any(v in lower_text for v in wake_variants)
                
                if is_wake_word and len(lower_text.split()) < 10:
                   logger.bind(tag=TAG).info("Wake word detected - Intercepting with immediate greeting.")
                   greeting_text = "Chào bạn, tôi là trợ lý ảo Xiaozhi. Bạn cần giúp gì không?"
                   conn.tts.tts_audio_queue.put((SentenceType.FIRST, None, greeting_text))
                   return

                # Normal processing
                
                # 构建包含说话人信息的JSON字符串
                enhanced_text = self._build_enhanced_text(raw_text, speaker_name)
                
                # 使用自定义模块进行上报
                print(f"DEBUG: Calling startToChat with text: {enhanced_text}", flush=True)
                await startToChat(conn, enhanced_text)
                enqueue_asr_report(conn, enhanced_text, asr_audio_task)
            else:
                print(f"DEBUG: Text length is 0, skipping startToChat", flush=True)
                
        except Exception as e:
            logger.bind(tag=TAG).error(f"Xử lý dừng giọng nói thất bại: {e}")
            import traceback
            logger.bind(tag=TAG).debug(f"Chi tiết lỗi: {traceback.format_exc()}")

    def _build_enhanced_text(self, text: str, speaker_name: Optional[str]) -> str:
        """构建包含说话人信息的文本"""
        if speaker_name and speaker_name.strip():
            return json.dumps({
                "speaker": speaker_name,
                "content": text
            }, ensure_ascii=False)
        else:
            return text

    def _is_garbage_text(self, text: str) -> bool:
        """Check if text contains significant non-Vietnamese characters (Chinese, Korean, Japanese)"""
        if not text:
            return False
            
        # Common CJK ranges
        # CJK Unified Ideographs: 4E00-9FFF
        # Hangul Syllables: AC00-D7AF
        # Hiragana: 3040-309F
        # Katakana: 30A0-30FF
        garbage_pattern = re.compile(r'[\u4e00-\u9fff\uac00-\ud7af\u3040-\u309f\u30a0-\u30ff]')
        
        # If any CJK character is found, consider it garbage/hallucination for a Vietnamese model
        if garbage_pattern.search(text):
            return True
            
        # Also check for very short nonsense english like "incorporate" appearing alone if needed, 
        # but the main issue reported is "Language confused to Korean/Chinese"
        return False

    def _pcm_to_wav(self, pcm_data: bytes) -> bytes:
        """Chuyển đổi dữ liệu PCM sang định dạng WAV"""
        if len(pcm_data) == 0:
            logger.bind(tag=TAG).warning("Dữ liệu PCM trống, không thể chuyển đổi WAV")
            return b""
        
        # 确保数据长度是偶数（16位音频）
        if len(pcm_data) % 2 != 0:
            pcm_data = pcm_data[:-1]
        
        # 创建WAV文件头
        wav_buffer = io.BytesIO()
        try:
            with wave.open(wav_buffer, 'wb') as wav_file:
                wav_file.setnchannels(1)      # 单声道
                wav_file.setsampwidth(2)      # 16位
                wav_file.setframerate(16000)  # 16kHz采样率
                wav_file.writeframes(pcm_data)
            
            wav_buffer.seek(0)
            wav_data = wav_buffer.read()
            
            return wav_data
        except Exception as e:
            logger.bind(tag=TAG).error(f"WAV转换失败: {e}")
            return b""

    def stop_ws_connection(self):
        pass

    def save_audio_to_file(self, pcm_data: List[bytes], session_id: str) -> str:
        """PCM数据保存为WAV文件"""
        module_name = __name__.split(".")[-1]
        file_name = f"asr_{module_name}_{session_id}_{uuid.uuid4()}.wav"
        file_path = os.path.join(self.output_dir, file_name)

        with wave.open(file_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 2 bytes = 16-bit
            wf.setframerate(16000)
            wf.writeframes(b"".join(pcm_data))

        return file_path

    @abstractmethod
    async def speech_to_text(
        self, opus_data: List[bytes], session_id: str, audio_format="opus"
    ) -> Tuple[Optional[str], Optional[str]]:
        """将语音数据转换为文本"""
        pass

    @staticmethod
    def decode_opus(opus_data: List[bytes]) -> List[bytes]:
        """将Opus音频数据解码为PCM数据"""
        decoder = None
        try:
            decoder = opuslib_next.Decoder(16000, 1)
            pcm_data = []
            buffer_size = 960  # 每次处理960个采样点 (60ms at 16kHz)
            
            for i, opus_packet in enumerate(opus_data):
                try:
                    if not opus_packet or len(opus_packet) == 0:
                        continue
                    
                    pcm_frame = decoder.decode(opus_packet, buffer_size)
                    if pcm_frame and len(pcm_frame) > 0:
                        pcm_data.append(pcm_frame)
                        
                except opuslib_next.OpusError as e:
                    logger.bind(tag=TAG).warning(f"Lỗi giải mã Opus, bỏ qua gói {i}: {e}")
                except Exception as e:
                    logger.bind(tag=TAG).error(f"Lỗi xử lý âm thanh, gói {i}: {e}")
            
            return pcm_data
            
        except Exception as e:
            logger.bind(tag=TAG).error(f"Lỗi trong quá trình giải mã âm thanh: {e}")
            return []
        finally:
            if decoder is not None:
                try:
                    del decoder
                except Exception as e:
                    logger.bind(tag=TAG).debug(f"释放decoder资源时出错: {e}")
