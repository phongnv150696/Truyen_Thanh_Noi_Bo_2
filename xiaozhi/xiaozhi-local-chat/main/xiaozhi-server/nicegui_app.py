"""
Xiaozhi RAG Chat Interface - NiceGUI + FastAPI Web UI
Facebook Blue Theme - Dark/Light Mode Toggle
100% Offline - Responsive Design
"""

import os
import sys
import asyncio
import tempfile
from pathlib import Path
from typing import Optional, Dict, List, Any

current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))
os.chdir(current_dir)

from nicegui import ui, app
from config.settings import load_config
from config.logger import setup_logging

logger = setup_logging()

# ============================================================================
# GLOBAL STATE
# ============================================================================
state: Dict[str, Any] = {
    "messages": [],
    "llm_provider": None,
    "tts_provider": None,
    "rag_config": {},
    "rag_initialized": False,
    "system_prompt": "",
}

# ============================================================================
# INITIALIZATION
# ============================================================================
async def initialize_rag_system():
    if state["rag_initialized"]:
        return state["llm_provider"], state["rag_config"]
    try:
        from core.providers.llm.rag.rag_ollama import LLMProvider
        config = load_config()
        rag_config = config.get("LLM", {}).get("RAG_OllamaLLM", {})
        llm_provider = LLMProvider(rag_config)
        await llm_provider.initialize()
        state["llm_provider"] = llm_provider
        state["rag_config"] = rag_config
        state["rag_initialized"] = True
        state["system_prompt"] = config.get("prompt", "")
        logger.info("✅ RAG system initialized")
        return llm_provider, rag_config
    except Exception as e:
        logger.error(f"❌ RAG init error: {e}")
        return None, None

async def initialize_tts():
    if state["tts_provider"]:
        return state["tts_provider"]
    try:
        from core.providers.tts.pyttsx3_provider import TTSProvider
        config = load_config()
        tts_config = config.get("TTS", {}).get("pyttsx3_provider", {})
        tts_provider = TTSProvider(tts_config, delete_audio_file=False)
        state["tts_provider"] = tts_provider
        return tts_provider
    except Exception as e:
        logger.error(f"❌ TTS init error: {e}")
        return None

