"""
Audio Template Handler
Intercepts known queries and serves pre-recorded audio files instead of TTS.
"""
import os
import re
from typing import Optional, List, Dict
from config.logger import setup_logging

logger = setup_logging()

# Get base directory for audio templates
_current_dir = os.path.dirname(os.path.abspath(__file__))
_server_root = os.path.abspath(os.path.join(_current_dir, '..', '..', '..', '..'))
AUDIO_TEMPLATES_DIR = os.path.join(_server_root, 'data', 'audio_templates')


# Audio template configurations
AUDIO_TEMPLATE_MAPPING: Dict[str, Dict] = {
    '10_loi_the': {
        'patterns': [
            r'10\s*lời\s*thề',
            r'mười\s*lời\s*thề',
            r'đọc.*lời\s*thề',
        ],
        'files': [f'loi_the_{i}.wav' for i in range(1, 11)],  # loi_the_1.wav -> loi_the_10.wav
        'intro_text': 'Sau đây là 10 lời thề danh dự của quân nhân:',
        'item_prefix': 'Lời thề số',
    },
    '12_dieu_ky_luat': {
        'patterns': [
            r'12\s*điều\s*kỷ\s*luật',
            r'mười\s*hai\s*điều\s*kỷ\s*luật',
            r'đọc.*điều\s*kỷ\s*luật',
        ],
        'files': [f'dieu_{i}.wav' for i in range(1, 13)],  # dieu_1.wav -> dieu_12.wav
        'intro_text': 'Sau đây là 12 điều kỷ luật:',
        'item_prefix': 'Điều số',
    },
    '10_chuc_trach': {
        'patterns': [
            r'10\s*chức\s*trách',
            r'mười\s*chức\s*trách',
            r'chức\s*trách\s*quân\s*nhân.*(?!người\s*gác)',  # Match "quân nhân" but NOT "người gác"
            r'đọc.*10.*chức\s*trách',
            r'đọc.*chức\s*trách.*quân\s*nhân',
        ],
        'files': [f'chuc_trach_{i}.wav' for i in range(1, 11)],  # chuc_trach_1.wav -> chuc_trach_10.wav
        'intro_text': 'Sau đây là 10 chức trách quân nhân:',
        'item_prefix': 'Chức trách số',
    },
    'vi_nhan_dan_quen_minh': {
        'patterns': [
            r'vì\s*nhân\s*dân\s*quên\s*mình',
            r'bài\s*hát\s*vì\s*nhân\s*dân',
            r'phát.*vì\s*nhân\s*dân',
            r'hát.*vì\s*nhân\s*dân',
        ],
        'files': ['VÌ NHÂN DÂN QUÊN MÌNH.wav'],  # Single file
        'intro_text': None,  # No intro for songs
        'item_prefix': None,  # Single file, no numbering
    },
    'hanh_khuc_td8': {
        'patterns': [
            r'hành\s*khúc\s*trung\s*đoàn\s*8',
            r'hành\s*khúc\s*trung\s*đoàn\s*tám',  # Vietnamese number
            r'hành\s*khúc\s*td\s*8',
            r'bài\s*hát\s*trung\s*đoàn\s*8',
            r'bài\s*hát\s*trung\s*đoàn\s*tám',  # Vietnamese number
            r'phát.*hành\s*khúc',
            r'truyền\s*thống\s*trung\s*đoàn\s*8',
            r'truyền\s*thống\s*trung\s*đoàn\s*tám',  # Vietnamese number
            r'bài\s*hát\s*truyền\s*thống',  # Common phrase
            r'phát.*truyền\s*thống.*trung\s*đoàn',  # Flexible match
        ],
        'files': ['HÀNH KHÚC TRUNG ĐOÀN 8.wav'],  # Single file
        'intro_text': None,  # No intro for songs
        'item_prefix': None,  # Single file, no numbering
    },
    'chi_thi_33': {
        'patterns': [
            r'chỉ\s*thị\s*33',
            r'chỉ\s*thị\s*ba\s*mươi\s*ba',
            r'quản\s*lý.*vũ\s*khí.*đạn.*sẵn\s*sàng',
            r'nội\s*dung.*chỉ\s*thị\s*33',
        ],
        'files': ['chi_thi_33.wav'],  # Single file
        'intro_text': None,
        'item_prefix': None,
    },
    'chuc_trach_nguoi_gac': {
        'patterns': [
            r'chức\s*trách\s*người\s*gác',
            r'người\s*gác.*chức\s*trách',
            r'nhiệm\s*vụ\s*người\s*gác',
        ],
        'files': ['chuc_trach_nguoi_gac.wav'],  # Single file
        'intro_text': None,
        'item_prefix': None,
    },
}


