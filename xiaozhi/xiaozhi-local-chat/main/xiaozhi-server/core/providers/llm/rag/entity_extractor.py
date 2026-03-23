"""
OPTIMIZED Entity Extractor for Vietnamese Military Documents

Major improvements:
1. Pre-compiled regex for performance
2. Text normalization for Vietnamese
3. Abbreviation handling
4. Simplified personnel pattern
5. Caching for repeated extractions
"""

import re
import unicodedata
from typing import Dict, List, Set, Optional
from functools import lru_cache


def normalize_vietnamese(text: str) -> str:
    """
    Normalize Vietnamese text for better matching
    Handles different diacritic representations
    """
    # NFD normalization splits base + diacritic
    # NFC normalization combines them
    # Use NFC for consistency
    return unicodedata.normalize('NFC', text)


class EntityExtractor:
    """Optimized entity extractor with pre-compiled patterns"""
    
    def __init__(self):
        # === PRE-COMPILED PATTERNS (Performance boost) ===
        
        # Military roles
        self.role_patterns = {
            'chinh_uy': re.compile(r'ch[íi]nh\s+[úu][yỷ]', re.IGNORECASE),
            'chinh_tri_vien': re.compile(r'ch[íi]nh\s+tr[ịi]\s+vi[êe]n', re.IGNORECASE),
            'trung_doan_truong': re.compile(r'trung\s+[đd]o[àa]n\s+tr[ươu][ởơ]ng', re.IGNORECASE),
            'dai_doi_truong': re.compile(r'[đd][ạa]i\s+[đd][ộo]i\s+tr[ươu][ởơ]ng', re.IGNORECASE),
            'tieu_doi_truong': re.compile(r'ti[ểe]u\s+[đd][ộo]i\s+tr[ươu][ởơ]ng', re.IGNORECASE),
            'bi_thu': re.compile(r'b[íi]\s+th[ưu]', re.IGNORECASE),
            'pho_bi_thu': re.compile(r'ph[óo]\s+b[íi]\s+th[ưu]', re.IGNORECASE),
        }
        
        # Abbreviations mapping
        self.abbreviations = {
            'CU': 'chính ủy',
            'CTĐD': 'chính trị đại đội',
            'TĐT': 'trung đoàn trưởng',
            'ĐĐT': 'đại đội trưởng',
            'TĐT': 'tiểu đội trưởng',
            'BT': 'bí thư',
            'PBT': 'phó bí thư',
        }
        
        # Military ranks
        self.rank_patterns = {
            'thuong_ta': re.compile(r'th[ưu][ợơ]ng\s+t[áa]', re.IGNORECASE),
            'trung_ta': re.compile(r'trung\s+t[áa]', re.IGNORECASE),
            'thieu_ta': re.compile(r'thi[ếe]u\s+t[áa]', re.IGNORECASE),
            'dai_uy': re.compile(r'[đd][ạa]i\s+[úu]y', re.IGNORECASE),
            'trung_uy': re.compile(r'trung\s+[úu]y', re.IGNORECASE),
            'thieu_uy': re.compile(r'thi[ếe]u\s+[úu]y', re.IGNORECASE),
        }
        
        # Units
        self.unit_patterns = {
            'trung_doan': re.compile(r'trung\s+[đd]o[àa]n\s+(\d+)', re.IGNORECASE),
            'dai_doi': re.compile(r'[đd][ạa]i\s+[đd][ộo]i\s+(\d+)', re.IGNORECASE),
            'tieu_doi': re.compile(r'ti[ểe]u\s+[đd][ộo]i\s+(\d+)', re.IGNORECASE),
        }
        
        # === SIMPLIFIED PERSONNEL PATTERN ===
        # Vietnamese name: 2-4 words, each word capitalized
        # Support both with and without diacritics
        self.vn_name_chars = (
            r'[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆI'
            r'ÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰ'
            r'YỲÝỶỸỴ]'
            r'[a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệi'
            r'ìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữự'
            r'yỳýỷỹỵ]+'
        )
        
        # Pattern 1: Role: Rank Name
        self.pattern_role_rank_name = re.compile(
            r'(?:ch[íi]nh\s+[úu][yỷ]|ch[íi]nh\s+tr[ịi]\s+vi[êe]n|'
            r'trung\s+[đd]o[àa]n\s+tr[ươu][ởơ]ng|[đd][ạa]i\s+[đd][ộo]i\s+tr[ươu][ởơ]ng)'
            r'.*?:\s*'
            r'(?:th[ưu][ợơ]ng\s+t[áa]|trung\s+t[áa]|thi[ếe]u\s+t[áa]|'
            r'[đd][ạa]i\s+[úu]y|trung\s+[úu]y|thi[ếe]u\s+[úu]y)?\s*'
            rf'({self.vn_name_chars}(?:\s+{self.vn_name_chars}){{1,3}})',
            re.IGNORECASE
        )
        
        # Pattern 2: Rank Name (standalone)
        self.pattern_rank_name = re.compile(
            r'(?:th[ưu][ợơ]ng\s+t[áa]|trung\s+t[áa]|thi[ếe]u\s+t[áa]|'
            r'[đd][ạa]i\s+[úu]y|trung\s+[úu]y|thi[ếe]u\s+[úu]y)\s+'
            rf'({self.vn_name_chars}(?:\s+{self.vn_name_chars}){{1,3}})',
            re.IGNORECASE
        )
    
    @lru_cache(maxsize=1000)
    def extract_personnel(self, text: str) -> tuple:
        """
        Extract Vietnamese personnel names (cached)
        Returns tuple for caching compatibility
        """
        # Normalize text
        text_norm = normalize_vietnamese(text)
        
        # Remove markdown formatting
        text_clean = text_norm.replace('**', '').replace('*', '')
        
        names = []
        
        # Pattern 1: Role: Rank Name
        matches = self.pattern_role_rank_name.finditer(text_clean)
        for match in matches:
            name = match.group(1).strip()
            # Validate: at least 2 words
            if len(name.split()) >= 2:
                names.append(name)
        
        # Pattern 2: Rank + Name
        matches = self.pattern_rank_name.finditer(text_clean)
        for match in matches:
            name = match.group(1).strip()
            if len(name.split()) >= 2:
                names.append(name)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_names = []
        for name in names:
            name_lower = name.lower()
            if name_lower not in seen:
                seen.add(name_lower)
                unique_names.append(name)
        
        # Return tuple for caching
        return tuple(unique_names)
    
    def extract_roles(self, text: str) -> List[str]:
        """Extract military roles from text"""
        text_norm = normalize_vietnamese(text).lower()
        
        roles = []
        for role_code, pattern in self.role_patterns.items():
            if pattern.search(text_norm):
                roles.append(role_code)
        
        # Also check abbreviations
        for abbr, full in self.abbreviations.items():
            if abbr in text:  # Case sensitive for abbreviations
                # Map abbreviation to role code
                role_mapping = {
                    'CU': 'chinh_uy',
                    'CTĐD': 'chinh_tri_vien',
                    'TĐT': 'trung_doan_truong',
                    'ĐĐT': 'dai_doi_truong',
                    'BT': 'bi_thu',
                }
                role_code = role_mapping.get(abbr)
                if role_code and role_code not in roles:
                    roles.append(role_code)
        
        return list(set(roles))
    
    def extract_units(self, text: str) -> List[str]:
        """Extract military unit designations"""
        text_norm = normalize_vietnamese(text).lower()
        
        units = []
        
        for unit_type, pattern in self.unit_patterns.items():
            matches = pattern.finditer(text_norm)
            for match in matches:
                unit_num = match.group(1)
                units.append(f'{unit_type}_{unit_num}')
        
        return list(set(units))
    
    def extract_ranks(self, text: str) -> List[str]:
        """Extract military ranks"""
        text_norm = normalize_vietnamese(text).lower()
        
        ranks = []
        for rank_code, pattern in self.rank_patterns.items():
            if pattern.search(text_norm):
                ranks.append(rank_code)
        
        return list(set(ranks))
    
    def extract_all_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract all entity types from text
        
        Args:
            text: Input text
            
        Returns:
            Dict with 'personnel', 'roles', 'units', 'ranks' keys
        """
        # Personnel returns tuple from cache, convert to list
        personnel_tuple = self.extract_personnel(text)
        
        return {
            'personnel': list(personnel_tuple),
            'roles': self.extract_roles(text),
            'units': self.extract_units(text),
            'ranks': self.extract_ranks(text)
        }
    
    def has_entity_type(self, text: str, entity_type: str) -> bool:
        """
        Quick check if text contains specific entity type
        Faster than full extraction
        
        Args:
            text: Input text
            entity_type: One of 'personnel', 'roles', 'units', 'ranks'
        """
        text_norm = normalize_vietnamese(text).lower()
        
        if entity_type == 'roles':
            return any(pattern.search(text_norm) for pattern in self.role_patterns.values())
        
        elif entity_type == 'ranks':
            return any(pattern.search(text_norm) for pattern in self.rank_patterns.values())
        
        elif entity_type == 'units':
            return any(pattern.search(text_norm) for pattern in self.unit_patterns.values())
        
        elif entity_type == 'personnel':
            # Quick check for rank keywords (indicator of personnel mention)
            rank_keywords = ['trung tá', 'thượng tá', 'đại úy', 'thiếu tá']
            return any(kw in text_norm for kw in rank_keywords)
        
        return False


# Singleton instance
_extractor = None

def get_entity_extractor() -> EntityExtractor:
    """Get singleton entity extractor instance"""
    global _extractor
    if _extractor is None:
        _extractor = EntityExtractor()
    return _extractor


def extract_all_entities(text: str) -> Dict[str, List[str]]:
    """
    Convenience function to extract all entities
    
    Args:
        text: Input text
        
    Returns:
        Dict with extracted entities
    """
    return get_entity_extractor().extract_all_entities(text)


# === TESTING ===
if __name__ == "__main__":
    test_text = """
    ### Cán bộ Trung đoàn 8
    
    **Chính ủy Trung đoàn:** Trung tá Trần Văn Tới
    
    **Trung đoàn trưởng:** Thượng tá Vũ Xuân Trường
    
    **Đại đội trưởng Đại đội 8:** Đại úy Vũ Văn Chung
    
    **Chính trị viên Đại đội 8:** Đại úy Nguyễn Văn Phong
    
   
    """
    
    extractor = get_entity_extractor()
    
    print("="*60)
    print("OPTIMIZED ENTITY EXTRACTION TEST")
    print("="*60)
    
    # Test 1: Full extraction
    entities = extractor.extract_all_entities(test_text)
    
    print(f"\n✅ Personnel ({len(entities['personnel'])}):")
    for name in entities['personnel']:
        print(f"   - {name}")
    
    print(f"\n✅ Roles ({len(entities['roles'])}):")
    for role in entities['roles']:
        print(f"   - {role}")
    
    print(f"\n✅ Units ({len(entities['units'])}):")
    for unit in entities['units']:
        print(f"   - {unit}")
    
    print(f"\n✅ Ranks ({len(entities['ranks'])}):")
    for rank in entities['ranks']:
        print(f"   - {rank}")
    
    # Test 2: Quick check
    print(f"\n✅ Has personnel: {extractor.has_entity_type(test_text, 'personnel')}")
    print(f"✅ Has roles: {extractor.has_entity_type(test_text, 'roles')}")
    
    # Test 3: Performance (cache)
    import time
    start = time.time()
    for _ in range(1000):
        extractor.extract_personnel(test_text)
    elapsed = time.time() - start
    print(f"\n⚡ Performance: 1000 extractions in {elapsed:.3f}s ({elapsed*1000:.1f}ms total, {elapsed:.3f}ms/call)")