# ============================================================================
# AUDIO TEMPLATES
# ============================================================================
def detect_audio_template_query(query: str) -> Optional[str]:
    import re
    query_lower = query.lower().strip()
    
    # 1. Oath & Discipline (Existing + Enhanced)
    patterns = {
        r'(?:10|mười)\s*lời\s*thề': 'loi_the_all',
        r'lời\s*thề\s*(?:số|thứ)?\s*0*(\d+)': 'loi_the_{num}',
        r'(?:12|mười\s*hai)\s*điều\s*(?:cấm|kỷ\s*luật)': 'dieu_all',
        r'điều\s*(?:cấm|kỷ\s*luật\s*)?(?:số|thứ)?\s*0*(\d+)': 'dieu_{num}',
        r'chỉ\s*thị\s*33': 'chi_thi_33',
        r'chức\s*trách\s*(?:số|thứ)?\s*0*(\d+)': 'chuc_trach_{num}',
        r'chức\s*trách\s*người\s*gác': 'chuc_trach_nguoi_gac',
    }
    
    for pattern, template in patterns.items():
        match = re.search(pattern, query_lower)
        if match:
            if '{num}' in template:
                num = match.group(1).lstrip('0') or '0'
                return template.replace('{num}', num)
            return template
            
    # 2. Song Detection (New)
    song_patterns = [
        (r'bác\s*đang\s*cùng\s*chúng\s*cháu', 'Bác-Đang-Cùng-Chúng-Cháu-Hành-Quân.wav'),
        (r'ca\s*ngợi\s*hồ\s*chủ\s*tịch', 'CA-NGỢI-HỒ-CHỦ-TỊCH.wav'),
        (r'chào\s*mừng\s*đảng', 'CHÀO-MỪNG-ĐẢNG-CỘNG-SẢN-VIỆT-NAM.wav'),
        (r'cuộc\s*đời\s*vẫn\s*đẹp', 'Cuộc đời vẫn đẹp sao.wav'),
        (r'giải\s*phóng\s*điện\s*biên', 'Giải-phóng-Điện-Biên-Bản-chuẩn-Có-lời.wav'),
        (r'hành\s*khúc\s*sư\s*đoàn', 'HÀNH KHÚC SƯ ĐOÀN 395 .wav'),
        (r'hành\s*khúc\s*trung\s*đoàn', 'HÀNH KHÚC TRUNG ĐOÀN 8.wav'),
        (r'hát\s*mãi\s*khúc\s*quân\s*hành', 'Hát-mãi-khúc-quân-hành.wav'),
        (r'như\s*có\s*bác', 'Như Có Bác Trong Ngày Vui Đại Thắng.wav'),
        (r'quốc\s*tế\s*ca', 'QUỐC-TẾ-CA.wav'),
        (r'tiến\s*bước\s*dưới\s*quân\s*kỳ', 'TIẾN-BƯỚC-DƯỚI-QUÂN-KỲ.wav'),
        (r'thanh\s*niên\s*làm\s*theo', 'Thanh-Niên-Làm-Theo-Lời-Bác.wav'),
        (r'tiến\s*quân\s*ca', 'Tiến quân ca.wav'),
        (r'trái\s*tim\s*chiến\s*sĩ', 'Trái tim chiến sĩ .wav'),
        (r'tổ\s*quốc\s*trong\s*tim', 'Tổ quốc trong tim .wav'),
        (r'vì\s*nhân\s*dân\s*quên\s*mình', 'VÌ NHÂN DÂN QUÊN MÌNH.wav'),
        (r'ước\s*mơ\s*chiến\s*s[ỹĩ]', 'Ước mơ chiến sỹ.wav'),
        (r'nhạc\s*đỏ', 'Hát-mãi-khúc-quân-hành.wav'), # Default fallback
    ]
    
    for pattern, filename in song_patterns:
        if re.search(pattern, query_lower):
            return f"song:{filename}"
            
    # History & Regimes (Audio Static)
    static_patterns = [
        (r'lịch\s*sử\s*quân\s*khu\s*(?:3|ba)', 'lich_su_quan_khu_3.wav'),
        (r'lịch\s*sử\s*sư\s*đoàn\s*(?:395|ba\s*chín\s*năm)', 'lich_su_su_doan_395.wav'),
        (r'lịch\s*sử\s*trung\s*đoàn\s*(?:8|tám)', 'lich_su_trung_doan_8.wav'),
        (r'mốc\s*son\s*lịch\s*sử', 'moc_son_lich_su.wav'),
        (r'9\s*truyền\s*thống', '9_truyen_thong.wav'),
        (r'chín\s*truyền\s*thống', '9_truyen_thong.wav'),
        (r'11\s*chế\s*độ', '11_che_do_trong_ngay.wav'),
        (r'mười\s*một\s*chế\s*độ', '11_che_do_trong_ngay.wav'),
        (r'23\s*đầu\s*công\s*việc', '23_dau_cong_viec.wav'),
        (r'hai\s*mươi\s*ba\s*đầu\s*công\s*việc', '23_dau_cong_viec.wav'),
        (r'9\s*đầu\s*công\s*việc', '9_dau_cong_việc.wav'),
        (r'chín\s*đầu\s*công\s*việc', '9_dau_cong_viec.wav'),
        (r'4\s*đối\s*tượng\s*tác\s*chiến', '4_doi_tuong_tac_chien.wav'),
        (r'bốn\s*đối\s*tượng\s*tác\s*chiến', '4_doi_tuong_tac_chien.wav'),
    ]
    
    for pattern, filename in static_patterns:
        if re.search(pattern, query_lower):
            return f"static:{filename}"
            
    return None

