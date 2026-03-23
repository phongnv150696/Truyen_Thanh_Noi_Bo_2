# 📁 Cấu trúc dự án Xiaozhi Local Chat

## Tổng quan

Dự án này được rút gọn từ xiaozhi-esp32-server gốc, chỉ giữ lại những thành phần cần thiết cho chat AI local với tiếng Việt.

## 📂 Cấu trúc thư mục

```
xiaozhi-local-chat/
├── main/xiaozhi-server/           # Core server
│   ├── app.py                     # Main application entry point
│   ├── config.yaml               # Cấu hình chính (đã tối ưu cho local)
│   ├── requirements.txt          # Dependencies tối ưu (chỉ cần thiết)
│   ├── agent-base-prompt.txt     # Prompt template đơn giản (tiếng Việt)
│   ├── core/                     # Core modules
│   │   ├── providers/            # AI service providers
│   │   │   ├── llm/ollama/       # Ollama LLM provider
│   │   │   ├── asr/fun_local/    # FunASR local provider
│   │   │   ├── tts/edge/         # EdgeTTS provider
│   │   │   └── vad/silero/       # SileroVAD provider
│   │   └── utils/                # Utility functions
│   ├── config/                   # Configuration management
│   └── models/                   # Local AI models
│       ├── SenseVoiceSmall/      # FunASR model cho tiếng Việt
│       └── snakers4_silero-vad/  # VAD model
├── test-components.py            # Test script cho các thành phần
├── setup.sh                      # Script cài đặt tự động
├── start.sh                      # Script khởi động server
├── README.md                     # Tài liệu chính
├── USAGE.md                      # Hướng dẫn sử dụng chi tiết
├── PROJECT-STRUCTURE.md          # File này
└── .gitignore                    # Git ignore rules
```

## ✅ Những gì đã được giữ lại

### Core Components
- **app.py**: Main server application
- **WebSocket server**: Xử lý kết nối real-time
- **HTTP server**: Simple OTA và API endpoints
- **Configuration system**: YAML-based config

### AI Providers (chỉ local, không cloud)
- **LLM**: Ollama (qwen2.5:7b cho tiếng Việt)
- **ASR**: FunASR local (SenseVoiceSmall)
- **TTS**: EdgeTTS (với giọng tiếng Việt)
- **VAD**: SileroVAD (cho streaming)

### Utils & Core
- **Connection handling**: WebSocket connection management
- **Audio processing**: Opus encoding/decoding
- **Logging system**: Structured logging
- **Configuration loader**: Dynamic config loading

## ❌ Những gì đã bị loại bỏ

### Management Components
- **manager-api**: Java Spring Boot backend (không cần cho local)
- **manager-web**: Vue.js web interface (không cần cho local)
- **manager-mobile**: Mobile app (không cần cho local)

### Complex Features
- **MCP (Model Context Protocol)**: IoT device control
- **Plugin system**: Complex function calling
- **Home Assistant integration**: Smart home control
- **OTA firmware management**: Remote updates
- **User management**: Authentication & authorization
- **Database integration**: MySQL/Redis dependencies

### Cloud Providers
- **Aliyun, Baidu, Tencent**: Cloud speech services
- **OpenAI, DeepSeek**: Cloud LLM providers
- **Various TTS services**: Cloud text-to-speech

### Advanced Features
- **Voiceprint recognition**: Speaker identification
- **Knowledge base (RAG)**: Document search
- **Memory systems**: Conversation history
- **Multi-language support**: Beyond Vietnamese
- **Device management**: ESP32 fleet management

## 📦 File sizes

### Original xiaozhi-esp32-server
- Full project: ~500MB+
- Dependencies: 200+ packages
- Models: Multiple large models
- Components: 4 major services

### Xiaozhi Local Chat
- Core server: ~50MB
- Dependencies: ~15 packages
- Models: 2 essential models (~2GB total)
- Components: 1 streamlined service

## 🎯 Tối ưu hóa

### Performance
- **Reduced memory usage**: Từ 4-8GB xuống 4GB+
- **Faster startup**: Loại bỏ initialization phức tạp
- **Streaming optimized**: VAD + real-time processing
- **Local first**: Không phụ thuộc cloud APIs

### Simplicity
- **Single service**: Chỉ cần chạy 1 server
- **Minimal config**: YAML file đơn giản
- **Auto-setup**: Scripts tự động cài đặt
- **Vietnamese focused**: Tối ưu cho tiếng Việt

### Maintainability
- **Clean codebase**: Loại bỏ code không cần thiết
- **Clear structure**: Dễ hiểu và modify
- **Documentation**: Hướng dẫn chi tiết
- **Testing**: Component testing script

## 🔄 Migration Path

Nếu sau này cần thêm tính năng:

1. **Basic IoT**: Thêm MCP providers
2. **User management**: Thêm manager-api
3. **Web interface**: Thêm manager-web
4. **Cloud fallback**: Thêm cloud providers
5. **Advanced features**: Thêm memory, voiceprint, etc.

Dự án này cung cấp foundation vững chắc để mở rộng khi cần thiết.

