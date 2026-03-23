import time
import json
import asyncio
from core.utils.util import audio_to_data
from core.handle.abortHandle import handleAbortMessage
from core.handle.intentHandler import handle_user_intent
from core.utils.output_counter import check_device_output_limit
from core.handle.sendAudioHandle import send_stt_message, SentenceType

TAG = __name__


async def handleAudioMessage(conn, audio):
    # Đoạn hiện tại có tiếng người không
    have_voice = conn.vad.is_vad(conn, audio)
    # Nếu thiết bị vừa được đánh thức, bỏ qua VAD tạm thời
    if hasattr(conn, "just_woken_up") and conn.just_woken_up:
        have_voice = False
        # 设置一个短暂延迟后恢复VAD检测
        conn.asr_audio.clear()
        if not hasattr(conn, "vad_resume_task") or conn.vad_resume_task.done():
            conn.vad_resume_task = asyncio.create_task(resume_vad_detection(conn))
        return
    # manual 模式下不打断正在播放的内容
    if have_voice:
        if not conn.client_abort and conn.client_listen_mode != "manual":
            await handleAbortMessage(conn)
    # 设备长时间空闲检测，用于say goodbye
    await no_voice_close_connect(conn, have_voice)
    # 接收音频
    await conn.asr.receive_audio(conn, audio, have_voice)


async def resume_vad_detection(conn):
    # 等待2秒后恢复VAD检测
    await asyncio.sleep(2)
    conn.just_woken_up = False


async def startToChat(conn, text):
    # 检查输入是否是JSON格式（包含说话人信息）
    speaker_name = None
    actual_text = text

    try:
        # 尝试解析JSON格式的输入
        if text.strip().startswith("{") and text.strip().endswith("}"):
            data = json.loads(text)
            if "speaker" in data and "content" in data:
                speaker_name = data["speaker"]
                actual_text = data["content"]
                conn.logger.bind(tag=TAG).info(f"Phân tích thông tin người nói: {speaker_name}")

                # 直接使用JSON格式的文本，不解析
                actual_text = text
    except (json.JSONDecodeError, KeyError):
        # 如果解析失败，继续使用原始文本
        pass

    # 保存说话人信息到连接对象
    if speaker_name:
        conn.current_speaker = speaker_name
    else:
        conn.current_speaker = None
    
    # --- Noise Filtering Logic (After Wake Word) ---
    # Note: Wake word detection is handled by listenMessageHandler.py
    # This only filters noise that may occur after wake word detection
    
    lower_text = actual_text.lower().strip()
    
    # Filter Noise after Wakeup (e.g. "SU A" right after "Sophia")
    # Also strip common noise prefixes from the actual text if it's a valid query
    noise_prefixes = ["su a", "sua", "so a", "xô pha", "xu pha", "xô", "su", "sô", "alo", "trợ lý", "xiaozhi"]
    lower_text_clean = lower_text
    
    # Sort by length descending to match longest prefixes first
    noise_prefixes.sort(key=len, reverse=True)
    
    for prefix in noise_prefixes:
        if lower_text_clean.startswith(prefix + " "): # Match prefix with space
            lower_text_clean = lower_text_clean[len(prefix):].strip()
            actual_text = actual_text[len(prefix):].strip() # Update actual_text too (approximate slicing, usually fine for spaces)
            break
        elif lower_text_clean == prefix: # Exact match
             lower_text_clean = "" 
             # Let the next block handle empty/short text
             break

    if hasattr(conn, "just_woken_up_timestamp"):
        if time.time() - conn.just_woken_up_timestamp < 5.0: # Increased window to 5s
             # If text is very short/garbage, ignore it
             if len(lower_text_clean) < 2: # Ignore 1 char garbage
                 conn.logger.bind(tag=TAG).warning(f"Ignoring noise after wakeup: {actual_text}")
                 return

    # Update actual_text with stripped version if needed (re-assigning just in case slicing was off)
    # Ideally we use the cleaned text for intent/LLM
    # But let's keep actual_text closer to original casing if possible, although prefix stripping above was simple slicing.
    # If the cleaning happened, let's just use the cleaned version for robustness.
    if len(lower_text_clean) > 0 and len(lower_text_clean) != len(lower_text):
         # If we stripped something, updated actual_text
         # Note: Simple slicing `actual_text[len(prefix):]` works if case matches length. 
         # Since we matched lowercase prefix, we should be careful. 
         # Let's just use the remaining text from the original string if possible, or just the cleaned string if it's easier.
         # For Vietnamse/English, ASR probably output spaces.
         pass
         
    # Re-evaluate actual_text based on cleaning
    if len(actual_text) < 2:  # Check if we stripped everything
         conn.logger.bind(tag=TAG).warning(f"Ignoring empty/short text after stripping: {text}")
         return

    if conn.need_bind:
        await check_bind_device(conn)
        return

    # 如果当日的输出字数大于限定的字数
    if conn.max_output_size > 0:
        if check_device_output_limit(
            conn.headers.get("device-id"), conn.max_output_size
        ):
            await max_out_size(conn)
            return
    # manual 模式下不打断正在播放的内容
    if conn.client_is_speaking and conn.client_listen_mode != "manual":
        await handleAbortMessage(conn)

    # Đầu tiên phân tích ý định, sử dụng nội dung văn bản thực tế
    intent_handled = await handle_user_intent(conn, actual_text)

    if intent_handled:
        # Nếu ý định đã được xử lý, không chat nữa
        return

    # 意图未被处理，继续常规聊天流程，使用实际文本内容
    await send_stt_message(conn, actual_text)
    conn.executor.submit(conn.chat, actual_text)


