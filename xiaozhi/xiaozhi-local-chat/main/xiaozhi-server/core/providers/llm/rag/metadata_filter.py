"""
OPTIMIZED Metadata Filter for ChromaDB Queries

Major improvements:
1. Support entity-based filtering (personnel names, units)
2. Fuzzy matching for Vietnamese names
3. Multiple filter strategies (AND, OR)
4. Query analysis for better filtering
5. Support ChromaDB operators ($in, $contains, etc.)
"""

import re
from typing import Optional, Dict, Any, List
from difflib import SequenceMatcher


def normalize_name(name: str) -> str:
    """
    Normalize Vietnamese name for comparison
    Remove diacritics, lowercase, standardize spaces
    """
    # Simple diacritic removal for comparison
    replacements = {
        'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
        'đ': 'd'
    }
    
    normalized = name.lower()
    for vn_char, ascii_char in replacements.items():
        normalized = normalized.replace(vn_char, ascii_char)
    
    # Standardize spaces
    normalized = ' '.join(normalized.split())
    
    return normalized


def fuzzy_match_name(query_name: str, target_name: str, threshold: float = 0.8) -> bool:
    """
    Fuzzy match Vietnamese names
    
    Args:
        query_name: Name from query
        target_name: Name from metadata
        threshold: Similarity threshold (0-1)
    
    Returns:
        True if names match above threshold
    """
    norm_query = normalize_name(query_name)
    norm_target = normalize_name(target_name)
    
    # Exact match
    if norm_query == norm_target:
        return True
    
    # Fuzzy match using SequenceMatcher
    similarity = SequenceMatcher(None, norm_query, norm_target).ratio()
    
    return similarity >= threshold


def extract_entities_from_query(query: str) -> Dict[str, Any]:
    """
    Extract entities from user query for filtering
    
    Returns:
        Dict with detected entities and intent
    """
    query_lower = query.lower()
    
    entities = {
        'personnel_names': [],
        'roles': [],
        'units': [],
        'ranks': [],
        'category': None
    }
    
    # === PERSONNEL NAME DETECTION ===
    # Pattern: [Rank] [Name with 2-4 words]
    name_pattern = r'(?:trung tá|thượng tá|đại úy|thiếu tá)?\s*([A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰYỲÝỶỸỴ][a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệiìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]+(?:\s+[A-ZÀÁẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐEÈÉẺẼẸÊẾỀỂỄỆIÌÍỈĨỊOÒÓỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢUÙÚỦŨỤƯỨỪỬỮỰYỲÝỶỸỴ][a-zàáảãạăắằẳẵặâấầẩẫậđeèéẻẽẹêếềểễệiìíỉĩịoòóỏõọôốồổỗộơớờởỡợuùúủũụưứừửữựyỳýỷỹỵ]+){1,3})'
    
    matches = re.finditer(name_pattern, query)
    for match in matches:
        name = match.group(1).strip()
        if len(name.split()) >= 2:  # At least 2 words
            entities['personnel_names'].append(name)
    
    # === ROLE DETECTION ===
    role_keywords = {
        'chính ủy': 'chinh_uy',
        'chính uỷ': 'chinh_uy',
        'chính trị viên': 'chinh_tri_vien',
        'trung đoàn trưởng': 'trung_doan_truong',
        'đại đội trưởng': 'dai_doi_truong',
        'tiểu đội trưởng': 'tieu_doi_truong',
        'bí thư': 'bi_thu',
    }
    
    for keyword, role_code in role_keywords.items():
        if keyword in query_lower:
            entities['roles'].append(role_code)
    
    # === UNIT DETECTION ===
    unit_patterns = {
        r'trung đoàn\s+(\d+)': 'trung_doan',
        r'đại đội\s+(\d+)': 'dai_doi',
        r'tiểu đội\s+(\d+)': 'tieu_doi',
    }
    
    for pattern, unit_type in unit_patterns.items():
        matches = re.finditer(pattern, query_lower)
        for match in matches:
            unit_num = match.group(1)
            entities['units'].append(f'{unit_type}_{unit_num}')
    
    # === RANK DETECTION ===
    rank_keywords = {
        'trung tá': 'trung_ta',
        'thượng tá': 'thuong_ta',
        'thiếu tá': 'thieu_ta',
        'đại úy': 'dai_uy',
        'trung úy': 'trung_uy',
        'thiếu úy': 'thieu_uy',
    }
    
    for keyword, rank_code in rank_keywords.items():
        if keyword in query_lower:
            entities['ranks'].append(rank_code)
    
    # === CATEGORY DETECTION ===
    category_keywords = {
        'chính trị': 'chinh_tri',
        'quân sự': 'quan_su',
        'hậu cần': 'hau_can',
        'kỹ thuật': 'ky_thuat',
    }
    
    for keyword, category in category_keywords.items():
        if keyword in query_lower:
            entities['category'] = category
            break
    
    return entities


