import json
import uuid
import asyncio
from core.utils.dialogue import Message
from core.providers.tts.dto.dto import ContentType
from core.handle.helloHandle import checkWakeupWords
from plugins_func.register import Action, ActionResponse
from core.handle.sendAudioHandle import send_stt_message
from core.utils.util import remove_punctuation_and_length
from core.providers.tts.dto.dto import TTSMessageDTO, SentenceType

TAG = __name__


async def handle_user_intent(conn, text):
    # 预处理输入文本，处理可能的JSON格式
    try:
        if text.strip().startswith('{') and text.strip().endswith('}'):
            parsed_data = json.loads(text)
            if isinstance(parsed_data, dict) and "content" in parsed_data:
                text = parsed_data["content"]  # 提取content用于意图分析
                conn.current_speaker = parsed_data.get("speaker")  # 保留说话人信息
    except (json.JSONDecodeError, TypeError):
        pass

    # 检查是否有明确的退出命令
    _, filtered_text = remove_punctuation_and_length(text)
    if await check_direct_exit(conn, filtered_text):
        return True

    # 检查是否是唤醒词
    if await checkWakeupWords(conn, filtered_text):
        return True

    if conn.intent_type == "function_call":
        # 使用支持function calling的聊天方法,不再进行意图分析
        return False

    # === STATIC AUDIO CHECK ===
    try:
        from core.providers.llm.rag.list_detector import is_list_query
        list_name = is_list_query(text)
        if list_name in ['23_dau_cong_viec', '9_dau_cong_viec', '4_doi_tuong_tac_chien', '11_che_do_trong_ngay', 'moc_son_lich_su', '9_truyen_thong', 'lich_su_quan_khu_3', 'lich_su_su_doan_395', 'lich_su_trung_doan_8', 'chu_de_dai_hoi_14', 'chi_huy_quan_khu', 'chi_huy_su_doan', '2_kien_dinh_2_day_manh_2_ngan_ngua', '5_vung']:
            import os
            # Use absolute path relative to server root
            static_file = os.path.abspath(os.path.join("data", "audio_static", f"{list_name}.wav"))
            
            if os.path.exists(static_file):
                conn.logger.bind(tag=TAG).info(f"🔊 Using static audio for list: {list_name}")
                
                # Generate sentence_id
                conn.sentence_id = str(uuid.uuid4().hex)
                
                # FIRST
                conn.tts.tts_text_queue.put(
                    TTSMessageDTO(
                        sentence_id=conn.sentence_id,
                        sentence_type=SentenceType.FIRST,
                        content_type=ContentType.ACTION,
                    )
                )
                # FILE CONTENT
                conn.tts.tts_text_queue.put(
                    TTSMessageDTO(
                        sentence_id=conn.sentence_id,
                        sentence_type=SentenceType.MIDDLE,
                        content_type=ContentType.FILE,
                        content_file=static_file,
                        content_detail=f"Playing static: {list_name}"
                    )
                )
                # LAST
                conn.tts.tts_text_queue.put(
                    TTSMessageDTO(
                        sentence_id=conn.sentence_id,
                        sentence_type=SentenceType.LAST,
                        content_type=ContentType.ACTION,
                    )
                )
                
                conn.dialogue.put(Message(role="assistant", content=f"[Phát âm thanh mẫu: {list_name}]"))
                return True
            else:
                conn.logger.bind(tag=TAG).warning(f"Static audio file not found: {static_file}")
    except Exception as e:
        conn.logger.bind(tag=TAG).error(f"Static audio check failed: {e}")

    # === SONG PLAYBACK CHECK (New Feature) ===
    # Check if user wants to play a song (simple keyword check + fuzzy match)
    # Keywords: "bật bài", "mở bài", "nghe bài", "hát bài"
    lower_text = text.lower()
    song_keywords = ["bật bài", "mở bài", "nghe bài", "hát bài", "phát bài", "phát nhạc", "bài hát", "phát đài"]  # 'đài' = ASR error of 'bài'
    is_song_request = any(k in lower_text for k in song_keywords)
    
    if is_song_request:
        try:
            import os
            import difflib
            
            # Directory containing songs
            audio_templates_dir = os.path.abspath(os.path.join("data", "audio_templates"))
            
            if os.path.exists(audio_templates_dir):
                # Get all wav files
                song_files = [f for f in os.listdir(audio_templates_dir) if f.lower().endswith('.wav')]
                
                # Normalize filenames for matching (remove extension, replace - with space)
                song_names_map = {f.replace('-', ' ').replace('_', ' ').replace('.wav', '').lower(): f for f in song_files}
                song_names = list(song_names_map.keys())
                
                # --- ALIAS MAPPING (Manual Fixes) ---
                song_aliases = {
                    "truyền thống trung đoàn 8": "HÀNH KHÚC TRUNG ĐOÀN 8.wav",
                    "truyền thống sư đoàn 395": "HÀNH KHÚC SƯ ĐOÀN 395 .wav",
                    "bài ca trung đoàn 8": "HÀNH KHÚC TRUNG ĐOÀN 8.wav",
                    "bài ca sư đoàn 395": "HÀNH KHÚC SƯ ĐOÀN 395 .wav",
                    "bác đang cùng chúng cháu": "Bác-Đang-Cùng-Chúng-Cháu-Hành-Quân.wav",
                    "bác đang cùng chúng cháu hành quân": "Bác-Đang-Cùng-Chúng-Cháu-Hành-Quân.wav",
                    "quốc tế ca": "QUỐC-TẾ-CA.wav",
                    "tiến quân ca": "Tiến quân ca.wav",
                    "quốc ca": "Tiến quân ca.wav",
                    "vì nhân dân": "VÌ NHÂN DÂN QUÊN MÌNH.wav",
                    "vì nhân dân quên mình": "VÌ NHÂN DÂN QUÊN MÌNH.wav",
                    "ca ngợi hồ chủ tịch": "CA-NGỢI-HỒ-CHỦ-TỊCH.wav",
                    "chào mừng đảng": "CHÀO-MỪNG-ĐẢNG-CỘNG-SẢN-VIỆT-NAM.wav",
                    "chào mừng đảng cộng sản việt nam": "CHÀO-MỪNG-ĐẢNG-CỘNG-SẢN-VIỆT-NAM.wav",
                    "cuộc đời vẫn đẹp sao": "Cuộc đời vẫn đẹp sao.wav",
                    "giải phóng điện biên": "Giải-phóng-Điện-Biên-Bản-chuẩn-Có-lời.wav",
                    "hát mãi khúc quân hành": "Hát-mãi-khúc-quân-hành.wav",
                    "như có bác hồ": "Như Có Bác Trong Ngày Vui Đại Thắng.wav",
                    "như có bác trong ngày vui đại thắng": "Như Có Bác Trong Ngày Vui Đại Thắng.wav",
                    "tiến bước dưới quân kỳ": "TIẾN-BƯỚC-DƯỚI-QUÂN-KỲ.wav",
                    "thanh niên làm theo lời bác": "Thanh-Niên-Làm-Theo-Lời-Bác.wav",
                    "trái tim chiến sĩ": "Trái tim chiến sĩ .wav",
                    "tổ quốc trong tim": "Tổ quốc trong tim .wav",
                    "ước mơ chiến dĩ": "Ước mơ chiến sỹ.wav",
                    "ước mơ chiến sĩ": "Ước mơ chiến sỹ.wav",
                    # Bài truyền thống quân khu 3
                    "truyền thống quân khu 3": "Bài truyền thống quân khu 3.wav",
                    "truyền thống quân khu": "Bài truyền thống quân khu 3.wav",
                    "bài ca quân khu 3": "Bài truyền thống quân khu 3.wav",
                }
                # Add aliases to song_names_map
                for alias, filename in song_aliases.items():
                    song_names_map[alias.lower()] = filename
                    if alias.lower() not in song_names:
                        song_names.append(alias.lower())
                
                # Extract query part (remove keyword)
                query_song = lower_text
                # Sort keywords by length descending to remove longest match first (e.g. "phát bài hát" before "hát")
                song_keywords.sort(key=len, reverse=True)
                
                for k in song_keywords:
                    if k in query_song:
                        query_song = query_song.replace(k, "").strip()
                
                # Remove common filler words
                for filler in ["của", "về", "nhé", "đi", "cho tôi"]:
                    query_song = query_song.replace(filler, "").strip()

                if query_song:
                    conn.logger.bind(tag=TAG).info(f"🔎 Song query: '{query_song}'")
                    
                    # Find closest match
                    # Increased cutoff slightly to avoid very bad matches, but 0.4 is generally okay for short queries
                    matches = difflib.get_close_matches(query_song, song_names, n=1, cutoff=0.3)
                    
                    if matches:
                        best_match_name = matches[0]
                        best_match_file = song_names_map[best_match_name]
                        full_path = os.path.join(audio_templates_dir, best_match_file)
                        
                        conn.logger.bind(tag=TAG).info(f"🎶 Playing song: {best_match_name} ({best_match_file})")
                        
                        # Generate sentence_id if needed
                        if not hasattr(conn, "sentence_id") or not conn.sentence_id:
                            conn.sentence_id = str(uuid.uuid4().hex)
                        
                        # FIRST
                        conn.tts.tts_text_queue.put(
                            TTSMessageDTO(
                                sentence_id=conn.sentence_id,
                                sentence_type=SentenceType.FIRST,
                                content_type=ContentType.ACTION,
                            )
                        )
                        # PLAY FILE
                        conn.tts.tts_text_queue.put(
                            TTSMessageDTO(
                                sentence_id=conn.sentence_id,
                                sentence_type=SentenceType.MIDDLE,
                                content_type=ContentType.FILE,
                                content_file=full_path,
                                content_detail=f"Playing song: {best_match_file}"
                            )
                        )
                        # LAST
                        conn.tts.tts_text_queue.put(
                            TTSMessageDTO(
                                sentence_id=conn.sentence_id,
                                sentence_type=SentenceType.LAST,
                                content_type=ContentType.ACTION,
                            )
                        )
                        
                        conn.dialogue.put(Message(role="assistant", content=f"[Đang phát: {best_match_name}]"))
                        return True
                    else:
                        conn.logger.bind(tag=TAG).warning(f"❌ Song not found for query: '{query_song}'")
        except Exception as e:
            conn.logger.bind(tag=TAG).error(f"Song playback failed: {e}")
    # ==========================================

    # 使用LLM进行意图分析
    intent_result = await analyze_intent_with_llm(conn, text)
    if not intent_result:
        return False
    # 会话开始时生成sentence_id
    conn.sentence_id = str(uuid.uuid4().hex)
    # 处理各种意图
    return await process_intent_result(conn, intent_result, text)