def get_audio_template_files(template_id: str) -> List[str]:
    """Return list of audio web URLs for the template"""
    audio_dir = current_dir / 'data' / 'audio_templates'
    static_dir = current_dir / 'data' / 'audio_static'
    
    # 1. Handle Static Audio Requests (History/Regimes)
    if template_id.startswith('static:'):
        fname = template_id.split(':', 1)[1]
        if (static_dir / fname).exists():
            return [f'/audio_static/{fname}']
        return []
        
    # 2. Handle Song Requests
    if template_id.startswith('song:'):
        fname = template_id.split(':', 1)[1]
        if (audio_dir / fname).exists():
            return [f'/audio/{fname}']
        return []

    if not audio_dir.exists():
        return []

    # 3. Map template_id to filenames (Templates)
    filenames = []
    
    # Oaths
    if template_id == 'loi_the_all':
        filenames = [f'loi_the_{i}.wav' for i in range(1, 11)]
    elif template_id.startswith('loi_the_'):
        num = template_id.split('_')[-1]
        filenames = [f'loi_the_{num}.wav']
        
    # Rules (Dieu cam/ky luat)
    elif template_id == 'dieu_all':
        filenames = [f'dieu_{i}.wav' for i in range(1, 13)]
    elif template_id.startswith('dieu_'):
        num = template_id.split('_')[-1]
        filenames = [f'dieu_{num}.wav']
        
    # Duties (Chuc trach)
    elif template_id == 'chuc_trach_nguoi_gac':
        filenames = ['chuc_trach_nguoi_gac.wav']
    elif template_id.startswith('chuc_trach_'):
        num = template_id.split('_')[-1]
        filenames = [f'chuc_trach_{num}.wav']
        
    # Custom
    elif template_id == 'chi_thi_33':
        filenames = ['chi_thi_33.wav']
    
    # Return web URLs for files that exist
    urls = []
    for fname in filenames:
        if (audio_dir / fname).exists():
            urls.append(f'/audio/{fname}')
    return urls

async def generate_audio(text: str) -> Optional[bytes]:
    try:
        tts = await initialize_tts()
        if not tts:
            return None
        temp_file = os.path.join(tempfile.gettempdir(), f"tts_{hash(text)}.wav")
        await tts.text_to_speak(text, temp_file)
        if os.path.exists(temp_file):
            with open(temp_file, 'rb') as f:
                return f.read()
    except Exception as e:
        logger.error(f"Audio error: {e}")
    return None

