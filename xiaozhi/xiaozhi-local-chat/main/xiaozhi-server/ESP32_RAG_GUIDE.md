# Hướng dẫn chạy RAG System với ESP32

## ✅ Tổng hợp những gì đã hoàn thành

Tôi đã tích hợp RAG hoàn toàn vào hệ thống Xiaozhi. Bây giờ khi ESP32 gửi voice/text, hệ thống sẽ:

1. **ESP32** → WebSocket → **Server**
2. **ASR** (Sherpa) → Text query
3. **RAG System**:
   - Retrieve documents từ ChromaDB
   - Re-rank với cross-encoder
   - Generate response qua Ollama
4. **TTS** (pyttsx3) → Voice audio
5. **Server** → WebSocket → **ESP32**

## 📝 Các file đã được update

### Files đã sửa:
- ✅ `core/utils/llm.py` - Thêm support cho RAG provider
- ✅ `core/utils/modules_initialize.py` - Auto-init RAG khi startup
- ✅ `config.yaml` - Thêm RAG_OllamaLLM config
- ✅ `requirements.txt` - Thêm RAG dependencies

### Files mới tạo:
- ✅ `core/providers/llm/rag/` - Toàn bộ RAG modules
- ✅ `setup_rag.py` - Script quản lý RAG
- ✅ `benchmark_formats.py` - Test performance
- ✅ `RAG_GUIDE.md` - Hướng dẫn sử dụng
- ✅ `test_rag_sample.md` - Tài liệu mẫu

## 🚀 Cách chạy

### 1. Cài đặt dependencies

```bash
cd c:\Users\Admin\Desktop\Xiaozhi\xiaozhi-local-chat\main\xiaozhi-server
pip install chromadb sentence-transformers transformers langchain-community PyMuPDF
```

### 2. Khởi tạo RAG và thêm documents

```bash
# Init RAG system
python setup_rag.py --init

# Thêm document mẫu tôi đã tạo
python setup_rag.py --init --add-document c:\Users\Admin\Desktop\Xiaozhi\test_rag_sample.md

# Hoặc thêm documents của bạn
python setup_rag.py --init --add-directory "path\to\your\documents"

# Check stats
python setup_rag.py --stats
```

Expected output:
```
📊 RAG System Statistics
==================================================
Initialized: True
Documents: 5
Collection: xiaozhi_docs
==================================================
```

### 3. Test RAG (Optional)

```bash
# Test quickly
python setup_rag.py --test-query "RAG là gì?"
```

### 4. Chạy server

```bash
python app.py
```

Server sẽ:
- ✅ Load RAG models automatically
- ✅ Listen WebSocket on port 8001
- ✅ Sử dụng RAG cho tất cả queries

### 5. Kết nối ESP32

ESP32 chỉ cần kết nối đến:
```
ws://[your-ip]:8001/xiaozhi/v1/
```

Hoàn toàn không cần thay đổi gì trên ESP32!

## 🔄 Workflow hoàn chỉnh

```
ESP32 (voice) 
    ↓
WebSocket Server
    ↓
VAD + ASR (Sherpa) → "Câu hỏi của user"
    ↓
RAG System:
  - Query ChromaDB
  - Retrieve top 10 chunks
  - Re-rank to top 3
  - Create context
    ↓
Ollama (qwen2.5:1.5b) + context → "Câu trả lời RAG"
    ↓
TTS (pyttsx3) → audio
    ↓
WebSocket → ESP32 (plays audio)
```

## 🎯 Test với ESP32

1. **Chạy server**: `python app.py`
2. **ESP32 connect**: Kết nối WebSocket
3. **Nói vào mic**: "RAG là gì?"
4. **Nghe response**: ESP32 sẽ play audio trả lời từ tài liệu

## ⚙️ Configuration linh hoạt

### Chuyển về direct Ollama (không RAG)

Edit `config.yaml` line 109:
```yaml
selected_module:
  LLM: OllamaLLM  # Thay vì RAG_OllamaLLM
```

### Chọn embedding model

Edit `config.yaml` line 157:
```yaml
RAG_OllamaLLM:
  embedding_model: "lightweight"  # hoặc "balanced" hoặc "quality"
```

### Điều chỉnh tốc độ

```yaml
RAG_OllamaLLM:
  n_results: 10    # Giảm xuống 5 cho nhanh hơn
  top_k_rerank: 3  # Giảm xuống 2 cho nhanh hơn
  cache_size: 100  # Tăng lên 200 nếu có RAM
```

## ❗ Troubleshooting

### Server không start

```bash
# Check logs
type tmp\server.log
```

### RAG initialization failed

```bash
# Re-init
python setup_rag.py --init
```

### ESP32 không nhận được response

1. Check server logs
2. Verify RAG stats: `python setup_rag.py --stats`
3. Test query directly: `python setup_rag.py --test-query "test"`

## 🎉 Tất cả đã sẵn sàng!

Bây giờ bạn chỉ cần:
1. ✅ Thêm documents vào RAG
2. ✅ Chạy server
3. ✅ ESP32 connect và nói chuyện

Model sẽ trả lời dựa trên documents của bạn, giọng nói qua pyttsx3!
