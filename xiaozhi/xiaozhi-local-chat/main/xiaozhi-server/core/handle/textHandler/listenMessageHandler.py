import time
from typing import Dict, Any

from core.handle.receiveAudioHandle import handleAudioMessage, startToChat
from core.handle.reportHandle import enqueue_asr_report
from core.handle.sendAudioHandle import send_stt_message, send_tts_message
from core.handle.textMessageHandler import TextMessageHandler
from core.handle.textMessageType import TextMessageType
from core.utils.util import remove_punctuation_and_length

TAG = __name__

class ListenTextMessageHandler(TextMessageHandler):
    """Listen消息处理器"""

    @property
    def message_type(self) -> TextMessageType:
        return TextMessageType.LISTEN

    async def handle(self, conn, msg_json: Dict[str, Any]) -> None:
        if "mode" in msg_json:
            conn.client_listen_mode = msg_json["mode"]
            conn.logger.bind(tag=TAG).debug(
                f"客户端拾音模式：{conn.client_listen_mode}"
            )
        if msg_json["state"] == "start":
            print(f"DEBUG: listenMessageHandler start", flush=True)
            conn.client_have_voice = True
            conn.client_voice_stop = False
        elif msg_json["state"] == "stop":
            conn.client_have_voice = True
            conn.client_voice_stop = True
            if len(conn.asr_audio) > 0:
                await handleAudioMessage(conn, b"")
        elif msg_json["state"] == "detect":
            print(f"DEBUG: listenMessageHandler detect: {msg_json}", flush=True)
            conn.client_have_voice = False
            conn.asr_audio.clear()
            if "text" in msg_json:
                conn.last_activity_time = time.time() * 1000
                original_text = msg_json["text"]  # 保留原始文本
                filtered_len, filtered_text = remove_punctuation_and_length(
                    original_text
                )

                # 识别是否是唤醒词 (Case-insensitive check)
                wakeup_words_lower = [w.lower() for w in conn.config.get("wakeup_words", [])]
                
                # Hardcode fallback wake words to ensure they work even if config is missing them
                fallback_wake_words = ["sophia", "alexa", "xô", "xo"]
                for w in fallback_wake_words:
                    if w not in wakeup_words_lower:
                        wakeup_words_lower.append(w)

                is_wakeup_words = filtered_text.lower() in wakeup_words_lower
                
                # print(f"DEBUG: Wake Word Check: '{filtered_text}' in {wakeup_words_lower} -> {is_wakeup_words}", flush=True)

                # 是否开启唤醒词回复
                enable_greeting = conn.config.get("enable_greeting", True)

                if is_wakeup_words and not enable_greeting:
                    # 如果是唤醒词，且关闭了唤醒词回复，就不用回答
                    await send_stt_message(conn, original_text)
                    await send_tts_message(conn, "stop", None)
                    conn.client_is_speaking = False
                elif is_wakeup_words:
                    conn.just_woken_up = True
                    # Play greeting audio directly via TTS, don't send to LLM
                    greeting_text = conn.config.get("greeting_text", "Dạ, em nghe ạ!") # Vietnamese greeting
                    enqueue_asr_report(conn, greeting_text, [])
                    
                    # Send STT message to display wake word
                    await send_stt_message(conn, original_text)
                    
                    # Play pre-recorded greeting audio (instant response, no TTS wait)
                    import os
                    import asyncio
                    from core.utils.util import audio_to_data
                    from core.handle.sendAudioHandle import sendAudio
                    
                    # Path to pre-recorded greeting
                    greeting_audio_path = "data/audio_templates/wake_greeting.wav"
                    
                    if os.path.exists(greeting_audio_path):
                        try:
                            conn.logger.bind(tag=TAG).info(f"🎵 Playing pre-recorded wake greeting")
                            
                            # Send TTS start message
                            await send_tts_message(conn, "start", None)
                            
                            # Convert WAV to Opus and stream
                            audio_data = audio_to_data(greeting_audio_path, is_opus=True)
                            await sendAudio(conn, audio_data, frame_duration=60)
                            
                            # Send TTS stop message
                            await send_tts_message(conn, "stop", None)
                            
                            # CRITICAL: Wait for ASR/TTS to be ready before finishing greeting
                            # This ensures modules are initialized when user speaks
                            conn.logger.bind(tag=TAG).info("Waiting for ASR/TTS to be ready...")
                            
                            # Trigger init by accessing properties
                            _ = conn.asr
                            _ = conn.tts
                            
                            # Wait for actual initialization (max 5 seconds)
                            start_wait = time.time()
                            while (conn.asr is None or conn.tts is None) and (time.time() - start_wait < 5):
                                await asyncio.sleep(0.1)
                            
                            if conn.asr and conn.tts:
                                wait_time = time.time() - start_wait
                                conn.logger.bind(tag=TAG).info(f"✅ ASR/TTS ready after {wait_time:.1f}s")
                                
                                # CRITICAL: Wait for queued packets to be processed
                                # Audio queued during init needs time to clear out
                                # Give it 2.5s to process the backlog before user speaks fresh audio
                                conn.logger.bind(tag=TAG).info("⏳ Waiting for queued audio to clear...")
                                await asyncio.sleep(2.5)  # Increased from 1.5s to 2.5s
                                
                                # CRITICAL: Clear audio buffer to prevent processing queued audio
                                # Audio packets received during greeting should be discarded
                                if hasattr(conn, 'asr_audio'):
                                    old_len = len(conn.asr_audio)
                                    conn.asr_audio.clear()
                                    if old_len > 0:
                                        conn.logger.bind(tag=TAG).info(f"🗑️  Cleared {old_len} queued audio packets from greeting period")
                                
                                conn.logger.bind(tag=TAG).info("✅ Ready for fresh input")
                            else:
                                conn.logger.bind(tag=TAG).warning("ASR/TTS not ready after timeout")
                            
                            conn.logger.bind(tag=TAG).info("✅ Wake greeting sent successfully")
                            
                        except Exception as e:
                            conn.logger.bind(tag=TAG).error(f"Failed to play wake greeting: {e}")
                            # Fallback: just send STT message
                            await send_stt_message(conn, original_text)
                    else:
                        # File not found, fallback to text only
                        conn.logger.bind(tag=TAG).warning(f"Wake greeting file not found: {greeting_audio_path}")
                        await send_stt_message(conn, original_text)
                else:
                    # 上报纯文字数据（复用ASR上报功能，但不提供音频数据）
                    enqueue_asr_report(conn, original_text, [])
                    # 否则需要LLM对文字内容进行答复
                    await startToChat(conn, original_text)