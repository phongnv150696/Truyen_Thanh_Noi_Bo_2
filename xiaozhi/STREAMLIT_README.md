# 🤖 Xiaozhi RAG Chat - Streamlit Web UI

## 📋 Giới thiệu

Web UI offline dành cho hệ thống RAG (Retrieval-Augmented Generation) của Xiaozhi. Cho phép bạn hỏi đáp trực tiếp với AI thông qua giao diện web đẹp mắt, không cần kết nối internet (chỉ cần Ollama local).

## ✨ Tính năng

- ✅ **Giao diện đẹp**: Thiết kế gradient hiện đại với màu sắc tươi sáng
- ✅ **Streaming Response**: Hiển thị câu trả lời real-time từng từ
- ✅ **RAG Integration**: Tích hợp hoàn toàn với hệ thống RAG Xiaozhi
- ✅ **Lịch sử Chat**: Lưu và hiển thị toàn bộ cuộc hội thoại
- ✅ **Thống kê**: Xem thông tin về model, config và performance
- ✅ **Offline**: Hoạt động 100% offline với Ollama

## 🚀 Cài đặt và Sử dụng

### Bước 1: Cài đặt dependencies

```powershell
cd xiaozhi-local-chat\main\xiaozhi-server

# Nếu chưa có virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# Cài đặt các package cần thiết
pip install -r requirements.txt
pip install -r requirements_streamlit.txt
```

### Bước 2: Đảm bảo Ollama đang chạy

Streamlit UI cần Ollama để hoạt động. Kiểm tra bằng cách:

```powershell
# Kiểm tra Ollama có đang chạy không
curl http://localhost:11434/api/tags

# Nếu chưa chạy, khởi động Ollama
ollama serve
```

### Bước 3: Khởi động Streamlit UI

**Cách 1: Dùng script tự động (Khuyến nghị)**

```powershell
.\run_streamlit.ps1
```

Script sẽ tự động:
- Kích hoạt virtual environment
- Kiểm tra và cài đặt Streamlit (nếu cần)
- Kiểm tra Ollama server
- Khởi động web UI với theme tối ưu

**Cách 2: Chạy thủ công**

```powershell
# Kích hoạt virtual environment
.\venv\Scripts\Activate.ps1

# Chạy Streamlit
streamlit run streamlit_app.py
```

### Bước 4: Truy cập Web UI

Sau khi khởi động, trình duyệt sẽ tự động mở tại:

```
http://localhost:8501
```

## 📖 Hướng dẫn sử dụng

1. **Nhập câu hỏi**: Gõ câu hỏi vào ô input ở cuối trang
2. **Gửi**: Nhấn Enter hoặc nút "📤 Gửi"
3. **Xem kết quả**: Câu trả lời sẽ được hiển thị real-time với streaming
4. **Lịch sử**: Tất cả câu hỏi và trả lời được lưu trong session
5. **Xóa lịch sử**: Dùng nút "🗑️ Xóa lịch sử chat" ở sidebar

## 🎨 Giao diện

### Màn hình chính
- **Chat Area**: Hiển thị lịch sử hội thoại với bubble chat đẹp mắt
- **Input Box**: Ô nhập câu hỏi ở cuối trang
- **Submit Button**: Nút gửi câu hỏi

### Sidebar
- **Thống kê hệ thống**: Model name, temperature, max tokens, chunk size
- **Nút xóa lịch sử**: Clear toàn bộ chat history
- **Thông tin**: Features của RAG system
- **Hướng dẫn**: Quick guide sử dụng

## ⚙️ Cấu hình

Streamlit UI sử dụng cấu hình từ file `config.yaml`:

```yaml
LLM:
  RAG_OllamaLLM:
    type: rag
    model_name: "llama3.2:3b"
    base_url: http://localhost:11434
    temperature: 0.1
    max_tokens: 512
    # ... các cấu hình RAG khác
```

Bạn có thể điều chỉnh các tham số này trong `config.yaml` để thay đổi hành vi của chatbot.

## 🧪 Testing

Trước khi chạy Streamlit UI, bạn có thể test RAG system trước:

```powershell
# Kích hoạt virtual environment
.\venv\Scripts\Activate.ps1

# Chạy test script
python test_rag_streamlit.py
```

Script sẽ:
1. Load config từ `config.yaml`
2. Khởi tạo RAG system
3. Test với câu hỏi mẫu
4. Hiển thị response streaming

Nếu test thành công, bạn có thể an tâm chạy Streamlit UI.

## 🔧 Troubleshooting

### Lỗi: 'async_generator' object is not iterable

```
✅ ĐÃ SỬA: Lỗi này xảy ra do chat_stream() trả về async generator
Giải pháp đã áp dụng:
- Sử dụng asyncio.new_event_loop() để handle async
- Wrapper function collect_streaming_response()
- Properly await async methods
```

### Lỗi: Không kết nối được Ollama

```
Giải pháp:
1. Kiểm tra Ollama đang chạy: curl http://localhost:11434/api/tags
2. Khởi động Ollama: ollama serve
3. Pull model nếu chưa có: ollama pull llama3.2:3b
```

### Lỗi: Streamlit không tìm thấy module

```
Giải pháp:
pip install -r requirements_streamlit.txt
```

### Lỗi: Import error từ core.providers

```
Giải pháp:
- Đảm bảo bạn đang chạy từ thư mục xiaozhi-server
- Kiểm tra sys.path trong streamlit_app.py
```

### Lỗi: ChromaDB không tìm thấy collection

```
Giải pháp:
- Chạy script reindex để tạo lại ChromaDB:
  python reindex_documents.py
```

## 📊 So sánh với WebSocket Server

| Feature | Streamlit UI | WebSocket Server |
|---------|--------------|------------------|
| **Giao diện** | Web UI đẹp | Cần client riêng |
| **Dễ sử dụng** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Streaming** | ✅ Real-time | ✅ Real-time |
| **Lịch sử chat** | ✅ Tự động | ❌ Client phải lưu |
| **ESP32 Support** | ❌ | ✅ |
| **Voice Input** | ❌ | ✅ |
| **Use Case** | Testing, Demo | Production, IoT |

## 💡 Tips

1. **Tốc độ**: Giảm `max_tokens` trong config để có response nhanh hơn
2. **Độ chính xác**: Tăng `top_k_rerank` để lấy nhiều context hơn
3. **Memory**: Giảm `max_buffer_messages` nếu chat quá dài
4. **Theme**: Thay đổi màu sắc trong `run_streamlit.ps1`

## 🔗 Liên quan

- **Main Server**: `app.py` - WebSocket server cho ESP32
- **RAG System**: `core/providers/llm/rag/rag_ollama.py`
- **Config**: `config.yaml`
- **Documents**: `data/documents/` - Thư mục chứa tài liệu cho RAG

## 📝 Notes

- Web UI này **chỉ dùng cho testing và demo**
- Không có voice input/output như ESP32 client
- Tất cả dữ liệu chat chỉ lưu trong session (mất khi reload)
- Để production với voice, dùng WebSocket server + ESP32

## 🎯 Next Steps

1. ✅ Tạo web UI cơ bản với Streamlit
2. 🔄 Thêm voice input (Web Speech API)
3. 🔄 Thêm voice output (Text-to-Speech)
4. 🔄 Lưu lịch sử chat vào database
5. 🔄 Multi-user support

---

**Tạo bởi**: Xiaozhi Local Chat Team  
**Version**: 1.0.0  
**Last Updated**: 2025-12-27