def build_metadata_filter(
    query: str, 
    category: Optional[str] = None,
    filter_strategy: str = "smart"
) -> Optional[Dict[str, Any]]:
    """
    Build ChromaDB where filter from query with entity support
    
    Args:
        query: User query
        category: Optional category filter
        filter_strategy: "smart" (auto), "loose" (OR), "strict" (AND)
        
    Returns:
        ChromaDB where dict or None if no filter needed
    """
    # Extract entities from query
    entities = extract_entities_from_query(query)
    
    where_filter = {}
    
    # === CATEGORY FILTER ===
    if category:
        where_filter['category'] = category
    elif entities['category']:
        where_filter['category'] = entities['category']
    
    # === PERSONNEL NAME FILTER ===
    # ⚠️ TEMPORARILY DISABLED: Documents don't have 'has_personnel' metadata
    # if entities['personnel_names']:
    #     # ChromaDB metadata format: personnel stored as CSV string
    #     # We need to check if ANY name matches
    #     # Use $contains operator (if supported) or build OR clause
    #     
    #     # For now, we'll use has_personnel flag as proxy
    #     # Real implementation would need to parse CSV in metadata
    #     where_filter['has_personnel'] = True
    #     
    #     # Store for later filtering (post-retrieval)
    #     where_filter['_target_personnel'] = entities['personnel_names']
    
    # === ROLE FILTER ===
    # ⚠️ TEMPORARILY DISABLED: Documents don't have 'has_roles' metadata
    # Filter was causing 0 results because documents lack this field
    # if entities['roles']:
    #     # If multiple roles, we want chunks with ANY of these roles
    #     # ChromaDB: roles stored as CSV string
    #     where_filter['has_roles'] = True
    #     where_filter['_target_roles'] = entities['roles']
    
    # === UNIT FILTER ===
    # ⚠️ TEMPORARILY DISABLED: Documents don't have 'has_units' metadata
    # if entities['units']:
    #     where_filter['has_units'] = True
    #     where_filter['_target_units'] = entities['units']
    
    # === RANK FILTER (less specific) ===
    # Usually don't filter by rank alone
    
    # Remove internal fields (prefixed with _)
    # These are used for post-retrieval filtering
    internal_keys = [k for k in where_filter.keys() if k.startswith('_')]
    
    # If only internal filters, remove boolean flags
    if len(where_filter) == len(internal_keys) + sum(
        1 for k in where_filter if k.startswith('has_')
    ):
        # Only has internal + boolean flags, might be too restrictive
        if filter_strategy == "loose":
            # Remove boolean flags, will do post-filtering
            for k in list(where_filter.keys()):
                if k.startswith('has_'):
                    del where_filter[k]
    
    # Return None if only internal fields (no ChromaDB filtering)
    chromadb_filter = {
        k: v for k, v in where_filter.items() 
        if not k.startswith('_')
    }
    
    return chromadb_filter if chromadb_filter else None


def post_filter_results(
    results: Dict[str, Any],
    query: str,
    fuzzy_threshold: float = 0.8
) -> Dict[str, Any]:
    """
    Post-filter results based on extracted entities
    For fine-grained filtering that ChromaDB can't do
    
    Args:
        results: ChromaDB query results
        query: Original user query
        fuzzy_threshold: Fuzzy matching threshold
        
    Returns:
        Filtered results
    """
    entities = extract_entities_from_query(query)
    
    if not entities['personnel_names']:
        return results  # No personnel filtering needed
    
    # Filter documents by personnel name
    documents = results.get('documents', [[]])[0]
    metadatas = results.get('metadatas', [[]])[0]
    distances = results.get('distances', [[]])[0]
    
    filtered_docs = []
    filtered_metas = []
    filtered_dists = []
    
    target_names = entities['personnel_names']
    
    for doc, meta, dist in zip(documents, metadatas, distances):
        # Get personnel from metadata (CSV string)
        personnel_str = meta.get('personnel', '')
        if not personnel_str:
            continue
        
        # Parse CSV
        personnel_list = [name.strip() for name in personnel_str.split(',') if name.strip()]
        
        # Check if any target name matches any personnel in metadata
        matched = False
        for target_name in target_names:
            for meta_name in personnel_list:
                if fuzzy_match_name(target_name, meta_name, fuzzy_threshold):
                    matched = True
                    break
            if matched:
                break
        
        if matched:
            filtered_docs.append(doc)
            filtered_metas.append(meta)
            filtered_dists.append(dist)
    
    # Reconstruct results
    if filtered_docs:
        return {
            'documents': [filtered_docs],
            'metadatas': [filtered_metas],
            'distances': [filtered_dists]
        }
    
    return results  # Return original if no matches


# === TESTING ===
if __name__ == "__main__":
    print("="*60)
    print("OPTIMIZED METADATA FILTER TEST")
    print("="*60)
    
    test_queries = [
        "Chính ủy trung đoàn là ai?",
        "Tìm thông tin về Trần Văn Tới",
        "Đại đội trưởng Đại đội 8",
        "Ai là trung đoàn trưởng?",
        "Thông tin về công tác chính trị",
    ]
    
    for query in test_queries:
        print(f"\n📝 Query: {query}")
        
        # Extract entities
        entities = extract_entities_from_query(query)
        print(f"   Entities: {entities}")
        
        # Build filter
        where_filter = build_metadata_filter(query)
        print(f"   Filter: {where_filter}")
    
    # Test fuzzy matching
    print("\n" + "="*60)
    print("FUZZY NAME MATCHING TEST")
    print("="*60)
    
    test_pairs = [
        ("Trần Văn Tới", "Tran Van Toi"),  # No diacritics
        ("Trần Văn Tới", "Trần Văn Tới"),  # Exact
        ("Vũ Xuân Trường", "Vu Xuan Truong"),
        ("Nguyễn Văn A", "Nguyễn Văn B"),  # Different
    ]
    
    for name1, name2 in test_pairs:
        matched = fuzzy_match_name(name1, name2, threshold=0.8)
        similarity = SequenceMatcher(None, normalize_name(name1), normalize_name(name2)).ratio()
        print(f"   {name1} vs {name2}: {matched} (sim={similarity:.2f})")