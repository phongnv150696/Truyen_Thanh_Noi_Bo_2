# 🚀 Hướng dẫn sử dụng Xiaozhi Local Chat

## Tổng quan

Xiaozhi Local Chat là phiên bản rút gọn của dự án xiaozhi-esp32-server, được tối ưu hóa để chạy hoàn toàn offline với khả năng chat AI bằng tiếng Việt.

## 📋 Yêu cầu hệ thống

- **Python**: 3.10+
- **RAM**: 4GB (tối thiểu), 8GB+ (khuyến nghị)
- **CPU**: 2 cores (tối thiểu), 4 cores+ (khuyến nghị)
- **Disk**: 10GB trống
- **OS**: Linux, macOS, hoặc Windows

## 🛠️ Cài đặt

### 1. Cài đặt Ollama

```bash
# Linux/macOS
curl -fsSL https://ollama.ai/install.sh | sh

# Windows - tải từ https://ollama.ai/download
```

### 2. Tải model Ollama

```bash
# Model chính (khuyến nghị cho tiếng Việt)
ollama pull qwen2.5:7b

# Model nhẹ hơn (cho máy yếu)
ollama pull llama3.2:3b
```

### 3. Cài đặt Python dependencies

```bash
cd xiaozhi-local-chat/main/xiaozhi-server
pip install -r requirements.txt
```

## 🧪 Test các thành phần

Trước khi chạy server, hãy test từng thành phần:

```bash
cd xiaozhi-local-chat
python test-components.py
```

Script sẽ kiểm tra:
- ✅ Kết nối Ollama
- ✅ FunASR (nhận dạng giọng nói)
- ✅ EdgeTTS (phát âm thanh)
- ✅ SileroVAD (phát hiện giọng nói)

## 🚀 Chạy server

### Cách 1: Chạy thủ công

```bash
cd xiaozhi-local-chat/main/xiaozhi-server
python app.py
```

### Cách 2: Sử dụng script tự động

```bash
# Chạy setup (cài đặt tự động)
chmod +x setup.sh
./setup.sh

# Khởi động server
chmod +x start.sh
./start.sh
```

## 🔧 Cấu hình

File `config.yaml` chứa tất cả cấu hình. Các thiết lập quan trọng:

### Model Ollama
```yaml
LLM:
  OllamaLLM:
    model_name: "qwen2.5:7b"  # Thay đổi model tại đây
    base_url: "http://localhost:11434"
```

### Giọng TTS tiếng Việt
```yaml
TTS:
  EdgeTTS:
    voice: "vi-VN-HoaiMyNeural"  # Giọng nữ
    # Các lựa chọn khác:
    # vi-VN-NamMinhNeural (nam)
    # vi-VN-HuongTrangNeural (nữ)
```

### Từ khóa đánh thức
```yaml
wakeup_words:
  - "xin chào trợ lý"
  - "hey trợ lý"
  - "kích hoạt trợ lý"
```

## 🎯 Sử dụng với ESP32

1. **Flash firmware**: Cài đặt firmware xiaozhi-esp32 lên ESP32
2. **Cấu hình ESP32**: Trỏ tới địa chỉ server local
3. **Kết nối**: ESP32 sẽ kết nối tới `ws://localhost:8000/xiaozhi/v1/`

## 🎤 Tương tác giọng nói

- **Đánh thức**: Nói một trong các từ khóa đánh thức
- **Chat**: Sau khi đánh thức, nói câu hỏi của bạn
- **Ngắt kết nối**: Nói "thoát", "kết thúc", hoặc "dừng"

## 🔧 Tùy chỉnh nâng cao

### Thay đổi model Ollama

1. Tải model mới:
```bash
ollama pull [model_name]
```

2. Cập nhật `config.yaml`:
```yaml
model_name: "[model_name]"
```

3. Khởi động lại server

### Thay đổi giọng TTS

Chỉnh sửa `config.yaml`:
```yaml
voice: "vi-VN-NamMinhNeural"  # Giọng nam
```

### Tối ưu performance

- **Cho máy yếu**: Sử dụng model `llama3.2:3b`
- **Cho máy mạnh**: Sử dụng model `qwen2.5:7b` hoặc lớn hơn
- **VRAM thấp**: Giảm `max_tokens` trong config

## 🐛 Xử lý sự cố

### Ollama không kết nối
```bash
# Kiểm tra Ollama đang chạy
ollama list

# Khởi động Ollama
ollama serve
```

### ASR không hoạt động
- Đảm bảo model SenseVoiceSmall đã được tải
- Kiểm tra thư mục `models/SenseVoiceSmall/`

### TTS không có âm thanh
- EdgeTTS cần kết nối internet
- Kiểm tra cấu hình voice trong config.yaml

### Server không khởi động
- Kiểm tra Python version: `python --version`
- Kiểm tra dependencies: `pip list`
- Xem log lỗi chi tiết

## 📊 Giám sát

Server chạy trên:
- **WebSocket**: `ws://localhost:8000/xiaozhi/v1/`
- **HTTP**: `http://localhost:8003/`

## 🎉 Mẹo sử dụng

1. **Chat tự nhiên**: Hỏi bằng tiếng Việt tự nhiên
2. **Hỏi đa dạng**: Từ thời tiết, tin tức, đến giải thích khái niệm
3. **Tương tác giọng nói**: Phù hợp cho người già, trẻ em, hoặc khi bận rộn
4. **Offline hoàn toàn**: Không phụ thuộc internet sau khi setup

## 📝 License

Dựa trên dự án xiaozhi-esp32-server (MIT License)

---

🎊 **Chúc bạn sử dụng vui vẻ với Xiaozhi Local Chat!**

