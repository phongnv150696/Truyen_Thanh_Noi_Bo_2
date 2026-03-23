"""
Temporal Filter cho RAG
Lọc kết quả search theo thông tin thời gian
"""

import logging
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class TemporalFilter:
    """
    Lọc documents/chunks theo thông tin thời gian
    
    Supports filtering by:
    - Month (1-12)
    - Quarter (via months list)
    - Year (YYYY)
    """
    
    def filter_by_time(self, results: List[Dict], temporal_info: Dict) -> List[Dict]:
        """
        Lọc kết quả theo thông tin thời gian
        
        Args:
            results: List of RAG search results
                     Each result: {'text': str, 'metadata': {...}}
            temporal_info: Temporal information extracted from query
                          e.g., {'month': 8, 'year': 2025}
                          or {'months': [4,5,6], 'year': 2025}
        
        Returns:
            Filtered list of results
        """
        if not temporal_info:
            logger.debug("No temporal info, returning all results")
            return results
        
        if not results:
            logger.debug("No results to filter")
            return []
        
        logger.info(f"Filtering {len(results)} results by temporal: {temporal_info}")
        
        filtered = []
        
        for doc in results:
            if self._matches_temporal(doc, temporal_info):
                filtered.append(doc)
        
        logger.info(f"Filtered down to {len(filtered)} results")
        
        return filtered if filtered else results  # Fallback to all if no match
    
    def _matches_temporal(self, doc: Dict, temporal_info: Dict) -> bool:
        """
        Check if document matches temporal criteria
        
        Args:
            doc: Document dict with 'metadata' field
            temporal_info: Temporal criteria
            
        Returns:
            True if matches
        """
        metadata = doc.get('metadata', {})
        
        # Check specific month
        if 'month' in temporal_info:
            target_month = temporal_info['month']
            doc_month = metadata.get('month')
            
            if doc_month and doc_month == target_month:
                logger.debug(f"Month match: {doc_month} == {target_month}")
                return True
        
        # Check quarter (list of months)
        if 'months' in temporal_info:
            target_months = temporal_info['months']
            doc_month = metadata.get('month')
            
            if doc_month and doc_month in target_months:
                logger.debug(f"Quarter match: {doc_month} in {target_months}")
                return True
        
        # Check year
        if 'year' in temporal_info:
            target_year = temporal_info['year']
            doc_year = metadata.get('year')
            
            if doc_year and doc_year == target_year:
                logger.debug(f"Year match: {doc_year} == {target_year}")
                return True
        
        # Check if document text contains temporal reference
        text = doc.get('text', '').lower()
        
        if 'month' in temporal_info:
            month = temporal_info['month']
            if f'tháng {month}' in text or f'tháng 0{month}' in text:
                logger.debug(f"Text month match: tháng {month}")
                return True
        
        if 'year' in temporal_info:
            year = temporal_info['year']
            if f'năm {year}' in text:
                logger.debug(f"Text year match: năm {year}")
                return True
        
        return False
    
    def add_temporal_metadata(self, doc: Dict) -> Dict:
        """
        Extract and add temporal metadata from document text
        
        Args:
            doc: Document dict with 'text' field
            
        Returns:
            Updated doc with temporal metadata
        """
        import re
        
        text = doc.get('text', '').lower()
        metadata = doc.get('metadata', {})
        
        # Extract month
        month_match = re.search(r'tháng\s*(\d{1,2})', text)
        if month_match:
            month = int(month_match.group(1))
            if 1 <= month <= 12:
                metadata['month'] = month
                logger.debug(f"Extracted month: {month}")
        
        # Extract year
        year_match = re.search(r'năm\s*(\d{4})', text)
        if year_match:
            year = int(year_match.group(1))
            metadata['year'] = year
            logger.debug(f"Extracted year: {year}")
        
        doc['metadata'] = metadata
        return doc


# Test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    filter = TemporalFilter()
    
    # Test data
    test_docs = [
        {
            'text': 'Phong trào thi đua tháng 8 năm 2025',
            'metadata': {'month': 8, 'year': 2025}
        },
        {
            'text': 'Chủ đề lãnh đạo năm 2025',
            'metadata': {'year': 2025}
        },
        {
            'text': 'Mệnh lệnh công tác tháng 3',
            'metadata': {'month': 3, 'year': 2025}
        }
    ]
    
    # Test filtering by month
    print("\n" + "="*60)
    print("Test 1: Filter by month 8")
    print("="*60)
    filtered = filter.filter_by_time(test_docs, {'month': 8})
    for doc in filtered:
        print(f"- {doc['text']}")
    
    # Test filtering by year
    print("\n" + "="*60)
    print("Test 2: Filter by year 2025")
    print("="*60)
    filtered = filter.filter_by_time(test_docs, {'year': 2025})
    for doc in filtered:
        print(f"- {doc['text']}")
    
    # Test filtering by quarter (Q2 = months 4,5,6)
    print("\n" + "="*60)
    print("Test 3: Filter by Q2 (months 4,5,6)")
    print("="*60)
    filtered = filter.filter_by_time(test_docs, {'months': [4, 5, 6]})
    for doc in filtered:
        print(f"- {doc['text']}")
    
    # Test metadata extraction
    print("\n" + "="*60)
    print("Test 4: Extract temporal metadata")
    print("="*60)
    new_doc = {'text': 'Nghị quyết tháng 12 năm 2024'}
    enriched = filter.add_temporal_metadata(new_doc)
    print(f"Metadata: {enriched.get('metadata')}")
