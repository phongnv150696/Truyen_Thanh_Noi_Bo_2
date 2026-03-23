# RAG System - Hướng dẫn sử dụng

## Tổng quan

Hệ thống RAG (Retrieval-Augmented Generation) cho phép Xiaozhi trả lời câu hỏi dựa trên tài liệu bạn cung cấp thay vì kiến thức chung của model.

## Cài đặt

### 1. Cài đặt dependencies

```bash
cd main/xiaozhi-server
pip install -r requirements.txt
```

**Lưu ý:** Nếu dùng embedding model "quality", cần cài thêm:
```bash
pip install pyvi
```

### 2. Khởi tạo RAG system

```bash
python setup_rag.py --init
```

Lệnh này sẽ:
- Download embedding models (~80MB cho lightweight)
- Khởi tạo ChromaDB vector store
- Tạo directories cần thiết

## Quản lý tài liệu

### Thêm tài liệu đơn lẻ

```bash
# PDF
python setup_rag.py --init --add-document path/to/document.pdf

# Markdown (nhanh hơn)
python setup_rag.py --init --add-document path/to/document.md

# Text file
python setup_rag.py --init --add-document path/to/document.txt
```

### Thêm thư mục tài liệu

```bash
python setup_rag.py --init --add-directory ./data/documents
```

### Kiểm tra trạng thái

```bash
python setup_rag.py --stats
```

Output:
```
📊 RAG System Statistics
==================================================
Initialized: True
RAG Enabled: True
Embedding Model: sentence-transformers/all-MiniLM-L6-v2
Embedding Type: light weight
LLM Model: qwen2.5:1.5b

Vector Store:
  Initialized: True
  Documents: 150
  Path: ./data/rag-chroma
  Collection: xiaozhi_docs
==================================================
```

## Testing

### Test câu hỏi đơn

```bash
python setup_rag.py --init --test-query "Tóm tắt nội dung tài liệu về RAG?"
```

### Chế độ interactive

```bash
python setup_rag.py --init --interactive
```

Sau đó nhập câu hỏi:
```
💬 Interactive Query Mode (type 'quit' to exit)
--------------------------------------------------

❓ Your question: RAG là gì?

🔍 Testing query: RAG là gì?
--------------------------------------------------
Dựa trên tài liệu, RAG (Retrieval-Augmented Generation) là một kỹ thuật
kết hợp việc truy vấn thông tin từ cơ sở dữ liệu với khả năng sinh văn bản
của mô hình ngôn ngữ...
--------------------------------------------------
✅ Query completed (245 characters)
```

## So sánh hiệu năng PDF vs MD

```bash
python benchmark_formats.py
```

Output mẫu:
```
🚀 RAG Document Format Benchmark
============================================================

Testing with 10KB documents
Markdown average: 0.125s
PDF average: 0.458s

🎯 Overall: Markdown is 3.66x faster

💡 Recommendation:
   ✅ Use MARKDOWN format for best performance
```

## Chạy server với RAG

```bash
cd main/xiaozhi-server
python app.py
```

Server sẽ tự động:
1. Load RAG models khi khởi động
2. Sử dụng RAG để trả lời câu hỏi
3. Giữ pyttsx3 cho voice output

## Cấu hình

### Thay đổi embedding model

Sửa trong `config.yaml`:

```yaml
LLM:
  RAG_OllamaLLM:
    embedding_model: "lightweight"  # Hoặc: balanced, quality
```

**Lựa chọn:**
- `lightweight`: 80MB, cực nhanh, phù hợp hầu hết trường hợp
- `balanced`: 120MB, cân bằng tốc độ/chất lượng
- `quality`: 400MB, chất lượng tốt nhất cho tiếng Việt (cần pyvi)

### Tối ưu tốc độ

```yaml
LLM:
  RAG_OllamaLLM:
    # Giảm số documents retrieve
    n_results: 10  # Giảm xuống 5-7 nếu muốn nhanh hơn
    top_k_rerank: 3  # Giảm xuống 2 nếu muốn nhanh hơn
    
    # Tăng cache size
    cache_size: 100  # Tăng lên 200-500 nếu có RAM
    
    # Batch size
    batch_size: 32  # Tăng lên 64 nếu có GPU
```

### Chuyển về direct Ollama (không RAG)

Sửa trong `config.yaml`:

```yaml
selected_module:
  LLM: OllamaLLM  # Thay vì RAG_OllamaLLM
```

## Troubleshooting

### Lỗi: "Models not initialized"

```bash
# Re-initialize
python setup_rag.py --init
```

### Lỗi: Documents not found

```bash
# Kiểm tra xem đã add documents chưa
python setup_rag.py --stats

# Add documents
python setup_rag.py --init --add-document your_file.md
```

### Lỗi: pyvi not found (chỉ với quality model)

```bash
pip install pyvi
```

Hoặc chuyển sang lightweight model trong config.yaml.

### Chậm khi query

1. **Chuyển sang lightweight model**
2. **Giảm n_results và top_k_rerank**
3. **Sử dụng MD thay vì PDF**
4. **Tăng cache_size**

## Performance Tips

### 1. Ưu tiên Markdown format
- Parse nhanh hơn PDF ~3-4x
- Chuyển đổi PDF → MD nếu có thể

### 2. Optimize chunk size
- Chunk nhỏ hơn = nhanh hơn nhưng kém context
- Chunk lớn hơn = chậm hơn nhưng tốt hơn
- Default 400 là balanced

### 3. Cache query results
- Câu hỏi lặp lại sẽ < 50ms
- Enable cache trong config (default: enabled)

### 4. Sử dụng GPU nếu có
- Models tự động detect CUDA
- Nhanh hơn ~2-3x so với CPU

## Examples

### Example 1: Thêm documentation project

```bash
# Clone docs
git clone https://github.com/yourproject/docs
cd docs

# Add to RAG
python ../xiaozhi-local-chat/main/xiaozhi-server/setup_rag.py --init --add-directory ./

# Test
python ../xiaozhi-local-chat/main/xiaozhi-server/setup_rag.py --test-query "Làm sao để cài đặt project?"
```

### Example 2: Personal knowledge base

```bash
# Add notes
python setup_rag.py --init --add-directory ~/Documents/notes/

# Query
python setup_rag.py --interactive
```

## API Usage (trong code)

```python
from core.providers.llm.rag.rag_ollama import LLMProvider

# Khởi tạo
config = {...}  # từ config.yaml
provider = LLMProvider(config)
await provider.initialize()

# Add document
result = provider.add_documents("path/to/doc.md")

# Query
async for chunk in provider.chat_stream("Câu hỏi của bạn"):
    print(chunk, end="")

# Stats
stats = provider.get_stats()
print(stats)
```

## File Structure

```
xiaozhi-server/
├── core/providers/llm/rag/
│   ├── config.py              # RAG config
│   ├── document_loader.py     # PDF/MD loader
│   ├── model_manager.py       # Embedding models
│   ├── vector_store.py        # ChromaDB manager
│   └── rag_ollama.py         # RAG LLM provider
├── data/
│   ├── rag-chroma/           # Vector DB
│   └── documents/            # Your documents
├── setup_rag.py              # Setup script
└── benchmark_formats.py      # Performance test
```

## Next Steps

1. ✅ Add documents vào system
2. ✅ Test queries để verify
3. ✅ Benchmark để chọn optimal format
4. ✅ Adjust config theo use case
5. ✅ Start server và sử dụng qua WebSocket

## Support

Nếu gặp vấn đề, check logs tại `tmp/server.log`
