# Tài liệu về RAG System

## Giới thiệu về RAG

RAG (Retrieval-Augmented Generation) là một kỹ thuật kết hợp retrieval và generation trong AI. Hệ thống này giúp model trả lời câu hỏi dựa trên tài liệu cụ thể thay vì kiến thức chung.

## Các thành phần chính

### 1. Document Loader
Document loader có nhiệm vụ đọc và xử lý các định dạng file khác nhau như PDF, Markdown, và text files.

**Ưu điểm của Markdown:**
- Parsing nhanh hơn PDF
- Không cần thư viện đặc biệt
- Dễ dàng chỉnh sửa và maintain

### 2. Embedding Model
Embedding model chuyển đổi text thành vectors để có thể tìm kiếm semantic.

**Các loại embedding models:**
- **Lightweight**: Nhỏ gọn, nhanh (all-MiniLM-L6-v2)
- **Balanced**: Cân bằng giữa tốc độ và chất lượng
- **Quality**: Chất lượng cao nhất cho tiếng Việt

### 3. Vector Store
Vector store lưu trữ embeddings và cho phép tìm kiếm nhanh chóng.

ChromaDB được sử dụng vì:
- Persistent storage
- Cosine similarity efficient
- Easy integration với Python

### 4. Cross-Encoder Re-ranking
Cross-encoder giúp sắp xếp lại kết quả tìm kiếm để chọn documents phù hợp nhất.

## Quy trình RAG

1. **Indexing**: Tài liệu được chia thành chunks và tạo embeddings
2. **Retrieval**: Khi có query, tìm kiếm chunks liên quan nhất
3. **Re-ranking**: Sắp xếp lại kết quả bằng cross-encoder
4. **Generation**: Model sinh câu trả lời dựa trên context

## Best Practices

1. **Chunk size**: 400-600 characters là optimal
2. **Overlap**: 100 characters để giữ context
3. **Top K**: 3-5 documents là đủ cho most cases
4. **Cache**: Enable để tăng tốc queries lặp lại
