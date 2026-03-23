# Quick Start - RAG với ESP32

## TÓM TẮT

Đã tích hợp hoàn toàn RAG vào Xiaozhi local chat. ESP32 có thể chat voice với AI dựa trên documents của bạn!

## 3 BƯỚC CHẠY

### 1. Install (1 lần duy nhất)
```bash
cd c:\Users\Admin\Desktop\Xiaozhi\xiaozhi-local-chat\main\xiaozhi-server
pip install chromadb sentence-transformers transformers langchain-community PyMuPDF
```

### 2. Setup Documents
```bash
# Init RAG
python setup_rag.py --init

# Thêm tài liệu mẫu
python setup_rag.py --init --add-document c:\Users\Admin\Desktop\Xiaozhi\test_rag_sample.md

# (Optional) Thêm documents của bạn
python setup_rag.py --init --add-directory "path\to\your\docs"
```

### 3. Chạy Server
```bash
python app.py
```

**Done!** ESP32 kết nối `ws://[your-ip]:8001/xiaozhi/v1/` và chat voice!

---

## WORKFLOW

```
ESP32 (voice) → WebSocket → VAD → ASR
    ↓
RAG: Query docs → Retrieve → Re-rank → Context
    ↓
Ollama + Context → Response
    ↓
TTS (pyttsx3) → Voice → ESP32 plays
```

## FILES QUAN TRỌNG

- **ESP32_RAG_GUIDE.md** - Hướng dẫn chi tiết ESP32
- **RAG_GUIDE.md** - Hướng dẫn quản lý RAG
- **setup_rag.py** - Script quản lý documents
- **config.yaml** - Cấu hình (line 109: chọn LLM)

## TEST NHANH

```bash
# Test RAG query
python setup_rag.py --test-query "RAG là gì?"

# Test interactive
python setup_rag.py --interactive

# Check stats
python setup_rag.py --stats
```

## CHUYỂN ĐỔI MODE

Edit `config.yaml` line 109:

```yaml
# RAG mode (document-based)
selected_module:
  LLM: RAG_OllamaLLM

# Direct Ollama (general knowledge)
selected_module:
  LLM: OllamaLLM
```

## PERFORMANCE

- **MD format**: 3-4x nhanh hơn PDF
- **Lightweight model**: 3x nhanh hơn quality
- **Cached queries**: < 50ms
- **First query**: ~1-2s

## HỖ TRỢ

Xem chi tiết:
- `ESP32_RAG_GUIDE.md` - ESP32 integration
- `RAG_GUIDE.md` - Full documentation
- `walkthrough.md` - Technical details
