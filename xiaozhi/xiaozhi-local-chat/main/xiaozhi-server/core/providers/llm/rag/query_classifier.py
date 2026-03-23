"""
OPTIMIZED Query Classifier for Advanced RAG Routing

Major improvements:
1. TF-IDF scoring for better category classification
2. Fuzzy keyword matching for typos/variants
3. Personnel query detection
4. Multi-category support
5. Classification caching
6. Confidence scores
"""

from enum import Enum
from typing import Dict, Optional, List, Tuple
import re
import logging
from functools import lru_cache
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


class QueryIntent(Enum):
    """Loại ý định của câu hỏi"""
    THONG_TIN = "thong_tin"      # Tìm thông tin cụ thể
    PERSONNEL = "personnel"       # Hỏi về cán bộ, nhân sự (NEW)
    TRO_CHUYEN = "tro_chuyen"    # Trò chuyện chung
    TOM_TAT = "tom_tat"          # Tóm tắt tài liệu
    TEMPORAL = "temporal"         # Lọc theo thời gian


class QueryClassifier:
    """
    OPTIMIZED multi-level query classifier
    
    Flow:
    1. Classify Intent → PERSONNEL/THONG_TIN/TOM_TAT/TEMPORAL/TRO_CHUYEN
    2. For PERSONNEL/THONG_TIN → Classify Category(s)
    3. Extract Temporal info
    4. Return with confidence scores
    """
    
    # ========================================================================
    # CATEGORY DEFINITIONS (Externalized for easy maintenance)
    # ========================================================================
    CATEGORIES = {
        "chinh_tri": {
            "primary_keywords": [
                # Core political work
                "chủ đề", "phong trào", "thi đua", "lãnh đạo", "chỉ đạo",
                "đảng", "đảng ủy", "chi bộ", "đảng viên", "sinh hoạt đảng",
                
                # Political education
                "chính trị", "tư tưởng", "quản lý tư tưởng", 
                "giáo dục chính trị", "bồi dưỡng chính trị",
                
                # Regulations
                "quy chế 775", "quy chế 14", "quy chế 57", "quy chế 58",
                "nghị định 123", "thông tư 37", "quy chế 438",
                
                # Standards
                "mẫu mực", "tiêu chuẩn mẫu mực", "tấm gương",
                "dân chủ", "kỷ cương", "đoàn kết",
                
                # Spirit
                "7 dám", "bảy dám", "3 không", "ba không",
                "3 thực chất", "ba thực chất",
                
                # Tradition & History - HIGH PRIORITY for routing
                "truyền thống", "ngày truyền thống", "ngày thành lập",
            ],
            
            "secondary_keywords": [
                # Activities
                "học tập chính trị", "sáng thứ hai", "ngày chính trị",
                "sinh hoạt", "hội nghị",
                
                # Documents
                "nghị quyết", "kết luận", "chỉ thị", "quyết định",
                
                # Personnel (shared)
                "chính ủy", "chính trị viên", "cán bộ",
            ],
            
            "weight": 1.6,  # HIGHER than to_chuc to prioritize tradition queries
            "description": "Công tác Đảng, công tác chính trị"
        },
        
        "quan_su": {
            "primary_keywords": [
                # Training
                "huấn luyện", "chiến đấu", "sẵn sàng chiến đấu",
                "diễn tập", "hội thao", "hội thi", "sát hạch",
                
                # Command
                "mệnh lệnh", "công tác", "mệnh lệnh công tác",
                
                # Combat readiness
                "phương án", "phương án a", "sscđ",
                "nhiệm vụ", "nhiệm vụ sscđ", "nhiệm vụ chiến đấu",
                
                # Organization
                "quân số", "biên chế", "tổ chức",
                
                # Daily work
                "23 công việc", "hai mươi ba công việc", "23 đầu công việc",
                "9 đầu việc", "chín đầu việc", "đầu việc sáng thứ hai",
                "11 việc", "mười một việc",
            ],
            
            "secondary_keywords": [
                "sáng thứ hai", "bảo vệ", "phòng thủ", 
                "tác chiến", "cơ động",
                
                # Personnel (shared)
                "trung đoàn trưởng", "đại đội trưởng", "cán bộ",
            ],
            
            "weight": 1.0,
            "description": "Công tác quân sự, huấn luyện"
        },
        
        "hau_can": {
            "primary_keywords": [
                # Food
                "bánh chưng", "tiêu chuẩn ăn", "tiêu chuẩn ăn thêm",
                "suất ăn", "ăn uống",
                
                # Logistics
                "hậu cần", "kho tàng", "vật tư", "quân trang",
                
                # Standards
                "định mức", "định mức điện", "định mức nước",
                "tiêu chuẩn", "chế độ",
                
                # Disaster prevention
                "phòng chống", "thiên tai", "pctt", "tkcn",
                "tìm kiếm cứu nạn",
                
                # Principles
                "3 trước", "ba trước", "4 tại chỗ", "bốn tại chỗ",
            ],
            
            "secondary_keywords": [
                "quản lý", "bảo quản", "khai thác",
            ],
            
            "weight": 1.0,
            "description": "Công tác hậu cần"
        },
        
        "ky_thuat": {
            "primary_keywords": [
                # Weapons
                "vũ khí", "đạn", "khí tài", "vkđ",
                
                # Regulations
                "quy chế 33", "chỉ thị 33", "chỉ thị 15",
                
                # Technical work
                "kỹ thuật", "trang bị", "vật tư kỹ thuật",
                "bảo dưỡng", "sửa chữa", "bảo quản",
                
                # Safety
                "an toàn", "an toàn vkđ", "phòng cháy chữa cháy",
            ],
            
            "secondary_keywords": [
                "quản lý vũ khí", "quản lý đạn",
                "cấp phát", "thu hồi", "thanh lý",
            ],
            
            "weight": 1.0,
            "description": "Công tác kỹ thuật"
        },
        
        "to_chuc": {
            "primary_keywords": [
                # Organizational structure
                "tổ chức", "biên chế", "quân số", "cơ cấu tổ chức",
                "bộ tư lệnh", "thủ trưởng", "chỉ huy",
                
                # High-level Ministry positions - CRITICAL
                "bộ trưởng bộ quốc phòng", "bộ trưởng",
                "thứ trưởng bộ quốc phòng", "thứ trưởng",
                "chủ nhiệm tổng cục", "tổng cục chính trị",
                "tổng tham mưu trưởng", "tham mưu trưởng quân đội",
                
                # Military levels - HIGHEST PRIORITY for routing
                "quân khu", "sư đoàn", "trung đoàn", "tiểu đoàn", "đại đội",
                
                # Leadership positions
                "tư lệnh", "chính ủy", "phó tư lệnh", "phó chính ủy",
                "trung đoàn trưởng", "phó trung đoàn trưởng",
                "sư đoàn trưởng", "phó sư đoàn trưởng",
                "tiểu đoàn trưởng", "phó tiểu đoàn trưởng",
                "đại đội trưởng", "phó đại đội trưởng",
                "tham mưu trưởng", "chính trị viên", "chính trị viên phó",
                
                # Personnel information
                "cán bộ", "nhân sự", "quản lý cán bộ",
                "họ tên", "chức vụ", "cấp bậc",
            ],
            
            "secondary_keywords": [
                # General structure
                "đơn vị", "bộ phận", "phòng ban",
                # Names - pattern matching in _is_personnel_query()
                "ai", "tên", "là ai",
            ],
            
            "weight": 1.5,  # HIGHER weight for organizational queries
            "description": "Tổ chức đơn vị, cán bộ, nhân sự"
        }
    }
    
    # ========================================================================
    # PERSONNEL PATTERNS (New - for detecting personnel queries)
    # ========================================================================
    PERSONNEL_PATTERNS = [
        # Direct questions
        r'\b(ai|tên)\s+(là|làm)\s+',
        r'\b(là|làm)\s+(ai|gì)\b',
        
        # Roles
        r'\bchính ủy\b.*\b(là ai|tên|ai là)\b',
        r'\btrung đoàn trưởng\b.*\b(là ai|tên|ai là)\b',
        r'\b(đại đội|tiểu đội)\s+trưởng\b.*\b(là ai|tên)\b',
        r'\bchính trị viên\b.*\b(là ai|tên)\b',
        
        # Vietnamese names (Last First Middle pattern)
        r'\b[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰYỲÝỶỸỴ]'
        r'[a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệiìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]+'
        r'(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰYỲÝỶỸỴ]'
        r'[a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệiìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]+){1,3}\b',
        
        # Generic personnel queries
        r'\bcán bộ\b.*\b(nào|gì|ai)\b',
        r'\btìm.*\b(cán bộ|chính ủy|trung đoàn trưởng)\b',
    ]
    
    def __init__(self):
        """Initialize with precompiled patterns"""
        # Compile personnel patterns for performance
        self._personnel_patterns = [
            re.compile(pattern, re.IGNORECASE) 
            for pattern in self.PERSONNEL_PATTERNS
        ]
        
        # Build reverse index: keyword -> categories
        self._keyword_to_categories = {}
        for category, info in self.CATEGORIES.items():
            all_keywords = info['primary_keywords'] + info.get('secondary_keywords', [])
            for kw in all_keywords:
                if kw not in self._keyword_to_categories:
                    self._keyword_to_categories[kw] = []
                self._keyword_to_categories[kw].append(category)
        
        logger.info(f"QueryClassifier initialized with {len(self.CATEGORIES)} categories")
    
    @lru_cache(maxsize=500)
    def classify_full(self, query: str) -> Dict:
        """
        Full classification with caching
        
        Returns:
            {
                'intent': QueryIntent,
                'category': str | None,          # Best category
                'categories': List[str],         # All matching categories
                'confidence': float,              # Confidence score
                'temporal': Dict | None,
                'is_personnel': bool              # NEW
            }
        """
        result = {
            'intent': self._classify_intent(query),
            'category': None,
            'categories': [],
            'confidence': 0.0,
            'temporal': None,
            'is_personnel': False
        }
        
        # Check for personnel query first (highest priority)
        if self._is_personnel_query(query):
            result['intent'] = QueryIntent.PERSONNEL
            result['is_personnel'] = True
        
        # Classify category for relevant intents
        if result['intent'] in [QueryIntent.THONG_TIN, QueryIntent.TEMPORAL, QueryIntent.PERSONNEL]:
            categories, confidence = self._classify_category_scored(query)
            result['categories'] = categories
            result['category'] = categories[0] if categories else None
            result['confidence'] = confidence
        
        # Extract temporal info
        result['temporal'] = self._extract_temporal(query)
        
        logger.debug(f"Classification: {result}")
        
        return result
    
    def _classify_intent(self, query: str) -> QueryIntent:
        """Classify query intent"""
        query_lower = query.lower()
        
        # Summary keywords
        if any(kw in query_lower for kw in [
            "tóm tắt", "tổng hợp", "liệt kê tất cả", 
            "đọc toàn bộ", "toàn bộ tài liệu", "tất cả"
        ]):
            return QueryIntent.TOM_TAT
        
        # Temporal keywords
        if self._has_temporal_reference(query_lower):
            return QueryIntent.TEMPORAL
        
        # Conversational keywords
        if any(kw in query_lower for kw in [
            "nghĩ sao", "ý kiến", "bạn nghĩ",
            "làm thế nào", "cách nào", "giải thích"
        ]):
            return QueryIntent.TRO_CHUYEN
        
        # Default: Information seeking
        return QueryIntent.THONG_TIN
    
    def _is_personnel_query(self, query: str) -> bool:
        """
        Detect if query is about personnel/people (NEW)
        
        Examples:
        - "Chính ủy trung đoàn là ai?"
        - "Ai là trung đoàn trưởng?"
        - "Tìm thông tin về Trần Văn Tới"
        """
        # Check against precompiled patterns
        for pattern in self._personnel_patterns:
            if pattern.search(query):
                logger.debug(f"Personnel query detected: {pattern.pattern[:50]}")
                return True
        
        # Additional keyword check
        personnel_keywords = [
            "ai là", "là ai", "tên", "cán bộ", 
            "chính ủy", "trung đoàn trưởng", "đại đội trưởng",
            "chính trị viên"
        ]
        
        query_lower = query.lower()
        if sum(kw in query_lower for kw in personnel_keywords) >= 2:
            logger.debug("Personnel query detected: multiple keywords")
            return True
        
        return False
    
    def _classify_category_scored(self, query: str) -> Tuple[List[str], float]:
        """
        Classify category with TF-IDF-like scoring
        Returns multiple categories if score is close
        
        Returns:
            (categories, confidence_score)
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        category_scores = {}
        
        for category, info in self.CATEGORIES.items():
            score = 0.0
            
            # Primary keywords (higher weight)
            for kw in info['primary_keywords']:
                if kw in query_lower:
                    # Exact match
                    score += 2.0
                else:
                    # Fuzzy match (for typos)
                    for word in query_words:
                        if len(word) >= 4 and len(kw) >= 4:
                            similarity = self._fuzzy_similarity(word, kw)
                            if similarity > 0.85:
                                score += 1.5
            
            # Secondary keywords (lower weight)
            for kw in info.get('secondary_keywords', []):
                if kw in query_lower:
                    score += 1.0
            
            # Apply category weight
            score *= info.get('weight', 1.0)
            
            if score > 0:
                category_scores[category] = score
        
        if not category_scores:
            return [], 0.0
        
        # Get categories sorted by score
        sorted_categories = sorted(
            category_scores.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        # Return top category, or multiple if scores are close
        top_score = sorted_categories[0][1]
        threshold = top_score * 0.7  # Within 70% of top score
        
        result_categories = [
            cat for cat, score in sorted_categories 
            if score >= threshold
        ]
        
        # Confidence: normalize to [0, 1]
        max_possible_score = 10.0  # Rough estimate
        confidence = min(top_score / max_possible_score, 1.0)
        
        logger.info(
            f"Categories: {result_categories} "
            f"(scores: {[category_scores[c] for c in result_categories]}, "
            f"confidence: {confidence:.2f})"
        )
        
        return result_categories, confidence
    
    @staticmethod
    def _fuzzy_similarity(word1: str, word2: str) -> float:
        """Calculate fuzzy similarity between two words"""
        return SequenceMatcher(None, word1, word2).ratio()
    
    def _extract_temporal(self, query: str) -> Optional[Dict]:
        """Extract temporal information from query"""
        query_lower = query.lower()
        temporal_info = {}
        
        # Month (1-12)
        month_match = re.search(r'tháng\s*(\d{1,2})', query_lower)
        if month_match:
            month = int(month_match.group(1))
            if 1 <= month <= 12:
                temporal_info['month'] = month
        
        # Quarter (1-4) → Convert to months
        quarter_match = re.search(r'quý\s*(\d)', query_lower)
        if quarter_match:
            quarter = int(quarter_match.group(1))
            if 1 <= quarter <= 4:
                temporal_info['quarter'] = quarter
                temporal_info['months'] = [
                    (quarter - 1) * 3 + 1,
                    (quarter - 1) * 3 + 2,
                    (quarter - 1) * 3 + 3
                ]
        
        # Year
        year_match = re.search(r'năm\s*(\d{4})', query_lower)
        if year_match:
            temporal_info['year'] = int(year_match.group(1))
        elif 'năm nay' in query_lower or 'năm hiện tại' in query_lower:
            temporal_info['year'] = 2025
        
        return temporal_info if temporal_info else None
    
    def _has_temporal_reference(self, query: str) -> bool:
        """Check if query has temporal reference"""
        temporal_keywords = [
            'tháng', 'quý', 'năm', 
            'trong tháng', 'trong quý', 'trong năm',
            'giai đoạn', 'thời gian', 'khi nào'
        ]
        
        return any(kw in query for kw in temporal_keywords)
    
    def get_category_description(self, category: str) -> str:
        """Get description for a category"""
        return self.CATEGORIES.get(category, {}).get('description', 'Unknown category')


# ============================================================================
# TESTING
# ============================================================================
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    classifier = QueryClassifier()
    
    print("="*60)
    print("OPTIMIZED QUERY CLASSIFIER TEST")
    print("="*60)
    
    test_queries = [
        # Personnel queries (NEW)
        ("Chính ủy trung đoàn là ai?", "Should detect PERSONNEL intent"),
        ("Ai là trung đoàn trưởng?", "Should detect PERSONNEL intent"),
        ("Tìm thông tin về Trần Văn Tới", "Should detect PERSONNEL + name"),
        ("Cán bộ chủ chốt gồm những ai?", "Should detect PERSONNEL"),
        
        # Category classification
        ("Chủ đề lãnh đạo năm 2025 là gì?", "Should be chinh_tri + temporal"),
        ("Phong trào thi đua tháng 8", "Should be chinh_tri + temporal"),
        ("23 công việc trong ngày là gì?", "Should be quan_su"),
        ("Tiêu chuẩn bánh chưng Tết", "Should be hau_can"),
        ("Quy chế 33 về vũ khí", "Should be ky_thuat"),
        
        # Summary
        ("Tóm tắt tài liệu chính trị", "Should detect TOM_TAT"),
        
        # Conversational
        ("Bạn nghĩ sao về chủ đề này?", "Should detect TRO_CHUYEN"),
        
        # Multi-category (edge case)
        ("Cán bộ chủ chốt và công tác huấn luyện", "Should detect multiple categories"),
        
        # Typo handling
        ("chủ dề lãnh đao", "Should still match chinh_tri with fuzzy"),
    ]
    
    for query, expected in test_queries:
        print(f"\n{'='*60}")
        print(f"Query: {query}")
        print(f"Expected: {expected}")
        print(f"{'-'*60}")
        
        result = classifier.classify_full(query)
        
        print(f"Intent: {result['intent'].value}")
        print(f"Category: {result['category']}")
        if len(result['categories']) > 1:
            print(f"Other categories: {result['categories'][1:]}")
        print(f"Confidence: {result['confidence']:.2f}")
        print(f"Is personnel: {result['is_personnel']}")
        if result['temporal']:
            print(f"Temporal: {result['temporal']}")
    
    print(f"\n{'='*60}")
    print("CACHE TEST")
    print(f"{'='*60}")
    
    import time
    
    # First call (cache miss)
    start = time.time()
    classifier.classify_full("Chính ủy trung đoàn là ai?")
    time1 = (time.time() - start) * 1000
    
    # Second call (cache hit)
    start = time.time()
    classifier.classify_full("Chính ủy trung đoàn là ai?")
    time2 = (time.time() - start) * 1000
    
    print(f"First call: {time1:.2f}ms")
    print(f"Second call: {time2:.2f}ms (cached)")
    print(f"Speedup: {time1/time2:.1f}x")