"""
Xiaozhi RAG Chat Interface - Streamlit Web UI
Giao diện web offline để chat với hệ thống RAG Xiaozhi
"""

import streamlit as st
import sys
import os
from pathlib import Path

# Thêm thư mục root vào sys.path và set working directory
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# CRITICAL: Change working directory to ensure relative paths in config.yaml work
# This ensures ChromaDB path ./data/rag-chroma resolves to the same location as WebSocket server
os.chdir(current_dir)

from config.settings import load_config
from config.logger import setup_logging
from core.providers.llm.rag.rag_ollama import LLMProvider

# Cấu hình trang
st.set_page_config(
    page_title="TRỢ LÍ ẢO CHÍNH TRỊ",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Refined Dark Theme - Harmonious Colors
# Modern Harmonious Theme - Replace entire st.markdown CSS section in streamlit_app.py

# Function to encode image to base64
import base64
def get_base64_encoded_image(image_path):
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode('utf-8')

# Get background image
bg_image_path = './data/images/background.jpg'
bg_css = 'none'
try:
    if os.path.exists(bg_image_path):
        bg_b64 = get_base64_encoded_image(bg_image_path)
        bg_css = f'url("data:image/jpg;base64,{bg_b64}")'
except Exception as e:
    # logger.error(f"Error loading background image: {e}")
    bg_css = 'none'

st.markdown("""
<style>
    /* ============================================
       MODERN COLOR SYSTEM
       ============================================
       Background: Navy (#0a0e27, #131829, #1e293b)
       Primary: Blue (#3b82f6, #60a5fa, #2563eb)
       Secondary: Purple (#8b5cf6, #a78bfa, #7c3aed)
       Text: Light (#f8fafc, #e2e8f0, #cbd5e1, #94a3b8)
       Success: Emerald (#10b981)
       ============================================ */
    
    /* No external fonts - using system fonts only */
    
    /* ========== GLOBAL RESET ========== */
    * {
        font-family: 'Segoe UI', Tahoma, Arial, Helvetica, sans-serif;
    }
    
/* ========== MAIN CONTAINER WITH IMAGE ========== */
/* ========== MAIN CONTAINER - FROSTED OVERLAY ========== */
    .main {
        background: rgba(10, 14, 39, 0.85); /* Dark semi-transparent overlay */
        backdrop-filter: blur(8px); /* Blur the image behind */
        -webkit-backdrop-filter: blur(8px);
        color: #e2e8f0;
        padding: 0;
    }
    
    /* ========== APP CONTAINER - BACKGROUND IMAGE ========== */
    [data-testid="stAppViewContainer"] {
        background: 
            linear-gradient(
                135deg, 
                rgba(10, 14, 39, 0.4) 0%, 
                rgba(19, 24, 41, 0.5) 100%
            ),
            __BG_CSS__;
        background-size: cover;
        background-position: center;
        background-attachment: fixed;
    }
    
    /* ========== PAGE TITLE (FIXED HEADER) ========== */
    h1 {
        position: fixed !important;
        top: 3.5rem !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        right: auto !important;
        bottom: auto !important;
        height: auto !important;
        width: auto !important;
        max-width: 500px !important; /* Compact title bar */
        z-index: 1000 !important;
        
        background: rgba(10, 14, 39, 0.9) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(59, 130, 246, 0.3) !important;
        border-radius: 12px !important;
        
        /* Text styling */
        color: #60a5fa !important;
        text-align: center;
        padding: 0.75rem 2rem !important;
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.04em;
        margin: 0 !important;
    }
    
    /* Main content padding to prevent overlap with fixed header/footer */
    .main .block-container {
        padding-top: 7rem !important;
        padding-bottom: 6rem !important;
    }

    /* ========== MESSAGE ANIMATIONS ========== */
    @keyframes messageSlideIn {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes messageFadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    /* ========== CHAT MESSAGE CONTAINER ========== */
    .chat-message {
        padding: 1rem 1.25rem;
        margin: 0.5rem 0;
        display: flex;
        flex-direction: column;
        max-width: 80%;
        width: fit-content;
        backdrop-filter: blur(10px);
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        
        /* Smooth slide-in animation */
        animation: messageSlideIn 0.4s ease-out forwards;
    }
    
    .chat-message .message-content {
        animation: messageFadeIn 0.6s ease-out forwards;
    }
    
    /* User Message - Blue Theme (Right Aligned) */
    .user-message {
        background: rgba(59, 130, 246, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.3);
        border-radius: 18px 18px 4px 18px;
        margin-left: auto !important;
        margin-right: 0 !important;
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
        text-align: right;
    }
    
    .user-message:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.5);
        transform: translateY(-1px);
    }
    
    /* Assistant Message - Purple Theme (Left Aligned) */
    .assistant-message {
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-radius: 18px 18px 18px 4px;
        margin-right: auto !important;
        margin-left: 0 !important;
        box-shadow: 0 2px 8px rgba(139, 92, 246, 0.1);
        text-align: left;
    }
    
    .assistant-message:hover {
        background: rgba(139, 92, 246, 0.15);
        border-color: rgba(139, 92, 246, 0.5);
        transform: translateY(-1px);
    }
    
    /* ========== MESSAGE HEADER ========== */
    .message-header {
        font-weight: 600;
        font-size: 1.25rem;
        margin-bottom: 0.75rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.95;
    }
    
    .user-message .message-header {
        color: #60a5fa;
    }
    
    .assistant-message .message-header {
        color: #a78bfa;
    }
    
    /* ========== MESSAGE CONTENT ========== */
    .message-content {
        font-size: 0.9375rem;
        line-height: 1.5;
        color: #e2e8f0;
        font-weight: 400;
        letter-spacing: 0.005em;
    }
    
    /* ========== TEXT INPUT ========== */
    .stTextInput > div > div > input {
        background: rgba(30, 41, 59, 0.6);
        border-radius: 10px;
        border: 2px solid rgba(59, 130, 246, 0.2);
        padding: 0.75rem 1rem;
        font-size: 0.9375rem;
        color: #e2e8f0 !important;
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(10px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .stTextInput > div > div > input:focus {
        border-color: #3b82f6;
        background: rgba(30, 41, 59, 0.8);
        box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15),
                    0 4px 16px rgba(59, 130, 246, 0.2);
        outline: none;
        transform: translateY(-1px);
    }
    
    .stTextInput > div > div > input::placeholder {
        color: #94a3b8;
        opacity: 0.8;
    }
    
    /* ========== SIDEBAR ========== */
    [data-testid="stSidebar"] {
        background: linear-gradient(180deg, 
            rgba(15, 23, 42, 0.95) 0%, 
            rgba(17, 24, 39, 0.95) 100%);
        backdrop-filter: blur(20px);
        border-right: 1px solid rgba(59, 130, 246, 0.15);
    }
    
    [data-testid="stSidebar"] h3 {
        color: #60a5fa;
        font-size: 1.5rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-top: 1.5rem;
        margin-bottom: 1rem;
    }
    
    [data-testid="stSidebar"] .stMarkdown {
        color: #cbd5e1;
    }
    
    /* ========== STATS CARDS ========== */
    .stats-card {
        background: linear-gradient(135deg, 
            rgba(30, 41, 59, 0.8) 0%, 
            rgba(30, 41, 59, 0.6) 100%);
        padding: 1rem;
        border-radius: 8px;
        border: 1px solid rgba(59, 130, 246, 0.2);
        margin-bottom: 0.75rem;
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }
    
    .stats-card:hover {
        border-color: rgba(59, 130, 246, 0.4);
        box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
        transform: translateY(-2px);
    }
    
    .stats-title {
        font-size: 0.625rem;
        color: #94a3b8;
        margin-bottom: 0.5rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
    
    .stats-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #3b82f6;
    }
    
    /* ========== BUTTONS ========== */
    .stButton > button {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 0.625rem 1.25rem;
        font-weight: 600;
        font-size: 0.875rem;
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    .stButton > button:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        transform: translateY(-2px) scale(1.02);
    }
    
    .stButton > button:active {
        transform: translateY(0) scale(0.98);
    }
    
    /* ========== FORM SUBMIT BUTTON ========== */
    .stFormSubmitButton > button {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 0.75rem 1.5rem;
        font-weight: 600;
        font-size: 0.9375rem;
        width: 100%;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .stFormSubmitButton > button:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        transform: translateY(-2px);
    }
    
    .stFormSubmitButton > button:active {
        transform: translateY(0);
    }
    
    /* ========== DIVIDER ========== */
    hr {
        border: none;
        border-top: 1px solid rgba(59, 130, 246, 0.2);
        margin: 2rem 0;
        opacity: 0.6;
    }
    
    /* ========== INFO BOX ========== */
    .stAlert {
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid rgba(139, 92, 246, 0.3);
        border-left: 4px solid #8b5cf6;
        color: #e2e8f0;
        border-radius: 10px;
        padding: 1rem;
    }
    
    /* ========== EXPANDER ========== */
    .streamlit-expanderHeader {
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 8px;
        color: #60a5fa !important;
        font-weight: 600;
        font-size: 0.875rem;
    }
    
    .streamlit-expanderHeader:hover {
        background: rgba(30, 41, 59, 0.8);
        border-color: rgba(59, 130, 246, 0.4);
    }
    
    .streamlit-expanderContent {
        background: rgba(30, 41, 59, 0.3);
        border: 1px solid rgba(59, 130, 246, 0.15);
        border-top: none;
        border-radius: 0 0 8px 8px;
    }

    /* ========== AUDIO PLAYER - COMPACT ========== */
    audio {
        width: 280px !important; /* Wider player */
        max-width: 100% !important;
        height: 40px !important;
        border-radius: 20px;
        background: rgba(30, 41, 59, 0.9);
        border: 1px solid rgba(59, 130, 246, 0.4);
        outline: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        display: block;
        margin-top: 0.5rem;
    }
    
    audio:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
    }
    
    /* Audio Controls Panel */
    audio::-webkit-media-controls-panel {
        background: transparent;
        border-radius: 20px;
        padding: 0 8px;
    }
    
    /* Play Button - High Contrast SVG */
    audio::-webkit-media-controls-play-button {
        background-color: #3b82f6;
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>');
        background-size: 14px;
        background-position: center;
        background-repeat: no-repeat;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        margin-right: 8px;
        cursor: pointer;
        opacity: 1;
    }
    
    audio::-webkit-media-controls-play-button:hover {
        background-color: #2563eb;
        transform: scale(1.1);
    }
    
    /* Pause Button - High Contrast SVG */
    audio::-webkit-media-controls-pause-button {
        background-color: #8b5cf6;
        background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>');
        background-size: 12px;
        background-position: center;
        background-repeat: no-repeat;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        margin-right: 8px;
        cursor: pointer;
        opacity: 1;
    }
    
    audio::-webkit-media-controls-pause-button:hover {
        background-color: #7c3aed;
        transform: scale(1.1);
    }
    
    @keyframes titleGlow {
        0%, 100% { 
            filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
        }
        50% { 
            filter: drop-shadow(0 0 30px rgba(139, 92, 246, 0.4));
        }
    }
    
    /* ========== FORM (FIXED FOOTER) ========== */
    [data-testid="stForm"] {
        position: fixed !important;
        bottom: 1rem !important; /* Gap from screen bottom */
        left: 50% !important;
        transform: translateX(-50%) !important;
        right: auto !important;
        top: auto !important;
        height: auto !important;
        width: 100% !important;
        max-width: 600px !important;
        z-index: 1000 !important;
        
        background: rgba(10, 14, 39, 0.95) !important;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(59, 130, 246, 0.3) !important;
        border-radius: 16px !important; /* Full rounded corners */
        
        padding: 1rem 1.5rem !important;
        margin: 0 !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3) !important;
    }
    
    /* ========== EXPANDER (Audio Playlist) - FORCE COMPACT ========== */
    [data-testid="stExpander"] {
        max-width: 320px !important;
        width: fit-content !important;
    }
    
    [data-testid="stExpander"] > div {
        max-width: 320px !important;
    }
    
    .streamlit-expanderHeader {
        background: rgba(30, 41, 59, 0.8) !important;
        border: 1px solid rgba(59, 130, 246, 0.3) !important;
        border-radius: 8px !important;
        color: #60a5fa !important;
        font-weight: 600;
        font-size: 0.8rem;
        padding: 0.5rem 1rem !important;
        width: fit-content !important;
        min-width: 200px !important;
    }
    
    .streamlit-expanderContent {
        background: rgba(30, 41, 59, 0.5) !important;
        border: 1px solid rgba(59, 130, 246, 0.2) !important;
        border-top: none !important;
        border-radius: 0 0 8px 8px !important;
        padding: 0.75rem !important;
        max-width: 320px !important;
    }
    
    /* ========== COLUMNS ========== */
    [data-testid="column"] {
        padding: 0 0.5rem;
    }
    
    /* ========== SCROLLBAR ========== */
    ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
    }
    
    ::-webkit-scrollbar-track {
        background: #0a0e27;
        border-radius: 5px;
    }
    
    ::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
        border-radius: 5px;
        border: 2px solid #0a0e27;
    }
    
    ::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%);
    }
    
    /* ========== CAPTION TEXT ========== */
    .stCaption {
        color: #94a3b8 !important;
        font-size: 0.8125rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }
    
    /* ========== SPINNER ========== */
    .stSpinner > div {
        border-top-color: #3b82f6 !important;
    }
    
    /* ========== SUCCESS MESSAGE ========== */
    .stSuccess {
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.3);
        border-left: 4px solid #10b981;
        color: #e2e8f0;
        border-radius: 10px;
    }
    
    /* ========== WARNING MESSAGE ========== */
    .stWarning {
        background: rgba(245, 158, 11, 0.1);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-left: 4px solid #f59e0b;
        color: #e2e8f0;
        border-radius: 10px;
    }
    
    /* ========== ERROR MESSAGE ========== */
    .stError {
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-left: 4px solid #ef4444;
        color: #e2e8f0;
        border-radius: 10px;
    }
    
    /* ========== RESPONSIVE ADJUSTMENTS ========== */
    @media (max-width: 768px) {
        h1 {
            font-size: 1.5rem;
            padding: 1rem 0;
        }
        
        .main .block-container {
            padding-top: 5rem;
            padding-bottom: 7rem;
        }
        
        .chat-message {
            padding: 1rem;
            max-width: 100%;
            margin: 0.5rem auto;
        }
        
        .message-content {
            font-size: 0.875rem;
        }
        
        .stats-card {
            padding: 0.875rem;
        }
    }
    
    /* ========== ACCESSIBILITY ========== */
    *:focus-visible {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
    }
    
    /* ========== SMOOTH ANIMATIONS ========== */
    * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
    }
</style>
""".replace("__BG_CSS__", bg_css), unsafe_allow_html=True)

# Khởi tạo logger
logger = setup_logging()

# Import TTS provider
from core.providers.tts.pyttsx3_provider import TTSProvider
import tempfile

@st.cache_resource
def initialize_tts():
    """Khởi tạo TTS provider (chỉ chạy 1 lần)"""
    try:
        config = load_config()
        tts_config = config.get("TTS", {}).get("pyttsx3_provider", {})
        
        # Initialize TTS Provider
        tts_provider = TTSProvider(tts_config, delete_audio_file=False)
        
        return tts_provider
    except Exception as e:
        logger.error(f"❌ Lỗi khởi tạo TTS: {str(e)}")
        return None

def detect_audio_template_query(query):
    """Detect if query is asking for pre-recorded audio template"""
    query_lower = query.lower().strip()
    
    # Pattern matching for audio templates
    audio_patterns = {
        # 10 lời thề - individual or all
        r'10\s*lời\s*thề': 'loi_the_all',
        r'lời\s*thề\s*số\s*0*(\d+)': 'loi_the_{num}',  # Handle "số 01", "số 1"
        r'lời\s*thề\s*thứ\s*0*(\d+)': 'loi_the_{num}',
        r'lời\s*thề\s*0*(\d+)': 'loi_the_{num}',
        
        # 12 điều cấm - individual or all  
        r'12\s*điều\s*cấm': 'dieu_all',
        r'điều\s*cấm\s*số\s*0*(\d+)': 'dieu_{num}',
        r'điều\s*cấm\s*thứ\s*0*(\d+)': 'dieu_{num}',
        r'điều\s*0*(\d+)': 'dieu_{num}',
        
        # Bài hát - Flexible patterns
        # Matches: "phát bài hát...", "bài hát...", "nghe bài...", "mở bài..."
        # Vì nhân dân quên mình
        r'(?:phát|nghe|mở|chơi)?\s*(?:bài\s*hát|nhạc|bài)?\s*vì\s*nhân\s*dân\s*quên\s*mình': 'song_vi_nhan_dan',
        
        # Hành khúc trung đoàn 8
        r'(?:phát|nghe|mở|chơi)?\s*(?:bài\s*hát|nhạc|bài)?\s*(?:hành\s*khúc|truyền\s*thống)?\s*trung\s*đoàn\s*(?:8|tám)': 'song_hanh_khuc_td8',

        # Chỉ thị 33 (Bonus)
        r'(?:phát|nghe|mở|đọc)?\s*chỉ\s*thị\s*33': 'chi_thi_33',
    }
    
    import re
    for pattern, template in audio_patterns.items():
        match = re.search(pattern, query_lower)
        if match:
            if '{num}' in template:
                # Extract number for templates with {num}
                # Find the first capture group that is not None
                num = match.group(1).lstrip('0') or '0'
                return template.replace('{num}', num)
            return template
    
    return None

def get_audio_template_files(template_id):
    """Get audio file path(s) for a template ID"""
    import os
    
    # Get absolute path to avoid issues
    audio_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'audio_templates')
    
    # Check if directory exists
    if not os.path.exists(audio_dir):
        logger.error(f"Audio template directory not found: {audio_dir}")
        return []
    
    files = []
    
    if template_id == 'loi_the_all':
        # Return all 10 lời thề files that exist
        files = [os.path.join(audio_dir, f'loi_the_{i}.wav') for i in range(1, 11)]
    elif template_id.startswith('loi_the_'):
        num = template_id.split('_')[-1]
        files = [os.path.join(audio_dir, f'loi_the_{num}.wav')]
    elif template_id == 'dieu_all':
        # Return all 12 điều cấm files that exist
        files = [os.path.join(audio_dir, f'dieu_{i}.wav') for i in range(1, 13)]
    elif template_id.startswith('dieu_'):
        num = template_id.split('_')[-1]
        files = [os.path.join(audio_dir, f'dieu_{num}.wav')]
    elif template_id == 'song_vi_nhan_dan':
        files = [os.path.join(audio_dir, 'VÌ NHÂN DÂN QUÊN MÌNH.wav')]
    elif template_id == 'song_hanh_khuc_td8':
        files = [os.path.join(audio_dir, 'HÀNH KHÚC TRUNG ĐOÀN 8.wav')]
    
    # Filter to only return files that actually exist
    existing_files = [f for f in files if os.path.exists(f)]
    
    if files and not existing_files:
        logger.warning(f"Audio template files not found for {template_id}")
    
    return existing_files