# ============================================================================
# FACEBOOK BLUE THEME CSS
# ============================================================================
THEME_CSS = """
<style>
:root {
    --primary: #1877F2;
    --primary-light: #4293f7;
    --primary-dark: #1565c0;
    --glow: rgba(24, 119, 242, 0.3);
    --border: rgba(24, 119, 242, 0.25);
}

* { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }

/* ===== DARK MODE (default) ===== */
body, .q-page, .nicegui-content {
    background: linear-gradient(180deg, #18191a 0%, #242526 50%, #18191a 100%) !important;
    color: #e4e6eb;
    min-height: 100vh;
    transition: all 0.3s ease;
}

.app-header, .input-container { background: rgba(36, 37, 38, 0.98) !important; }
.sidebar { background: rgba(36, 37, 38, 0.98) !important; }
.stats-card, .alert-info { background: rgba(58, 59, 60, 0.9) !important; border: 1px solid var(--border); }
.chat-message.assistant-message { background: rgba(58, 59, 60, 0.95) !important; }
.chat-message.user-message { background: rgba(24, 119, 242, 0.2) !important; }
.chat-input { background: rgba(58, 59, 60, 0.9) !important; color: #e4e6eb !important; }
.message-content { color: #e4e6eb; }

/* ===== LIGHT MODE ===== */
body.light-mode, body.light-mode .q-page, body.light-mode .nicegui-content {
    background: linear-gradient(180deg, #f0f2f5 0%, #e4e6e9 50%, #f0f2f5 100%) !important;
    color: #1c1e21;
}

body.light-mode .app-header, body.light-mode .input-container { background: rgba(255, 255, 255, 0.98) !important; }
body.light-mode .sidebar { background: rgba(255, 255, 255, 0.98) !important; }
body.light-mode .stats-card, body.light-mode .alert-info { background: rgba(255, 255, 255, 0.95) !important; }
body.light-mode .chat-message.assistant-message { background: rgba(255, 255, 255, 0.95) !important; border-color: #dddfe2 !important; }
body.light-mode .chat-message.user-message { background: var(--primary) !important; }
body.light-mode .chat-message.user-message .message-header,
body.light-mode .chat-message.user-message .message-content { color: white !important; }
body.light-mode .chat-input { background: #f0f2f5 !important; color: var(--primary) !important; border-color: var(--primary) !important; }
body.light-mode .chat-input::placeholder { color: #65676b !important; }
body.light-mode .chat-input input { color: var(--primary) !important; }
body.light-mode .message-content { color: #1c1e21 !important; }
body.light-mode .stats-title { color: #65676b !important; }
body.light-mode .sidebar-header { color: var(--primary) !important; }
body.light-mode .app-title { color: var(--primary) !important; -webkit-text-fill-color: var(--primary) !important; }

/* ===== HEADER ===== */
.app-header {
    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
    backdrop-filter: blur(20px);
    padding: 1rem 2rem;
    display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid var(--border);
}

.app-title {
    font-size: 1.5rem; font-weight: 800;
    background: linear-gradient(90deg, var(--primary), var(--primary-light), var(--primary));
    background-size: 200% 100%;
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    animation: shimmer 3s linear infinite;
    text-transform: uppercase;
}

@keyframes shimmer { from { background-position: 200% center; } to { background-position: -200% center; } }

/* ===== SIDEBAR ===== */
.sidebar { backdrop-filter: blur(20px); border-right: 1px solid var(--border); padding: 1.5rem; }

.sidebar-header {
    font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.15em; color: var(--primary);
    margin-bottom: 1rem; padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
}

/* ===== STATS CARDS ===== */
.stats-card { border-radius: 12px; padding: 1rem; margin-bottom: 0.75rem; transition: all 0.3s ease; }
.stats-card:hover { border-color: var(--primary); transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
.stats-title { font-size: 0.65rem; font-weight: 600; text-transform: uppercase; color: #8a8d91; }
.stats-value { font-size: 1.1rem; font-weight: 700; color: var(--primary); }

/* ===== CHAT ===== */
.chat-container { max-width: 1100px; width: 100%; margin: 0 auto; padding: 5rem 2rem 7rem; min-height: 100vh; }

.chat-message {
    max-width: 85%; padding: 1rem 1.25rem; margin: 0.75rem 0;
    border-radius: 18px;
    animation: messageSlide 0.4s ease-out;
}

@keyframes messageSlide { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }

.user-message { border: 1px solid var(--primary); border-radius: 18px 18px 4px 18px; margin-left: auto !important; }
.assistant-message { border: 1px solid rgba(128, 128, 128, 0.2); border-radius: 18px 18px 18px 4px; margin-right: auto !important; }
.audio-message { width: 85% !important; max-width: 85% !important; }

.message-header { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem; }
.user-message .message-header { color: var(--primary); }
.assistant-message .message-header { color: #8a8d91; }
.message-content { font-size: 0.9375rem; line-height: 1.6; }

/* ===== INPUT ===== */
.input-container {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
    backdrop-filter: blur(20px);
    padding: 1rem 2rem;
    border-top: 1px solid var(--border);
}

.input-wrapper { max-width: 800px; margin: 0 auto; display: flex; gap: 0.75rem; align-items: center; }

.chat-input {
    flex: 1;
    border: 1px solid var(--border) !important;
    border-radius: 24px !important;
    padding: 0.875rem 1.25rem !important;
}

.chat-input:focus { border-color: var(--primary) !important; box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.2); }

.send-btn {
    background: var(--primary) !important;
    border: none !important; border-radius: 24px !important;
    padding: 0.875rem 1.5rem !important; color: white !important;
    font-weight: 600 !important; cursor: pointer;
}

.send-btn:hover { background: var(--primary-dark) !important; transform: scale(1.02); }

/* ===== BUTTONS ===== */
.btn-icon {
    background: transparent !important;
    border: 1px solid var(--border) !important;
    border-radius: 50% !important; color: var(--primary) !important;
}
.btn-icon:hover { background: var(--primary) !important; color: white !important; }

.btn-danger { background: rgba(220, 38, 38, 0.1) !important; border-color: rgba(220, 38, 38, 0.3) !important; color: #dc2626 !important; }
.btn-danger:hover { background: #dc2626 !important; color: white !important; }

/* ===== THEME TOGGLE ===== */
.theme-toggle { background: rgba(128, 128, 128, 0.15); border: 1px solid var(--border); border-radius: 24px; padding: 0.2rem; display: flex; }
.theme-btn { padding: 0.4rem 0.8rem; border-radius: 20px; border: none; cursor: pointer; background: transparent; color: #8a8d91; transition: all 0.2s; }
.theme-btn.active { background: var(--primary); color: white; }

/* ===== MISC ===== */
.audio-player { margin-top: 0.75rem; }
.audio-player audio { width: 100%; min-width: 500px; height: 40px; border-radius: 20px; }
.alert-info { border-radius: 12px; padding: 1rem; }

::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--primary); border-radius: 4px; }

@media (max-width: 768px) {
    .app-header { padding: 0.75rem 1rem; }
    .app-title { font-size: 1rem; }
    .chat-container { padding: 4.5rem 1rem 6rem; }
    .sidebar { width: 280px !important; }
}
</style>
"""

