"""
Metadata Extractor for RAG Documents

Automatically extract metadata from document chunks:
- has_roles: True if chunk contains role information
- has_personnel: True if chunk contains personnel names
- personnel: "Name1, Name2" (CSV list)
- has_units: True if chunk contains unit information
- units: "dai_doi_8, trung_doan_8" (CSV list)
"""

import re
from typing import Dict, List, Optional


class MetadataExtractor:
    """Extract metadata from document chunks for ChromaDB filtering"""
    
    def __init__(self):
        # === ROLE PATTERNS ===
        self.role_keywords = [
            'chính ủy', 'chính uỷ',
            'chính trị viên',
            'trung đoàn trưởng',
            'đại đội trưởng',
            'tiểu đội trưởng',
            'bí thư',
            'phó chính ủy',
            'phó trung đoàn trưởng',
            'tham mưu trưởng',
        ]
        
        # === UNIT PATTERNS ===
        self.unit_patterns = [
            (r'trung đoàn\s+(\d+)', 'trung_doan'),
            (r'đại đội\s+(\d+)', 'dai_doi'),
            (r'tiểu đội\s+(\d+)', 'tieu_doi'),
            (r'trung đoàn\s+(tám|8)', 'trung_doan'),
            (r'đại đội\s+(tám|8|một|1|hai|2|ba|3|bốn|4|năm|5|sáu|6|bảy|7|chín|9)', 'dai_doi'),
        ]
        
        # === VIETNAMESE NAME PATTERN ===
        # Pattern: Capitalized word(s) with Vietnamese characters
        # Example: "Nguyễn Văn Phong", "Trần Văn Tới"
        self.name_pattern = re.compile(
            r'\b([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰYỲÝỶỸỴ]'
            r'[a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệiìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]+'
            r'(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰYỲÝỶỸỴ]'
            r'[a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệiìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]+){1,3})\b'
        )
        
        # === COMMON WORDS TO EXCLUDE (not names) ===
        self.exclude_words = {
            'Chính Trị', 'Quân Sự', 'Hậu Cần', 'Kỹ Thuật',
            'Trung Đoàn', 'Đại Đội', 'Tiểu Đội',
            'Đại Úy', 'Trung Tá', 'Thượng Tá', 'Thiếu Tá',
            'Bộ Chính Trị', 'Trung Ương', 'Đảng Bộ',
            'Năm Sinh', 'Họ Tên', 'Chức Vụ', 'Cấp Bậc',
            'Nhiệm Vụ', 'Nơi Sinh',
        }
        
        # Number words mapping
        self.vn_number_words = {
            'một': '1', 'hai': '2', 'ba': '3', 'bốn': '4', 'năm': '5',
            'sáu': '6', 'bảy': '7', 'tám': '8', 'chín': '9', 'mười': '10'
        }
    
    def has_role_info(self, text: str) -> bool:
        """Check if text contains role/position information"""
        text_lower = text.lower()
        return any(role in text_lower for role in self.role_keywords)
    
    def extract_units(self, text: str) -> List[str]:
        """Extract unit identifiers from text"""
        text_lower = text.lower()
        units = []
        
        for pattern, unit_type in self.unit_patterns:
            matches = re.finditer(pattern, text_lower)
            for match in matches:
                # Get number (could be digit or word)
                num_str = match.group(1)
                
                # Convert Vietnamese number words to digits
                if num_str in self.vn_number_words:
                    num_str = self.vn_number_words[num_str]
                
                unit_id = f"{unit_type}_{num_str}"
                if unit_id not in units:
                    units.append(unit_id)
        
        return units
    
    def extract_personnel_names(self, text: str) -> List[str]:
        """
        Extract Vietnamese personnel names from text
        
        Rules:
        - Must be 2-4 capitalized words
        - Must contain Vietnamese characters
        - Exclude common non-name phrases
        """
        matches = self.name_pattern.finditer(text)
        names = []
        
        for match in matches:
            name = match.group(0).strip()
            
            # Filter out non-names
            if name in self.exclude_words:
                continue
            
            # Must be at least 2 words (Vietnamese names)
            words = name.split()
            if len(words) < 2 or len(words) > 4:
                continue
            
            # Check if near role keywords (strong indicator it's a name)
            match_start = match.start()
            context = text[max(0, match_start - 50):min(len(text), match_start + len(name) + 50)]
            context_lower = context.lower()
            
            # Strong indicators this is a personnel name
            name_indicators = [
                'họ tên:', 'tên:', 'chính ủy', 'chính trị viên',
                'đại đội trưởng', 'trung đoàn trưởng',
                'đại úy', 'trung tá', 'thượng tá', 'thiếu tá',
                'năm sinh:', 'sinh năm'
            ]
            
            if any(indicator in context_lower for indicator in name_indicators):
                if name not in names:
                    names.append(name)
        
        return names
    
    def extract_metadata(self, text: str) -> Dict[str, any]:
        """
        Extract all metadata from document chunk
        
        Returns:
            Dict with:
            - has_roles: bool
            - has_personnel: bool
            - personnel: str (CSV)
            - has_units: bool
            - units: str (CSV)
        """
        metadata = {}
        
        # === ROLES ===
        has_roles = self.has_role_info(text)
        metadata['has_roles'] = has_roles
        
        # === UNITS ===
        units = self.extract_units(text)
        metadata['has_units'] = len(units) > 0
        if units:
            metadata['units'] = ', '.join(units)
        
        # === PERSONNEL ===
        personnel = self.extract_personnel_names(text)
        metadata['has_personnel'] = len(personnel) > 0
        if personnel:
            metadata['personnel'] = ', '.join(personnel)
        
        return metadata


# === TESTING ===
if __name__ == "__main__":
    extractor = MetadataExtractor()
    
    test_chunks = [
        """### Chính trị viên Đại đội 8

**Họ tên:** Đại úy Nguyễn Văn Phong
**Chức vụ:** Chính trị viên Đại đội 8
**Cấp bậc:** Đại úy
**Năm sinh:** 1996""",
        
        """### Chính ủy Trung đoàn

**Họ tên:** Trung tá Trần Văn Tới
**Chức vụ:** Chính ủy Trung đoàn 8
**Cấp bậc:** Trung tá
**Năm sinh:** 1978""",
        
        """### Phong trào thi đua năm 2025

Chủ đề lãnh đạo: "Dân chủ, kỷ cương - Sẵn sàng chiến đấu cao"
Phong trào: "5 không, 2 lần"
""",
    ]
    
    print("=" * 70)
    print("METADATA EXTRACTOR TEST")
    print("=" * 70)
    
    for i, chunk in enumerate(test_chunks, 1):
        print(f"\n📄 Chunk {i}:")
        print(f"   Content: {chunk[:80]}...")
        
        metadata = extractor.extract_metadata(chunk)
        print(f"   Metadata: {metadata}")
        
        if metadata.get('personnel'):
            print(f"   ✅ Personnel found: {metadata['personnel']}")
        if metadata.get('units'):
            print(f"   ✅ Units found: {metadata['units']}")
        if metadata.get('has_roles'):
            print(f"   ✅ Has roles: True")
