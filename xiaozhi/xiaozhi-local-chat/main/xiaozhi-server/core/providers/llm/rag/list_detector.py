"""
List Detection Module
Detect numbered lists in documents and queries
"""
import re
from typing import Optional, Dict, List, Tuple
from dataclasses import dataclass

@dataclass
class ListInfo:
    """Information about a detected numbered list"""
    list_name: str          # "10_loi_the"
    section_header: str     # "10 lời thề trong quân đội"
    total_items: int        # 10
    item_pattern: str       # Pattern to detect items
    start_line: int = 0     # Starting line in document (if known)
    end_line: int = 0       # Ending line in document (if known)


# List configurations
# ORDER MATTERS: Specific lists with keywords should be first!
LIST_CONFIGS = {
    '23_dau_cong_viec': {
        'section_patterns': [
            r'23 đầu công việc trong ngày',
            r'hai mươi ba đầu công việc',
            r'hai ba đầu công việc',
        ],
        'item_pattern': r'^(\d+)\.\s',
        'total_items': 23,
        'keywords': ['báo thức', 'thể dục', 'vệ sinh', 'ăn sáng', 'học tập']
    },
    '9_dau_cong_viec': {
        'section_patterns': [
            r'9 đầu.*sáng thứ hai',
            r'chín đầu công việc sáng',
            r'9 đầu việc sáng',
        ],
        'item_pattern': r'^(\d+)\.\s',
        'total_items': 9,
        'keywords': ['chào cờ', 'duyệt đội ngũ', 'thông báo chính trị']
    },
    '4_doi_tuong_tac_chien': {
        'section_patterns': [
            r'đối tượng tác chiến',
            r'4 đối tượng',
            r'bốn đối tượng',
        ],
        'item_pattern': r'^(\d+)\.',
        'total_items': 4,
        'keywords': ['lực lượng vũ trang', 'xâm lược', 'phản động']
    },
    '11_che_do_trong_ngay': {
        'section_patterns': [
            r'11 chế độ trong ngày',
            r'mười một chế độ',
        ],
        'item_pattern': r'^(\d+)\.',
        'total_items': 11,
        'keywords': ['treo quốc kỳ', 'thức dậy', 'thể dục', 'điểm danh']
    },
    'moc_son_lich_su': {
        'section_patterns': [
            r'mốc son lịch sử',
            r'lịch sử quân đội',
        ],
        'item_pattern': r'',
        'total_items': 0,
        'keywords': ['đội việt nam', 'chiến thắng', 'chiến dịch']
    },
    '9_truyen_thong': {
        'section_patterns': [
            r'9 truyền thống',
            r'chín truyền thống',
            r'truyền thống quân đội',
        ],
        'item_pattern': r'',
        'total_items': 9,
        'keywords': ['trung thành', 'quyết chiến', 'đoàn kết']
    },
    'lich_su_quan_khu_3': {
        'section_patterns': [
            r'lịch sử quân khu 3',
            r'lịch sử quân khu ba',
        ],
        'item_pattern': r'',
        'total_items': 0,
        'keywords': ['đồng bằng', 'chiến khu', 'kháng chiến']
    },
    'lich_su_su_doan_395': {
        'section_patterns': [
            r'lịch sử sư đoàn 395',
            r'lịch sử sư đoàn ba chín năm',
        ],
        'item_pattern': r'',
        'total_items': 0,
        'keywords': ['sư đoàn', 'chiến đấu', 'biên chế']
    },
    'lich_su_trung_doan_8': {
        'section_patterns': [
            r'lịch sử trung đoàn 8',
            r'lịch sử trung đoàn tám',
        ],
        'item_pattern': r'',
        'total_items': 0,
        'keywords': ['trung đoàn', 'truyền thống', 'tây nguyên']
    },
    '4_phuong_phap': {
        'section_patterns': [
            r'bốn phương pháp giảng dạy',
            r'4 phương pháp giảng',
            r'phương pháp giảng dạy chính trị',
        ],
        'item_pattern': r'####\s*(\d+)\.',
        'total_items': 4,
        'keywords': ['thuyết trình', 'đàm thoại', 'nêu vấn đề', 'khởi động trí tuệ']
    },
    '6_hinh_thuc': {
        'section_patterns': [
            r'sáu hình thức giáo dục',
            r'6 hình thức giáo dục',
            r'hình thức giáo dục chính trị',
        ],
        'item_pattern': r'####\s*(\d+)\.',
        'total_items': 6,
        'keywords': ['học tập chính trị', 'nghiên cứu chuyên đề', 'sinh hoạt chính trị', 'thông báo chính trị', 'ngày chính trị', 'mạng máy tính']
    },
    '10_loi_the': {
        'section_patterns': [
            r'10 lời thề trong quân đội',
            r'mười lời thề trong quân đội',
            r'10 lời thề',
        ],
        'item_pattern': r'\*\*Lời thề số (\d+):\*\*',
        'total_items': 10,
        'keywords': []
    },
    '12_dieu_cam': {
        'section_patterns': [
            r'12 điều cấm',
            r'mười hai điều cấm',
        ],
        'item_pattern': r'(?:\*\*)?(\d+)[\.)]',
        'total_items': 12,
        'keywords': []
    },
    'chi_huy_trung_doan': {
        'section_patterns': [
            r'chỉ huy trung đoàn 8',
            r'lãnh đạo trung đoàn 8',
        ],
        'item_pattern': r'-',
        'total_items': 5,
        'keywords': ['trung đoàn trưởng', 'chính ủy', 'phó trung đoàn trưởng', 'tham mưu trưởng']
    },
    'chi_huy_tieu_doan': {
        'section_patterns': [
            r'chỉ huy tiểu đoàn 5',
            r'lãnh đạo tiểu đoàn 5',
        ],
        'item_pattern': r'-',
        'total_items': 4,
        'keywords': ['tiểu đoàn trưởng', 'chính trị viên', 'phó tiểu đoàn trưởng']
    },
    'chi_huy_dai_doi': {
        'section_patterns': [
            r'chỉ huy đại đội 8',
            r'lãnh đạo đại đội 8',
        ],
        'item_pattern': r'-',
        'total_items': 4,
        'keywords': ['đại đội trưởng', 'chính trị viên', 'phó đại đội trưởng']
    },
    'chi_huy_su_doan': {
        'section_patterns': [
            r'chỉ huy sư đoàn 395',
            r'lãnh đạo sư đoàn 395',
        ],
        'item_pattern': r'-',
        'total_items': 5,
        'keywords': ['sư đoàn trưởng', 'chính ủy', 'phó sư đoàn trưởng']
    },
    'chi_huy_quan_khu': {
        'section_patterns': [
            r'thủ trưởng bộ tư lệnh quân khu 3',
            r'chỉ huy quân khu 3',
            r'lãnh đạo quân khu 3',
        ],
        'item_pattern': r'-',
        'total_items': 7,
        'keywords': ['tư lệnh', 'chính ủy', 'phó tư lệnh']
    },
    'chu_de_dai_hoi_14': {
        'section_patterns': [
            r'chủ đề.*đại hội 14',
            r'chủ đề.*đại hội.*mười bốn',
            r'đại hội 14.*chủ đề',
            r'đại hội đại biểu toàn quốc lần thứ XIV',
        ],
        'item_pattern': r'',
        'total_items': 0,
        'keywords': ['lá cờ vẻ vang', 'chung sức', 'đồng lòng', 'kỷ nguyên vươn mình']
    }
}