def generate_audio(text):
    """Generate audio từ text và trả về audio bytes"""
    import asyncio
    
    try:
        if "tts_provider" not in st.session_state:
            st.session_state.tts_provider = initialize_tts()
        
        tts_provider = st.session_state.tts_provider
        if not tts_provider:
            return None
        
        # Create temp file for audio
        temp_file = os.path.join(tempfile.gettempdir(), f"streamlit_tts_{hash(text)}.wav")
        
        # Generate audio using async function
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(tts_provider.text_to_speak(text, temp_file))
            
            # Read audio bytes
            if result and os.path.exists(temp_file):
                with open(temp_file, 'rb') as f:
                    audio_bytes = f.read()
                # Clean up temp file
                try:
                    os.remove(temp_file)
                except:
                    pass
                return audio_bytes
            return None
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Error generating audio: {str(e)}")
        return None


@st.cache_resource(ttl=3600)  # Cache for 1 hour, then reinitialize
def initialize_rag_system():
    """Khởi tạo hệ thống RAG (chỉ chạy 1 lần)"""
    import asyncio
    
    try:
        config = load_config()
        rag_config = config.get("LLM", {}).get("RAG_OllamaLLM", {})
        
        # Khởi tạo LLM Provider
        llm_provider = LLMProvider(rag_config)
        
        # Initialize là async method, cần chạy với asyncio
        async def init_async():
            await llm_provider.initialize()
        
        # Chạy async initialization
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(init_async())
        finally:
            loop.close()
        
        return llm_provider, rag_config
    except Exception as e:
        st.error(f"❌ Lỗi khởi tạo hệ thống RAG: {str(e)}")
        import traceback
        st.error(f"Chi tiết lỗi:\n{traceback.format_exc()}")
        return None, None

