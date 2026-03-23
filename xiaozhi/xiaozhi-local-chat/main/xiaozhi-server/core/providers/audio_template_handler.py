"""
Audio Template Handler
Detect và play pre-recorded audio cho special queries
"""
import re
from pathlib import Path
from typing import Optional, List, Tuple
import logging

logger = logging.getLogger(__name__)


class AudioTemplateHandler:
    """Handle pre-recorded audio templates"""
    
    def __init__(self, templates_dir: str = "./data/audio_templates"):
        self.templates_dir = Path(templates_dir)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        
        # Vietnamese number words mapping
        self.number_words = {
            'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5,
            'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10
        }
        
        # Query patterns
        self.patterns = {
            'all_loi_the': [
                r'10 lời thề',
                r'mười lời thề',
                r'tất cả.*lời thề',
            ],
            'all_12_dieu': [
                r'12 điều',
                r'mười hai điều',
                r'12 điều kỷ luật',
                r'mười hai điều kỷ luật',
            ],
            'song_vi_nhan_dan': [
                r'bài.*vì nhân dân',
                r'hát.*vì nhân dân',
                r'vì nhân dân quên mình',
                r'bài hát vì nhân dân',
            ],
            'song_hanh_khuc_td8': [
                r'hành khúc trung đoàn 8',
                r'bài.*hành khúc.*trung đoàn',
                r'hát.*hành khúc.*8',
                r'bài hát trung đoàn 8',
            ],
            'single_loi_the': [
                r'lời thề số (\d+)',
                r'lời thề (\d+)',
                r'lời thề số (một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)',
                r'lời thề (một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)',
            ],
            'single_12_dieu': [
                r'điều (?:số )?(\d+)',
                r'điều (một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười|mười một|mười hai)',
            ],
            'range_loi_the': [
                r'lời thề (?:số )?(\d+) (?:đến|tới) (?:số )?(\d+)',
            ]
        }
        
        # Extended number words for 12 items
        self.number_words['mười một'] = 11
        self.number_words['mười hai'] = 12
    
    def detect_audio_template_query(self, query: str) -> Optional[dict]:
        """
        Detect if query matches an audio template pattern
        
        Returns:
            {
                'type': 'all_loi_the' | 'single_loi_the' | 'range_loi_the',
                'files': ['loi_the_1.wav', ...],
                'numbers': [1, 2, 3, ...]
            }
            or None if no match
        """
        query_lower = query.lower()
        
        # Check for "10 lời thề" (all)
        for pattern in self.patterns['all_loi_the']:
            if re.search(pattern, query_lower):
                return {
                    'type': 'all_loi_the',
                    'files': [f'loi_the_{i}.wav' for i in range(1, 11)],
                    'numbers': list(range(1, 11))
                }
        
        # Check for range "lời thề 3 đến 5"
        for pattern in self.patterns['range_loi_the']:
            match = re.search(pattern, query_lower)
            if match:
                start = int(match.group(1))
                end = int(match.group(2))
                
                if 1 <= start <= 10 and 1 <= end <= 10 and start <= end:
                    numbers = list(range(start, end + 1))
                    return {
                        'type': 'range_loi_the',
                        'files': [f'loi_the_{i}.wav' for i in numbers],
                        'numbers': numbers
                    }
        
        # Check for single "lời thề số 3" or "lời thề số hai"
        for pattern in self.patterns['single_loi_the']:
            match = re.search(pattern, query_lower)
            if match:
                num_str = match.group(1)
                
                # Convert Vietnamese number word to digit
                if num_str in self.number_words:
                    num = self.number_words[num_str]
                else:
                    try:
                        num = int(num_str)
                    except ValueError:
                        continue
                
                if 1 <= num <= 10:
                    return {
                        'type': 'single_loi_the',
                        'files': [f'loi_the_{num}.wav'],
                        'numbers': [num]
                    }
        
        # === NEW: Check for "12 điều" (all) ===
        for pattern in self.patterns['all_12_dieu']:
            if re.search(pattern, query_lower):
                return {
                    'type': 'all_12_dieu',
                    'files': [f'dieu_{i}.wav' for i in range(1, 13)],
                    'numbers': list(range(1, 13))
                }
        
        # === NEW: Check for song "Vì nhân dân quên mình" ===
        for pattern in self.patterns['song_vi_nhan_dan']:
            if re.search(pattern, query_lower):
                return {
                    'type': 'song_vi_nhan_dan',
                    'files': ['VÌ NHÂN DÂN QUÊN MÌNH.wav'],
                    'numbers': [1]
                }
        
        # === NEW: Check for song "Hành khúc trung đoàn 8" ===
        for pattern in self.patterns['song_hanh_khuc_td8']:
            if re.search(pattern, query_lower):
                return {
                    'type': 'song_hanh_khuc_td8',
                    'files': ['HÀNH KHÚC TRUNG ĐOÀN 8.wav'],
                    'numbers': [1]
                }
        
        # === NEW: Check for single "điều số 3" or "điều hai" ===
        for pattern in self.patterns['single_12_dieu']:
            match = re.search(pattern, query_lower)
            if match:
                num_str = match.group(1)
                
                # Convert Vietnamese number word to digit
                if num_str in self.number_words:
                    num = self.number_words[num_str]
                else:
                    try:
                        num = int(num_str)
                    except ValueError:
                        continue
                
                if 1 <= num <= 12:
                    return {
                        'type': 'single_12_dieu',
                        'files': [f'dieu_{num}.wav'],
                        'numbers': [num]
                    }
        
        return None
    
    def get_audio_files(self, template_info: dict) -> List[Path]:
        """
        Get full paths to audio files
        
        Args:
            template_info: Dict from detect_audio_template_query()
            
        Returns:
            List of absolute file paths
        """
        files = []
        for filename in template_info['files']:
            filepath = self.templates_dir / filename
            if filepath.exists():
                files.append(filepath)
            else:
                logger.warning(f"Audio template not found: {filename}")
        
        return files
    
    def verify_templates_exist(self) -> Tuple[int, int]:
        """
        Verify audio templates exist
        
        Returns:
            (found, total) tuple
        """
        total = 10
        found = 0
        
        for i in range(1, 11):
            filepath = self.templates_dir / f"loi_the_{i}.wav"
            if filepath.exists():
                found += 1
        
        return found, total


# Global instance
_handler = None

def get_audio_template_handler() -> AudioTemplateHandler:
    """Get singleton audio template handler"""
    global _handler
    if _handler is None:
        _handler = AudioTemplateHandler()
    return _handler


# For testing
if __name__ == "__main__":
    handler = AudioTemplateHandler()
    
    test_queries = [
        "10 lời thề trong quân đội là gì?",
        "mười lời thề",
        "lời thề số 3 là gì?",
        "lời thề 5",
        "lời thề số 2 đến 4",
        "lời thề 7 tới 9",
        "Trung đoàn trưởng là ai?",  # Should not match
    ]
    
    print("=" * 70)
    print("Testing Audio Template Detection")
    print("=" * 70)
    
    for query in test_queries:
        result = handler.detect_audio_template_query(query)
        if result:
            print(f"\n✅ Query: '{query}'")
            print(f"   Type: {result['type']}")
            print(f"   Numbers: {result['numbers']}")
            print(f"   Files: {result['files']}")
        else:
            print(f"\n❌ Query: '{query}' - No match")
    
    # Verify templates
    print("\n" + "=" * 70)
    found, total = handler.verify_templates_exist()
    print(f"Audio templates: {found}/{total} found")
    print("=" * 70)