# Query patterns mapping
QUERY_PATTERNS = [
    (r'23 đầu công việc', '23_dau_cong_viec'),
    (r'hai mươi ba đầu', '23_dau_cong_viec'),
    (r'hai ba đầu công việc', '23_dau_cong_viec'),
    (r'9 đầu.*sáng thứ', '9_dau_cong_viec'),
    (r'chín đầu', '9_dau_cong_viec'),
    (r'đối tượng tác chiến', '4_doi_tuong_tac_chien'),
    (r'4 đối tượng', '4_doi_tuong_tac_chien'),
    (r'bốn đối tượng', '4_doi_tuong_tac_chien'),
    (r'11 chế độ', '11_che_do_trong_ngay'),
    (r'mười một chế độ', '11_che_do_trong_ngay'),
    (r'mốc son lịch sử', 'moc_son_lich_su'),
    (r'lịch sử quân đội', 'moc_son_lich_su'),
    (r'9 truyền thống', '9_truyen_thong'),
    (r'chín truyền thống', '9_truyen_thong'),
    (r'truyền thống.*quân đội', '9_truyen_thong'),
    (r'.*lịch sử.*quân khu 3', 'lich_su_quan_khu_3'),
    (r'.*lịch sử.*quân khu ba', 'lich_su_quan_khu_3'),
    (r'.*lịch sử.*sư đoàn 395', 'lich_su_su_doan_395'),
    (r'.*lịch sử.*sư đoàn ba chín năm', 'lich_su_su_doan_395'),
    (r'.*lịch sử.*trung đoàn 8', 'lich_su_trung_doan_8'),
    (r'.*lịch sử.*trung đoàn tám', 'lich_su_trung_doan_8'),
    (r'10 lời thề', '10_loi_the'),
    (r'mười lời thề', '10_loi_the'),
    (r'12 điều cấm', '12_dieu_cam'),
    (r'mười hai điều cấm', '12_dieu_cam'),
    (r'phương pháp giảng.*chính trị', '4_phuong_phap'),
    (r'bốn phương pháp', '4_phuong_phap'),
    (r'4 phương pháp', '4_phuong_phap'),
    (r'hình thức giáo dục.*chính trị', '6_hinh_thuc'),
    (r'sáu hình thức', '6_hinh_thuc'),
    (r'6 hình thức', '6_hinh_thuc'),
    (r'chỉ huy trung đoàn', 'chi_huy_trung_doan'),
    (r'lãnh đạo trung đoàn', 'chi_huy_trung_doan'),
    (r'chỉ huy tiểu đoàn', 'chi_huy_tieu_doan'),
    (r'lãnh đạo tiểu đoàn', 'chi_huy_tieu_doan'),
    (r'chỉ huy đại đội', 'chi_huy_dai_doi'),
    (r'lãnh đạo đại đội', 'chi_huy_dai_doi'),
    (r'chỉ huy sư đoàn', 'chi_huy_su_doan'),
    (r'lãnh đạo sư đoàn', 'chi_huy_su_doan'),
    (r'chỉ huy quân khu', 'chi_huy_quan_khu'),
    (r'lãnh đạo quân khu', 'chi_huy_quan_khu'),
    (r'thủ trưởng quân khu', 'chi_huy_quan_khu'),
    (r'thủ trưởng bộ tư lệnh quân khu', 'chi_huy_quan_khu'),
    # Party Congress 14
    (r'chủ đề.*đại hội 14', 'chu_de_dai_hoi_14'),
    (r'chủ đề.*đại hội.*mười bốn', 'chu_de_dai_hoi_14'),
    (r'đại hội 14.*chủ đề', 'chu_de_dai_hoi_14'),
    (r'đại hội.*XIV.*chủ đề', 'chu_de_dai_hoi_14'),
    # Party Congress 14 Motto
    (r'phương châm.*đại hội 14', 'chu_de_dai_hoi_14'),
    (r'phương châm.*đại hội.*mười bốn', 'chu_de_dai_hoi_14'),
    (r'đại hội 14.*phương châm', 'chu_de_dai_hoi_14'),
    # Party Military Congress XII - 2-2-2 directives
    (r'2.*kiên định.*2.*đẩy mạnh.*2.*ngăn ngừa', '2_kien_dinh_2_day_manh_2_ngan_ngua'),
    (r'hai.*kiên định.*hai.*đẩy mạnh.*hai.*ngăn ngừa', '2_kien_dinh_2_day_manh_2_ngan_ngua'),
    (r'2.*kiên định', '2_kien_dinh_2_day_manh_2_ngan_ngua'),
    (r'hai kiên định', '2_kien_dinh_2_day_manh_2_ngan_ngua'),
    (r'đại hội.*quân đội.*12', '2_kien_dinh_2_day_manh_2_ngan_ngua'),
    (r'đại hội.*quân đội.*mười hai', '2_kien_dinh_2_day_manh_2_ngan_ngua'),
    # 5 vững directive
    (r'5.*vững', '5_vung'),
    (r'năm.*vững', '5_vung'),
    (r'phương châm.*5.*vững', '5_vung'),
    (r'phương châm.*năm.*vững', '5_vung'),
]