def display_message(role, content, message_index=None):
    """Hiển thị tin nhắn với ChatGPT-style design và TTS audio"""
    if role == "user":
        st.markdown(f"""
        <div class="chat-message user-message">
            <div class="message-header">👤 Bạn</div>
            <div class="message-content">{content}</div>
        </div>
        """, unsafe_allow_html=True)
    else:
        # Display message
        st.markdown(f"""
        <div class="chat-message assistant-message">
            <div class="message-header">🤖 Trợ lí Ảo</div>
            <div class="message-content">{content}</div>
        </div>
        """, unsafe_allow_html=True)
        
        # Add audio player for assistant messages
        if message_index is not None:
            # Check for pre-recorded audio template (list of file paths)
            template_key = f"audio_template_{message_index}"
            if template_key in st.session_state:
                audio_files = st.session_state[template_key]
                
                # Show in expander to save space
                expander_label = "🎧 Danh sách phát audio" 
                if len(audio_files) > 1:
                    expander_label += f" ({len(audio_files)} phần)"
                
                with st.expander(expander_label, expanded=True):
                    for i, audio_file in enumerate(audio_files, 1):
                        if len(audio_files) > 1:
                            st.caption(f"Trích đoạn {i}: {os.path.basename(audio_file).replace('.wav', '').replace('_', ' ').capitalize()}")
                        try:
                            st.audio(audio_file, format='audio/wav')
                        except Exception as e:
                            st.error(f"Lỗi phát file: {str(e)}")
                return  # Skip TTS button if template exists

            audio_key = f"audio_{message_index}"
            
            # Create unique button key
            button_key = f"play_btn_{message_index}"
            
            # Only show play button if audio not generated yet
            if audio_key not in st.session_state:
                col1, col2 = st.columns([1, 10])
                with col1:
                    if st.button("🔊", key=button_key, help="Đọc câu trả lời"):
                        with st.spinner("Đang tạo audio..."):
                            audio_bytes = generate_audio(content)
                            if audio_bytes:
                                st.session_state[audio_key] = audio_bytes
                                st.rerun()
            else:
                # Show audio player
                st.audio(st.session_state[audio_key], format='audio/wav')

