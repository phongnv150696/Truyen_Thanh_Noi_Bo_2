"""
Document Summarizer cho RAG
Tóm tắt tài liệu theo category hoặc toàn bộ
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class DocumentSummarizer:
    """
    Xử lý yêu cầu tóm tắt tài liệu
    
    Supports:
    - Tóm tắt theo category cụ thể
    - Tóm tắt toàn bộ tài liệu (all categories)
    """
    
    def __init__(self, rag_provider, ollama_client):
        """
        Args:
            rag_provider: RAG provider instance (để lấy documents)
            ollama_client: Ollama client (để tóm tắt)
        """
        self.rag = rag_provider
        self.ollama = ollama_client
        self.model_name = "qwen2.5:3b"
    
    def summarize_category(self, category: str, max_docs: int = 50) -> str:
        """
        Tóm tắt tài liệu theo category
        
        Args:
            category: Category name (chinh_tri/quan_su/hau_can/ky_thuat)
            max_docs: Số lượng documents tối đa để tóm tắt
            
        Returns:
            Summary text
        """
        logger.info(f"Summarizing category: {category}")
        
        try:
            # Get collection for category
            collection_name = f"xiaozhi_{category}"
            
            if not hasattr(self.rag, 'collections') or category not in self.rag.collections:
                logger.warning(f"Collection {collection_name} not found")
                return f"Không tìm thấy tài liệu về {category}"
            
            collection = self.rag.collections[category]
            
            # Get all documents from collection
            results = collection.get(limit=max_docs)
            
            if not results or not results.get('documents'):
                return f"Không có tài liệu nào trong category {category}"
            
            documents = results['documents']
            
            # Combine documents
            full_text = "\n\n".join(documents[:max_docs])
            
            # Truncate if too long (keep first 8000 chars)
            if len(full_text) > 8000:
                full_text = full_text[:8000] + "\n...(còn tiếp)"
            
            # Create summary prompt
            category_names = {
                'chinh_tri': 'Công tác Đảng và chính trị',
                'quan_su': 'Công tác quân sự và huấn luyện',
                'hau_can': 'Công tác hậu cần',
                'ky_thuat': 'Công tác kỹ thuật'
            }
            
            category_display = category_names.get(category, category)
            
            prompt = f"""Tóm tắt nội dung tài liệu về {category_display} sau đây:

{full_text}

Yêu cầu:
- Tóm tắt ngắn gọn, đầy đủ các điểm chính
- Liệt kê các thông tin quan trọng nhất
- Sử dụng bullet points để dễ đọc

Tóm tắt:"""
            
            # Generate summary with Ollama
            response = self.ollama.chat(
                model=self.model_name,
                messages=[
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                options={
                    'temperature': 0.3,
                    'max_tokens': 1024
                }
            )
            
            summary = response['message']['content']
            
            logger.info(f"Summary generated for {category}: {len(summary)} chars")
            
            return summary
            
        except Exception as e:
            logger.error(f"Error summarizing {category}: {e}", exc_info=True)
            return f"Lỗi khi tóm tắt tài liệu {category}: {str(e)}"
    
    def summarize_all(self) -> str:
        """
        Tóm tắt toàn bộ tài liệu (all categories)
        
        Returns:
            Combined summary of all categories
        """
        logger.info("Summarizing all categories")
        
        categories = ['chinh_tri', 'quan_su', 'hau_can', 'ky_thuat']
        summaries = {}
        
        # Get summary for each category
        for category in categories:
            try:
                summaries[category] = self.summarize_category(category, max_docs=30)
            except Exception as e:
                logger.warning(f"Failed to summarize {category}: {e}")
                summaries[category] = f"Không thể tóm tắt {category}"
        
        # Combine all summaries
        combined = f"""# Tóm Tắt Toàn Bộ Tài Liệu

## 1. Công Tác Chính Trị
{summaries.get('chinh_tri', 'Không có')}

## 2. Công Tác Quân Sự
{summaries.get('quan_su', 'Không có')}

## 3. Công Tác Hậu Cần
{summaries.get('hau_can', 'Không có')}

## 4. Công Tác Kỹ Thuật
{summaries.get('ky_thuat', 'Không có')}
"""
        
        logger.info(f"All categories summarized: {len(combined)} chars")
        
        return combined
    
    def summarize_query_based(self, query: str, category: Optional[str] = None) -> str:
        """
        Tóm tắt dựa trên query của người dùng
        
        Args:
            query: User's query
            category: Optional specific category
            
        Returns:
            Targeted summary
        """
        if category:
            return self.summarize_category(category)
        else:
            return self.summarize_all()


# Test
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Mock test
    class MockRAG:
        def __init__(self):
            self.collections = {
                'chinh_tri': type('obj', (object,), {
                    'get': lambda limit=None: {
                        'documents': [
                            'Chủ đề lãnh đạo 2025: Dân chủ, kỷ cương',
                            'Phong trào thi đua: Dân chủ, đoàn kết'
                        ]
                    }
                })()
            }
    
    class MockOllama:
        def chat(self, **kwargs):
            return {
                'message': {
                    'content': 'Tóm tắt: Tài liệu chính trị năm 2025 tập trung vào dân chủ và kỷ cương.'
                }
            }
    
    summarizer = DocumentSummarizer(MockRAG(), MockOllama())
    summary = summarizer.summarize_category('chinh_tri')
    print(f"Summary: {summary}")