def is_list_query(query: str) -> Optional[str]:
    """
    Detect if query is asking about a numbered list
    
    Args:
        query: User query
        
    Returns:
        list_name if detected, None otherwise
    """
    query_lower = query.lower()
    
    for pattern, list_name in QUERY_PATTERNS:
        if re.search(pattern, query_lower, re.IGNORECASE):
            return list_name
    
    return None


def detect_numbered_list_in_content(content: str, metadata: Dict = None) -> List[ListInfo]:
    """
    Detect numbered lists in document content
    
    Args:
        content: Document content
        metadata: Optional metadata dict
        
    Returns:
        List of detected ListInfo objects
    """
    detected_lists = []
    
    for list_name, config in LIST_CONFIGS.items():
        # Check if section header exists
        for section_pattern in config['section_patterns']:
            match = re.search(section_pattern, content, re.IGNORECASE)
            if match:
                # Found a list section
                list_info = ListInfo(
                    list_name=list_name,
                    section_header=match.group(0),
                    total_items=config['total_items'],
                    item_pattern=config['item_pattern']
                )
                detected_lists.append(list_info)
                break  # Only detect once per list
    
    return detected_lists


def extract_list_item_number(text: str, list_name: str) -> Optional[int]:
    """
    Extract item number from text chunk
    
    Args:
        text: Text content
        list_name: Name of the list
        
    Returns:
        Item number if found, None otherwise
    """
    if list_name not in LIST_CONFIGS:
        return None
    
    config = LIST_CONFIGS[list_name]
    pattern = config['item_pattern']
    
    match = re.search(pattern, text)
    if match:
        try:
            return int(match.group(1))
        except (ValueError, IndexError):
            return None
    
    return None