async def check_direct_exit(conn, text):
    """检查是否有明确的退出命令"""
    _, text = remove_punctuation_and_length(text)
    cmd_exit = conn.cmd_exit
    for cmd in cmd_exit:
        if text == cmd:
            conn.logger.bind(tag=TAG).info(f"识别到明确的退出命令: {text}")
            await send_stt_message(conn, text)
            await conn.close()
            return True
    return False


async def analyze_intent_with_llm(conn, text):
    """使用LLM分析用户意图"""
    if not hasattr(conn, "intent") or not conn.intent:
        conn.logger.bind(tag=TAG).warning("意图识别服务未初始化")
        return None

    # 对话历史记录
    dialogue = conn.dialogue
    try:
        intent_result = await conn.intent.detect_intent(conn, dialogue.dialogue, text)
        return intent_result
    except Exception as e:
        conn.logger.bind(tag=TAG).error(f"意图识别失败: {str(e)}")

    return None


async def process_intent_result(conn, intent_result, original_text):
    """处理意图识别结果"""
    try:
        # 尝试将结果解析为JSON
        intent_data = json.loads(intent_result)

        # 检查是否有function_call
        if "function_call" in intent_data:
            # 直接从意图识别获取了function_call
            conn.logger.bind(tag=TAG).debug(
                f"检测到function_call格式的意图结果: {intent_data['function_call']['name']}"
            )
            function_name = intent_data["function_call"]["name"]
            if function_name == "continue_chat":
                return False

            if function_name == "result_for_context":
                await send_stt_message(conn, original_text)
                conn.client_abort = False
                
                def process_context_result():
                    conn.dialogue.put(Message(role="user", content=original_text))
                    
                    from core.utils.current_time import get_current_time_info

                    current_time, today_date, today_weekday, lunar_date = get_current_time_info()
                    
                    # 构建带上下文的基础提示
                    context_prompt = f"""当前时间：{current_time}
                                        今天日期：{today_date} ({today_weekday})
                                        今天农历：{lunar_date}

                                        请根据以上信息回答用户的问题：{original_text}"""
                    
                    response = conn.intent.replyResult(context_prompt, original_text)
                    speak_txt(conn, response)
                
                conn.executor.submit(process_context_result)
                return True

            function_args = {}
            if "arguments" in intent_data["function_call"]:
                function_args = intent_data["function_call"]["arguments"]
                if function_args is None:
                    function_args = {}
            # 确保参数是字符串格式的JSON
            if isinstance(function_args, dict):
                function_args = json.dumps(function_args)

            function_call_data = {
                "name": function_name,
                "id": str(uuid.uuid4().hex),
                "arguments": function_args,
            }

            await send_stt_message(conn, original_text)
            conn.client_abort = False

            # 使用executor执行函数调用和结果处理
            def process_function_call():
                conn.dialogue.put(Message(role="user", content=original_text))

                # 使用统一工具处理器处理所有工具调用
                try:
                    result = asyncio.run_coroutine_threadsafe(
                        conn.func_handler.handle_llm_function_call(
                            conn, function_call_data
                        ),
                        conn.loop,
                    ).result()
                except Exception as e:
                    conn.logger.bind(tag=TAG).error(f"工具调用失败: {e}")
                    result = ActionResponse(
                        action=Action.ERROR, result=str(e), response=str(e)
                    )

                if result:
                    if result.action == Action.RESPONSE:  # 直接回复前端
                        text = result.response
                        if text is not None:
                            speak_txt(conn, text)
                    elif result.action == Action.REQLLM:  # 调用函数后再请求llm生成回复
                        text = result.result
                        conn.dialogue.put(Message(role="tool", content=text))
                        llm_result = conn.intent.replyResult(text, original_text)
                        if llm_result is None:
                            llm_result = text
                        speak_txt(conn, llm_result)
                    elif (
                        result.action == Action.NOTFOUND
                        or result.action == Action.ERROR
                    ):
                        text = result.result
                        if text is not None:
                            speak_txt(conn, text)
                    elif function_name != "play_music":
                        # For backward compatibility with original code
                        # 获取当前最新的文本索引
                        text = result.response
                        if text is None:
                            text = result.result
                        if text is not None:
                            speak_txt(conn, text)

            # 将函数执行放在线程池中
            conn.executor.submit(process_function_call)
            return True
        return False
    except json.JSONDecodeError as e:
        conn.logger.bind(tag=TAG).error(f"处理意图结果时出错: {e}")
        return False


def speak_txt(conn, text):
    conn.tts.tts_text_queue.put(
        TTSMessageDTO(
            sentence_id=conn.sentence_id,
            sentence_type=SentenceType.FIRST,
            content_type=ContentType.ACTION,
        )
    )
    conn.tts.tts_one_sentence(conn, ContentType.TEXT, content_detail=text)
    conn.tts.tts_text_queue.put(
        TTSMessageDTO(
            sentence_id=conn.sentence_id,
            sentence_type=SentenceType.LAST,
            content_type=ContentType.ACTION,
        )
    )
    conn.dialogue.put(Message(role="assistant", content=text))