def is_audio_template_query(query: str) -> Optional[str]:
    """
    Check if query matches a known audio template.
    
    Args:
        query: User query string
        
    Returns:
        template_name if matched, None otherwise
    """
    if not query:
        return None
        
    query_lower = query.lower().strip()
    
    for template_name, config in AUDIO_TEMPLATE_MAPPING.items():
        for pattern in config['patterns']:
            if re.search(pattern, query_lower, re.IGNORECASE):
                logger.bind(tag=__name__).info(
                    f"🎵 Audio template matched: '{template_name}' for query: '{query}'"
                )
                return template_name
    
    return None


def get_audio_template_files(template_name: str) -> List[str]:
    """
    Get list of audio file paths for a template.
    
    Args:
        template_name: Name of the template (e.g., '10_loi_the')
        
    Returns:
        List of absolute file paths, or empty list if template not found
    """
    if template_name not in AUDIO_TEMPLATE_MAPPING:
        logger.bind(tag=__name__).warning(f"Unknown template: {template_name}")
        return []
    
    config = AUDIO_TEMPLATE_MAPPING[template_name]
    files = config.get('files', [])
    
    # Build absolute paths and verify files exist
    valid_files = []
    for filename in files:
        filepath = os.path.join(AUDIO_TEMPLATES_DIR, filename)
        if os.path.exists(filepath):
            valid_files.append(filepath)
        else:
            logger.bind(tag=__name__).warning(f"Audio file not found: {filepath}")
    
    if not valid_files:
        logger.bind(tag=__name__).error(
            f"No valid audio files found for template '{template_name}' "
            f"in directory: {AUDIO_TEMPLATES_DIR}"
        )
        return []
    
    logger.bind(tag=__name__).info(
        f"📂 Found {len(valid_files)}/{len(files)} audio files for '{template_name}'"
    )
    
    return valid_files


def get_template_intro_text(template_name: str) -> Optional[str]:
    """Get the intro text for a template (to be spoken via TTS before audio files)"""
    config = AUDIO_TEMPLATE_MAPPING.get(template_name)
    if config:
        return config.get('intro_text')
    return None


def get_template_item_prefix(template_name: str) -> str:
    """Get the item prefix for a template (e.g., 'Lời thề số')"""
    config = AUDIO_TEMPLATE_MAPPING.get(template_name, {})
    return config.get('item_prefix', 'Mục số')


# For testing
if __name__ == "__main__":
    print("=== Audio Template Handler Test ===")
    print(f"Templates dir: {AUDIO_TEMPLATES_DIR}")
    
    test_queries = [
        "Đọc cho tôi 10 lời thề",
        "mười lời thề là gì",
        "12 điều kỷ luật trong quân đội",
        "mười hai điều kỷ luật",
        "Trung đoàn trưởng là ai",  # Should NOT match
    ]
    
    for q in test_queries:
        result = is_audio_template_query(q)
        print(f"Query: '{q}' -> {result}")
        
        if result:
            files = get_audio_template_files(result)
            print(f"  Files: {len(files)} found")
