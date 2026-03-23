# Xiaozhi Local Chat - Trợ lý AI hội thoại tiếng Việt

Dự án này là phiên bản rút gọn của [xiaozhi-esp32-server](https://github.com/xinnan-tech/xiaozhi-esp32-server), được tối ưu hóa để chạy hoàn toàn offline với các tính năng chat AI cơ bản sử dụng tiếng Việt.

## ✨ Tính năng chính

- 🤖 **Chat AI local** với Ollama (không cần internet)
- 🗣️ **Nhận dạng giọng nói** bằng FunASR local (SenseVoice)
- 🔊 **Phát âm thanh** bằng EdgeTTS với giọng tiếng Việt
- 🎯 **Giao tiếp streaming** thời gian thực
- 🇻🇳 **Hỗ trợ tiếng Việt** đầy đủ

## 🏗️ Kiến trúc

```
xiaozhi-local-chat/
├── main/
│   └── xiaozhi-server/          # Core server
│       ├── app.py              # Main application
│       ├── config.yaml         # Cấu hình local
│       ├── requirements.txt    # Dependencies tối ưu
│       ├── core/               # Core modules
│       │   ├── providers/      # AI providers (ASR, LLM, TTS, VAD)
│       │   └── utils/          # Utilities
│       ├── config/             # Config management
│       └── models/             # Local AI models
└── README.md
```

## 🚀 Cài đặt và chạy

### 1. Cài đặt Ollama

```bash
# Trên Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Trên Windows - tải từ: https://ollama.ai/download
```

### 2. Tải model Ollama hỗ trợ tiếng Việt

```bash
# Model Qwen2.5 7B - khuyến nghị cho tiếng Việt
ollama pull qwen2.5:7b

# Hoặc model nhẹ hơn cho máy yếu
ollama pull llama3.2:3b
```

### 3. Cài đặt dependencies Python

```bash
cd xiaozhi-local-chat/main/xiaozhi-server
pip install -r requirements.txt
```

### 4. Chạy server

```bash
python app.py
```

Server sẽ chạy trên:
- WebSocket: `ws://localhost:8000/xiaozhi/v1/`
- HTTP: `http://localhost:8003/`

## ⚙️ Cấu hình

File `config.yaml` đã được tối ưu hóa cho chạy local:

### LLM Configuration
```yaml
LLM:
  OllamaLLM:
    type: ollama
    model_name: "qwen2.5:7b"  # Thay đổi model tại đây
    base_url: http://localhost:11434
```

### TTS với giọng tiếng Việt
```yaml
TTS:
  EdgeTTS:
    type: edge
    voice: "vi-VN-HoaiMyNeural"  # Giọng nữ tiếng Việt
```

### Wakeup words tiếng Việt
```yaml
wakeup_words:
  - "xin chào trợ lý"
  - "hey trợ lý"
  - "kích hoạt trợ lý"
```

## 🎯 Sử dụng

### 1. Kết nối với ESP32
- Flash firmware xiaozhi-esp32 lên ESP32
- Cấu hình ESP32 kết nối tới server local

### 2. Chat qua WebSocket
Server lắng nghe trên WebSocket để nhận audio stream từ ESP32 và trả về phản hồi.

### 3. Test riêng lẻ
Có thể test từng module riêng biệt qua các tool trong `module_test`.

## 🔧 Tùy chỉnh

### Thay đổi model Ollama
```bash
# Tải model mới
ollama pull [model_name]

# Cập nhật config.yaml
model_name: "[model_name]"
```

### Thay đổi giọng TTS
Các giọng tiếng Việt có sẵn:
- `vi-VN-HoaiMyNeural` (nữ - khuyến nghị)
- `vi-VN-NamMinhNeural` (nam)
- `vi-VN-HuongTrangNeural` (nữ)

## 📋 Yêu cầu hệ thống

### Minimum
- RAM: 4GB
- CPU: 2 cores
- Disk: 10GB free space

### Recommended
- RAM: 8GB+
- CPU: 4 cores+
- GPU: Tùy chọn (tăng tốc inference)

## 🐛 Troubleshooting

### Ollama không kết nối
```bash
# Kiểm tra Ollama đang chạy
ollama list

# Khởi động Ollama service
ollama serve
```

### ASR không hoạt động
- Đảm bảo model SenseVoiceSmall đã được tải
- Kiểm tra thư mục `models/SenseVoiceSmall/`

### TTS không có âm thanh
- Đảm bảo có kết nối internet (EdgeTTS cần online)
- Kiểm tra cấu hình voice trong config.yaml

## 📝 License

MIT License - giống dự án gốc xiaozhi-esp32-server

## 🙏 Credits

Dựa trên dự án [xiaozhi-esp32-server](https://github.com/xinnan-tech/xiaozhi-esp32-server) của nhóm Giáo sư Lưu Tư Nguyên (Đại học Bách khoa Nam Trung Quốc).

Được tối ưu hóa để chạy local và hỗ trợ tiếng Việt.

