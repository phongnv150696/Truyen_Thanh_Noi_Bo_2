"""
Question Detection Module
Detect if user input is a question or just a statement/keyword
"""
import re
from typing import Optional


# Vietnamese question words
QUESTION_WORDS = [
    # Who/What/When/Where/How
    "ai", "gì", "nào", "đâu", "sao", "thế nào", "như thế nào",
    "khi nào", "ở đâu", "bao nhiêu", "mấy", "bao lâu",
    
    # Why
    "tại sao", "vì sao", "tại mà", "cớ sao",
    
    # Yes/no questions
    "có phải", "đúng không", "phải không", "có không",
    "được không", "à", "ư", "hả", "hử",
    
    # Which/What kind
    "loại nào", "cái nào", "người nào", "chỗ nào",
]


def is_question(text: str) -> bool:
    """
    Detect if text is a question
    
    Args:
        text: User input text
        
    Returns:
        True if text appears to be a question, False otherwise
    """
    if not text:
        return False
    
    text_lower = text.lower().strip()
    
    # Check for question mark
    if '?' in text:
        return True
    
    # Check for question words at the beginning or anywhere in text
    for qword in QUESTION_WORDS:
        # Word boundary check to avoid false positives
        # e.g., "tại" shouldn't match "tại sao"
        pattern = r'\b' + re.escape(qword) + r'\b'
        if re.search(pattern, text_lower):
            return True
    
    return False


def extract_keywords(text: str) -> str:
    """
    Extract main keywords from non-question text
    Remove common stopwords but keep meaningful content
    
    Args:
        text: User input text
        
    Returns:
        Cleaned keyword string
    """
    # Simple stopword removal (can be enhanced)
    stopwords = ['là', 'của', 'trong', 'ở', 'về', 'cho', 'với', 'và', 'hoặc']
    
    words = text.lower().split()
    keywords = [w for w in words if w not in stopwords]
    
    return ' '.join(keywords)


# For testing
if __name__ == "__main__":
    test_cases = [
        ("Trung đoàn 8", False),
        ("Chính trị", False),
        ("Đại hội 14", False),
        ("Chính ủy trung đoàn là ai?", True),
        ("Chính ủy trung đoàn là ai", True),  # Has "ai"
        ("Ai là chính ủy", True),
        ("Ngày truyền thống là khi nào?", True),
        ("Chủ đề năm 2026 là gì", True),
        ("Bộ trưởng Bộ Quốc phòng", False),
        ("Có phải chính ủy là Trần Văn Tới không?", True),
    ]
    
    print("=== Testing Question Detection ===")
    for text, expected in test_cases:
        result = is_question(text)
        status = "✅" if result == expected else "❌"
        print(f"{status} '{text}' → {result} (expected {expected})")