def is_chunk_part_of_list(chunk_content: str, metadata: Dict = None) -> Optional[Tuple[str, int]]:
    """
    Check if a chunk is part of a numbered list
    
    Args:
        chunk_content: Text content of chunk
        metadata: Optional chunk metadata
        
    Returns:
        (list_name, item_number) if part of list, None otherwise
    """
    # First check if chunk contains section header
    detected_lists = detect_numbered_list_in_content(chunk_content, metadata)
    
    # Then try to extract item number
    for list_name in LIST_CONFIGS.keys():
        config = LIST_CONFIGS[list_name]
        item_num = extract_list_item_number(chunk_content, list_name)
        
        if item_num is not None:
            # Check keywords if defined
            keywords = config.get('keywords', [])
            if keywords:
                content_lower = chunk_content.lower()
                # Must match at least one keyword
                if not any(kw.lower() in content_lower for kw in keywords):
                    continue
            
            return (list_name, item_num)
    
    return None


def get_list_config(list_name: str) -> Optional[Dict]:
    """Get configuration for a specific list"""
    return LIST_CONFIGS.get(list_name)


# For testing
if __name__ == "__main__":
    # Test cases
    test_queries = [
        "10 lời thề trong quân đội là gì?",
        "mười lời thề là gì",
        "12 điều cấm là gì?",
        "Trung đoàn trưởng là ai?",  # Not a list query
    ]
    
    print("=== Testing Query Detection ===")
    for query in test_queries:
        result = is_list_query(query)
        print(f"Query: '{query}' → {result}")
    
    print("\n=== Testing Content Detection ===")
    test_content = """
    ## 10 lời thề trong quân đội nhân dân Việt Nam
    
    **Lời thề số 1:** Hy sinh tất cả vì tổ quốc...
    **Lời thề số 2:** Tuyệt đối phục tùng...
    """
    
    detected = detect_numbered_list_in_content(test_content)
    for list_info in detected:
        print(f"Found: {list_info.list_name} - {list_info.total_items} items")
    
    print("\n=== Testing Item Number Extraction ===")
    test_chunks = [
        "**Lời thề số 3:** Không ngừng nâng cao...",
        "**Lời thề số 10:** Giữ vững phẩm chất...",
    ]
    
    for chunk in test_chunks:
        item_num = extract_list_item_number(chunk, '10_loi_the')
        print(f"Chunk: '{chunk[:30]}...' → Item {item_num}")