# ============================================================================
# MAIN PAGE
# ============================================================================
@ui.page('/')
async def main_page():
    ui.add_head_html(THEME_CSS)
    ui.add_head_html('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">')
    
    if 'dark_mode' not in app.storage.user:
        app.storage.user['dark_mode'] = True
    
    dark_btn = None
    light_btn = None
    
    def set_dark_mode():
        app.storage.user['dark_mode'] = True
        ui.run_javascript('document.body.classList.remove("light-mode");')
        dark_btn.classes(add='active')
        light_btn.classes(remove='active')
    
    def set_light_mode():
        app.storage.user['dark_mode'] = False
        ui.run_javascript('document.body.classList.add("light-mode");')
        dark_btn.classes(remove='active')
        light_btn.classes(add='active')
    
    async def init_rag():
        await initialize_rag_system()
        status_label.set_text("✅ Sẵn sàng")
    
    # Header
    with ui.element('div').classes('app-header'):
        ui.label('🤖 TRỢ LÍ ẢO CHÍNH TRỊ').classes('app-title')
        with ui.row().classes('items-center gap-4'):
            with ui.element('div').classes('theme-toggle'):
                dark_btn = ui.button('🌙', on_click=set_dark_mode).classes('theme-btn active')
                light_btn = ui.button('☀️', on_click=set_light_mode).classes('theme-btn')
            ui.button(icon='menu', on_click=lambda: sidebar.toggle()).props('flat')
    
    # Sidebar
    with ui.left_drawer(value=True).classes('sidebar') as sidebar:
        ui.label('⚙️ CÀI ĐẶT').classes('sidebar-header')
        
        with ui.element('div').classes('stats-card'):
            ui.label('Trạng thái').classes('stats-title')
            status_label = ui.label('🔄 Đang khởi tạo...').classes('stats-value')
        
        ui.label('📊 THỐNG KÊ').classes('sidebar-header mt-4')
        
        with ui.element('div').classes('stats-card'):
            ui.label('Model').classes('stats-title')
            model_label = ui.label('...').classes('stats-value')
        
        with ui.element('div').classes('stats-card'):
            ui.label('Temperature').classes('stats-title')
            temp_label = ui.label('...').classes('stats-value')
        
        ui.separator().classes('my-4')
        
        def clear_history():
            state["messages"].clear()
            chat_container.clear()
            ui.notify("🗑️ Đã xóa", type='info')
        
        ui.button('🗑️ Xóa lịch sử', on_click=clear_history).classes('w-full btn-danger')
        
        ui.separator().classes('my-4')
        ui.label('ℹ️ THÔNG TIN').classes('sidebar-header')
        with ui.element('div').classes('alert-info'):
            ui.markdown('**RAG:** ✅ Hybrid Search | ✅ 100% Offline')
    
    # Chat
    with ui.element('div').classes('chat-container'):
        chat_container = ui.column().classes('w-full gap-2')
    
    # Input
    with ui.element('div').classes('input-container'):
        with ui.element('div').classes('input-wrapper'):
            user_input = ui.input(placeholder='Nhập câu hỏi...').classes('chat-input').props('outlined dense')
            send_btn = ui.button('▶️').classes('send-btn')
    
    async def scroll_to_bottom():
        await ui.run_javascript('window.scrollTo(0, document.body.scrollHeight)')

    async def generate_response(query):
        try:
            template_id = detect_audio_template_query(query)
            if template_id:
                audio_files = get_audio_template_files(template_id)
                if audio_files:
                    response_text = "🎵 Đang phát audio..."
                    state["messages"].append({"role": "assistant", "content": response_text})
                    with chat_container:
                        # Add 'audio-message' class to expand width
                        with ui.element('div').classes('chat-message assistant-message audio-message'):
                            ui.html('<div class="message-header">🤖 Trợ lí</div>', sanitize=False)
                            ui.html(f'<div class="message-content">{response_text}</div>', sanitize=False)
                            with ui.element('div').classes('audio-player'):
                                for i, f in enumerate(audio_files):
                                    player = ui.audio(f).classes('w-full')
                                    # Autoplay ONLY if it's a single file (Song/Command) to avoid chaos
                                    if len(audio_files) == 1:
                                        player.props('autoplay')
                    
                    await scroll_to_bottom()
                    return
            
            if not state["rag_initialized"]:
                ui.notify("⏳ Đang khởi tạo...", type='warning')
                return
            
            with chat_container:
                with ui.element('div').classes('chat-message assistant-message') as response_container:
                    ui.html('<div class="message-header">🤖 Trợ lí</div>', sanitize=False)
                    response_content = ui.label('⏳ Đang suy nghĩ...').classes('message-content')
            
            await scroll_to_bottom()
            
            llm = state["llm_provider"]
            full_response_buffer = ""
            displayed_response = ""
            generation_complete = False

            # 1. Background task to stream data from LLM
            async def stream_data():
                nonlocal full_response_buffer, generation_complete
                async for chunk in llm.chat_stream(query):
                    if isinstance(chunk, str):
                        full_response_buffer += chunk
                    elif isinstance(chunk, dict):
                        full_response_buffer += chunk.get("content", "") or chunk.get("text", "")
                generation_complete = True

            # Start streaming
            asyncio.create_task(stream_data())

            # 2. Foreground loop for typewriter animation
            while not generation_complete or len(displayed_response) < len(full_response_buffer):
                if len(displayed_response) < len(full_response_buffer):
                    # Add next character
                    next_char_index = len(displayed_response)
                    displayed_response += full_response_buffer[next_char_index]
                    
                    # Update UI
                    response_content.set_text(displayed_response + "▊")
                    
                    # Animation speed (adjust for smoothness)
                    await asyncio.sleep(0.030) 
                else:
                    # Waiting for more data
                    await asyncio.sleep(0.05)
            
            # Finalize
            full_response = full_response_buffer
            response_content.set_text(full_response)
            state["messages"].append({"role": "assistant", "content": full_response})
            
            tts_generated = {'done': False}
            audio_container = None # Initialize placeholder

            async def play_tts():
                nonlocal audio_container
                if tts_generated['done']:
                    return
                tts_generated['done'] = True
                tts_btn.set_text('⏳')
                tts_btn.disable()
                
                audio_bytes = await generate_audio(full_response)
                if audio_bytes:
                    temp_path = os.path.join(tempfile.gettempdir(), f"tts_{hash(full_response)}.wav")
                    with open(temp_path, 'wb') as f:
                        f.write(audio_bytes)
                    # Use the container created inside the message
                    if audio_container:
                        with audio_container:
                            ui.audio(temp_path).props('controls autoplay') # Autoplay TTS too
                    tts_btn.set_text('✅')
                    await scroll_to_bottom()
                else:
                    tts_btn.set_text('❌')
                    ui.notify('Lỗi tạo audio', type='negative')
            
            with response_container:
                tts_btn = ui.button('🔊', on_click=play_tts).classes('btn-icon mt-2').props('flat round size=sm')
                # Create container INSIDE the message bubble
                audio_container = ui.element('div').classes('audio-player')
                
            await scroll_to_bottom()
        
        except Exception as e:
            ui.notify(f"Lỗi: {str(e)}", type='negative')
            logger.error(f"Error in chat: {e}")

    async def handle_send():
        query = user_input.value.strip()
        if not query:
            return
        
        user_input.value = ''
        state["messages"].append({"role": "user", "content": query})
        with chat_container:
            with ui.element('div').classes('chat-message user-message'):
                ui.html('<div class="message-header">👤 Bạn</div>', sanitize=False)
                ui.html(f'<div class="message-content">{query}</div>', sanitize=False)
        
        await scroll_to_bottom()
        
        # Force UI update + Detach LLM generation from input event
        ui.timer(0.1, lambda: generate_response(query), once=True)
    
    send_btn.on('click', handle_send)
    user_input.on('keydown.enter', handle_send)
    
    ui.timer(0.1, init_rag, once=True)
    
    async def update_stats():
        await asyncio.sleep(2)
        if state["rag_config"]:
            model_label.set_text(state["rag_config"].get('model_name', 'N/A'))
            temp_label.set_text(str(state["rag_config"].get('temperature', 'N/A')))
    
    ui.timer(0.5, update_stats, once=True)

app.add_static_files('/audio', str(current_dir / 'data' / 'audio_templates'))
app.add_static_files('/audio_static', str(current_dir / 'data' / 'audio_static'))

if __name__ in {"__main__", "__mp_main__"}:
    ui.run(
        title="TRỢ LÍ ẢO CHÍNH TRỊ",
        host="0.0.0.0",
        port=8006,
        reload=False,
        show=False,
        dark=True,
        favicon="🤖",
        storage_secret="xiaozhi-2024",
    )