def main():
    # Header
    st.markdown("<h1>🤖 TRỢ LÍ ẢO CHÍNH TRỊ</h1>", unsafe_allow_html=True)
    
    # Khởi tạo session state
    if "messages" not in st.session_state:
        st.session_state.messages = []
    if "rag_initialized" not in st.session_state:
        st.session_state.rag_initialized = False
    
    # Sidebar
    with st.sidebar:
        st.markdown("### ⚙️ Cài đặt")
        
        # Khởi tạo RAG system
        if not st.session_state.rag_initialized:
            with st.spinner("🔄 Đang khởi tạo hệ thống RAG..."):
                llm_provider, rag_config = initialize_rag_system()
                if llm_provider:
                    st.session_state.llm_provider = llm_provider
                    st.session_state.rag_config = rag_config
                    st.session_state.rag_initialized = True
                    st.success("✅ Hệ thống RAG đã sẵn sàng!")
                else:
                    st.error("❌ Không thể khởi tạo RAG")
                    return
        
        # Hiển thị thông tin cấu hình
        if st.session_state.rag_initialized:
            st.markdown("---")
            st.markdown("### 📊 Thống kê hệ thống")
            
            rag_config = st.session_state.rag_config
            
            # Stats cards
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-title">Model</div>
                <div class="stats-value">{rag_config.get('model_name', 'N/A')}</div>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-title">Temperature</div>
                <div class="stats-value">{rag_config.get('temperature', 'N/A')}</div>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-title">Max Tokens</div>
                <div class="stats-value">{rag_config.get('max_tokens', 'N/A')}</div>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown(f"""
            <div class="stats-card">
                <div class="stats-title">Chunk Size</div>
                <div class="stats-value">{rag_config.get('chunk_size', 'N/A')}</div>
            </div>
            """, unsafe_allow_html=True)
            
            # Nút xóa lịch sử
            st.markdown("---")
            if st.button("🗑️ Xóa lịch sử chat", use_container_width=True):
                st.session_state.messages = []
                st.rerun()
            
            # Thông tin về RAG
            st.markdown("---")
            st.markdown("### ℹ️ Thông tin")
            st.info("""
            **RAG System Features:**
            - ✅ Hybrid Search
            - ✅ Semantic Caching
            - ✅ Cross-Encoder Reranking
            - ✅ Metadata Filtering
            - ✅ Context Optimization
            """)
            
            # Hướng dẫn sử dụng
            st.markdown("---")
            st.markdown("### 📖 Hướng dẫn")
            st.markdown("""
            1. Nhập câu hỏi vào ô chat
            2. Nhấn Enter hoặc nút gửi
            3. Hệ thống sẽ tìm kiếm trong tài liệu và trả lời
            4. Câu trả lời dựa trên tài liệu
            """)
    
    # Main chat area
    if not st.session_state.rag_initialized:
        st.warning("⚠️ Vui lòng đợi hệ thống khởi tạo...")
        return
    
    # Hiển thị lịch sử chat
    chat_container = st.container()
    with chat_container:
        for idx, message in enumerate(st.session_state.messages):
            if message["role"] == "assistant":
                display_message(message["role"], message["content"], message_index=idx)
            else:
                display_message(message["role"], message["content"])
    
    # Input area (luôn ở dưới cùng)
    st.markdown("---")
    
    # Tạo form để submit bằng Enter
    with st.form(key="chat_form", clear_on_submit=True):
        col1, col2 = st.columns([6, 1])
        
        with col1:
            user_input = st.text_input(
                "Nhập câu hỏi của bạn...",
                key="user_input",
                label_visibility="collapsed",
                placeholder="Ví dụ: Chính trị viên Đại đội 8 là ai?"
            )
        
        with col2:
            submit_button = st.form_submit_button("▶️")
    
    # Xử lý khi người dùng gửi tin nhắn
    # Xử lý câu hỏi của người dùng
    if user_input:
        # Check if this is an audio template query
        audio_template = detect_audio_template_query(user_input)
        
        # Thêm tin nhắn người dùng
        st.session_state.messages.append({
            "role": "user",
            "content": user_input
        })
        
        # Hiển thị tin nhắn người dùng ngay
        with chat_container:
            display_message("user", user_input)
        
        # Check if audio template query
        if audio_template:
            # Handle audio template response
            audio_files = get_audio_template_files(audio_template)
            
            if audio_files:  # Files already filtered by get_audio_template_files
                # Prepare response text
                if 'loi_the' in audio_template:
                    if '_all' in audio_template:
                        response_text = "🎵 **10 lời thề của chiến sĩ quân đội nhân dân Việt Nam**\n\nĐang phát audio..."
                    else:
                        num = audio_template.split('_')[-1]
                        response_text = f"🎵 **Lời thề số {num}**\n\nĐang phát audio..."
                elif 'dieu' in audio_template:
                    if '_all' in audio_template:
                        response_text = "🎵 **12 điều cấm của Quân đội nhân dân Việt Nam**\n\nĐang phát audio..."
                    else:
                        num = audio_template.split('_')[-1]
                        response_text = f"🎵 **Điều cấm số {num}**\n\nĐang phát audio..."
                elif 'song' in audio_template:
                    if 'vi_nhan_dan' in audio_template:
                        response_text = "🎵 **Bài hát: Vì nhân dân quên mình**\n\nĐang phát audio..."
                    elif 'hanh_khuc' in audio_template:
                        response_text = "🎵 **Bài hát: Hành khúc Trung đoàn 8**\n\nĐang phát audio..."
                else:
                    response_text = "🎵 Đang phát audio..."
                
                # Add assistant message
                st.session_state.messages.append({"role": "assistant", "content": response_text})
                
                # Cache audio FILE PATHS (not bytes) in session_state to save memory
                message_idx = len(st.session_state.messages) - 1
                audio_cache_key = f"audio_template_{message_idx}"
                
                # Store paths
                st.session_state[audio_cache_key] = audio_files
                
                # Render immediately using display_message (no rerun to avoid loop)
                with chat_container:
                    display_message("assistant", response_text, message_index=message_idx)
                
                return  # Exit to prevent RAG execution
            else:
                # Audio files not found, fall back to RAG
                st.warning("⚠️ Không tìm thấy file audio, sẽ trả lời bằng text...")
                # Continue to RAG below (don't return)
        
        # Call RAG (either fallback from audio or normal query)
        if True:  # Always process RAG after audio fallback
            # Tạo placeholder cho response
            with chat_container:
                response_placeholder = st.empty()
                response_placeholder.markdown("""
                <div class="chat-message assistant-message">
                    <div class="message-header">🤖 Trợ lí Ảo Chính Trị</div>
                    <div class="message-content">⏳ Đang suy nghĩ...</div>
                </div>
                """, unsafe_allow_html=True)
            
            # Gọi RAG system để lấy response
            llm_provider = st.session_state.llm_provider
            
            # Wrapper để xử lý async generator trong Streamlit
            import asyncio
            
            # Collect toàn bộ response từ async generator
            async def collect_streaming_response(message):
                """Async function to collect streaming response"""
                full_text = ""
                chunks = []
                
                async for chunk in llm_provider.chat_stream(message):
                    # Xử lý các dạng chunk khác nhau
                    if isinstance(chunk, str):
                        full_text += chunk
                        chunks.append(full_text)
                    elif isinstance(chunk, dict):
                        if chunk.get("type") == "text":
                            delta = chunk.get("content", "")
                            full_text += delta
                            chunks.append(full_text)
                        elif "text" in chunk:
                            full_text += chunk["text"]
                            chunks.append(full_text)
                    else:
                        # Fallback
                        full_text += str(chunk)
                        chunks.append(full_text)
                
                return chunks if chunks else [full_text]
            
            # Chạy async function và collect results
            try:
                # Tạo event loop mới để tránh conflict
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                try:
                    # Collect all chunks
                    all_chunks = loop.run_until_complete(collect_streaming_response(user_input))
                    
                    # Hiển thị streaming effect
                    full_response = ""
                    for i, chunk_text in enumerate(all_chunks):
                        full_response = chunk_text
                        
                        # Cập nhật UI với streaming cursor (chỉ update mỗi 3 chunks hoặc chunk cuối)
                        if i % 3 == 0 or i == len(all_chunks) - 1:
                            # Show cursor while streaming
                            cursor = "▊" if i < len(all_chunks) - 1 else ""
                            response_placeholder.markdown(f"""
                            <div class="chat-message assistant-message">
                                <div class="message-header">🤖 Trợ lí Ảo Chính Trị</div>
                                <div class="message-content">{full_response}{cursor}</div>
                            </div>
                            """, unsafe_allow_html=True)
                finally:
                    loop.close()
                
                # Hiển thị response hoàn chỉnh
                response_placeholder.markdown(f"""
                <div class="chat-message assistant-message">
                    <div class="message-header">🤖 Trợ lí Ảo Chính Trị</div>
                    <div class="message-content">{full_response}</div>
                </div>
                """, unsafe_allow_html=True)
                
                # Lưu vào lịch sử
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": full_response
                })
                
                # Removed st.rerun() to prevent infinite loop
                
            except Exception as e:
                error_msg = f"❌ Lỗi: {str(e)}"
                response_placeholder.markdown(f"""
                <div class="chat-message assistant-message">
                    <div class="message-header">🤖 Trợ lí Ảo Chính Trị</div>
                    <div class="message-content">{error_msg}</div>
                </div>
                """, unsafe_allow_html=True)
                
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": error_msg
                })

if __name__ == "__main__":
    main()