async def no_voice_close_connect(conn, have_voice):
    if have_voice:
        conn.last_activity_time = time.time() * 1000
        return
    # 只有在已经初始化过时间戳的情况下才进行超时检查
    if conn.last_activity_time > 0.0:
        no_voice_time = time.time() * 1000 - conn.last_activity_time
        close_connection_no_voice_time = int(
            conn.config.get("close_connection_no_voice_time", 120)
        )
        if (
            not conn.close_after_chat
            and no_voice_time > 1000 * close_connection_no_voice_time
        ):
            conn.close_after_chat = True
            conn.client_abort = False
            end_prompt = conn.config.get("end_prompt", {})
            if end_prompt and end_prompt.get("enable", True) is False:
                conn.logger.bind(tag=TAG).info("Kết thúc hội thoại, không cần lời chào tạm biệt")
                await conn.close()
                return
            prompt = end_prompt.get("prompt")
            if not prompt:
                prompt = "请你以```时间过得真快```未来头，用富有感情、依依不舍的话来结束这场对话吧。！"
            await startToChat(conn, prompt)


async def max_out_size(conn):
    # 播放超出最大输出字数的提示
    conn.client_abort = False
    text = "不好意思，我现在有点事情要忙，明天这个时候我们再聊，约好了哦！明天不见不散，拜拜！"
    await send_stt_message(conn, text)
    file_path = "config/assets/max_output_size.wav"
    opus_packets = audio_to_data(file_path)
    conn.tts.tts_audio_queue.put((SentenceType.LAST, opus_packets, text))
    conn.close_after_chat = True


async def check_bind_device(conn):
    if conn.bind_code:
        # 确保bind_code是6位数字
        if len(conn.bind_code) != 6:
            conn.logger.bind(tag=TAG).error(f"Định dạng mã liên kết không hợp lệ: {conn.bind_code}")
            text = "Lỗi định dạng mã liên kết, vui lòng kiểm tra cấu hình."
            await send_stt_message(conn, text)
            return

        text = f"Vui lòng đăng nhập bảng điều khiển, nhập {conn.bind_code} để liên kết thiết bị."
        await send_stt_message(conn, text)

        # 播放提示音
        music_path = "config/assets/bind_code.wav"
        opus_packets = audio_to_data(music_path)
        conn.tts.tts_audio_queue.put((SentenceType.FIRST, opus_packets, text))

        # 逐个播放数字
        for i in range(6):  # 确保只播放6位数字
            try:
                digit = conn.bind_code[i]
                num_path = f"config/assets/bind_code/{digit}.wav"
                num_packets = audio_to_data(num_path)
                conn.tts.tts_audio_queue.put((SentenceType.MIDDLE, num_packets, None))
            except Exception as e:
                conn.logger.bind(tag=TAG).error(f"Phát âm thanh số thất bại: {e}")
                continue
        conn.tts.tts_audio_queue.put((SentenceType.LAST, [], None))
    else:
        # 播放未绑定提示
        conn.client_abort = False
        text = f"Không tìm thấy thông tin phiên bản thiết bị, vui lòng cấu hình đúng địa chỉ OTA và biên dịch lại firmware."
        await send_stt_message(conn, text)
        music_path = "config/assets/bind_not_found.wav"
        opus_packets = audio_to_data(music_path)
        conn.tts.tts_audio_queue.put((SentenceType.LAST, opus_packets, text))
