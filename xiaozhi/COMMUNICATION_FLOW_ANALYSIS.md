# Phân tích Logic Giao tiếp ESP32 ↔ Server

## 📋 Tổng quan
Tài liệu này phân tích chi tiết logic giao tiếp giữa ESP32 và Server trong dự án Xiaozhi Chatbot AI.

---

## 🔄 Luồng Giao tiếp Tổng thể

### 1. Kết nối và Handshake (Protocol V3)

#### ESP32 Side (`websocket_protocol.cc`)
```
1. ESP32 gọi OpenAudioChannel()
   ├─ Tạo WebSocket connection với headers:
   │  ├─ Protocol-Version: "3"
   │  ├─ Device-Id: MAC address
   │  ├─ Client-Id: UUID
   │  └─ Authorization: Bearer token
   │
   ├─ Kết nối đến server URL
   │
   └─ Gửi Hello Message (JSON):
      {
        "type": "hello",
        "version": 3,
        "features": {"mcp": true},
        "transport": "websocket",
        "audio_params": {
          "format": "opus",
          "sample_rate": 16000,
          "channels": 1,
          "frame_duration": 60
        }
      }
```

#### Server Side (`connection.py`)
```
1. Server nhận WebSocket connection
   ├─ Đọc headers để xác định protocol_version
   ├─ Với protocol_version >= 3:
   │  └─ KHÔNG gửi hello ngay lập tức (chờ client hello trước)
   │
   └─ Với protocol_version == 0 (legacy):
      └─ Gửi hello ngay lập tức

2. Server nhận Hello từ ESP32
   ├─ handleHelloMessage() được gọi
   ├─ Cập nhật audio_params và features
   └─ Gửi welcome_msg phản hồi:
      {
        "type": "hello",
        "session_id": "...",
        "transport": "websocket",
        "audio_params": {...}
      }
```

#### ESP32 nhận Server Hello
```
1. ParseServerHello() được gọi
   ├─ Kiểm tra transport == "websocket"
   ├─ Lưu session_id
   ├─ Lưu audio_params (sample_rate, frame_duration)
   └─ Set event flag WEBSOCKET_PROTOCOL_SERVER_HELLO_EVENT
```

**✅ Đã sửa:** Server không gửi hello ngay lập tức với V3, tránh race condition.

---

### 2. Gửi Audio từ ESP32 → Server

#### ESP32 Side (`websocket_protocol.cc`)
```
1. SendAudio() được gọi với AudioStreamPacket
   ├─ Với version 3:
   │  ├─ Tạo BinaryProtocol3 header:
   │  │  ├─ type: 0 (audio)
   │  │  ├─ reserved: 0
   │  │  └─ payload_size: 2 bytes (big-endian)
   │  │
   │  └─ Gửi: [header 4 bytes] + [opus payload]
   │
   └─ Với version khác:
      └─ Gửi raw opus payload
```

#### Server Side (`connection.py`)
```
1. _route_message() nhận bytes message
   ├─ Kiểm tra VAD/ASR đã sẵn sàng?
   │  ├─ Nếu CHƯA:
   │  │  ├─ Parse V3 header nếu có
   │  │  └─ Queue vào asr_audio_queue (đợi ASR sẵn sàng)
   │  │
   │  └─ Nếu ĐÃ sẵn sàng:
   │     └─ Parse V3 header và extract payload
   │
   ├─ Kiểm tra V3 protocol header:
   │  ├─ len >= 4 && message[0] == 0
   │  ├─ payload_len = int.from_bytes(message[2:4], "big")
   │  └─ Nếu payload_len == len(message) - 4:
   │     └─ Strip header, put payload vào asr_audio_queue
   │
   └─ ASR thread xử lý từ queue:
      ├─ handleAudioMessage() được gọi
      ├─ VAD detection
      └─ ASR recognition → text
```

**✅ Đã sửa:** Audio packets được queue khi ASR chưa sẵn sàng, không bị mất.

---

### 3. Xử lý Text và LLM Response

#### Server Side (`connection.py`)
```
1. Nhận listen message với text từ ESP32:
   {
     "type": "listen",
     "state": "detect",
     "text": "Sophia"
   }

2. startToChat() được gọi
   ├─ Kiểm tra TTS đã sẵn sàng?
   │  ├─ Nếu CHƯA: Đợi tối đa 5 giây
   │  └─ Nếu timeout: Return None
   │
   ├─ chat() được gọi trong executor thread
   │  ├─ Kiểm tra LLM đã sẵn sàng?
   │  ├─ Put FIRST TTS message vào queue
   │  ├─ Gọi LLM.response() hoặc LLM.response_with_functions()
   │  ├─ Xử lý streaming response
   │  ├─ Put MIDDLE TTS messages cho mỗi chunk
   │  └─ Put LAST TTS message khi hoàn thành
   │
   └─ TTS thread xử lý từ tts_text_queue:
      ├─ Tạo audio từ text
      └─ Put audio vào tts_audio_queue
```

**✅ Đã sửa:** Đợi TTS khởi tạo trước khi xử lý chat, tránh lỗi "TTS is not initialized".

---

### 4. Gửi Audio từ Server → ESP32

#### Server Side (`sendAudioHandle.py`)
```
1. sendAudioMessage() được gọi
   ├─ Nếu là sentence đầu tiên:
   │  └─ Gửi TTS start message:
   │     {
   │       "type": "tts",
   │       "state": "start",
   │       "session_id": "..."
   │     }
   │
   ├─ Gửi sentence_start message nếu là FIRST:
   │  {
   │    "type": "tts",
   │    "state": "sentence_start",
   │    "text": "...",
   │    "session_id": "..."
   │  }
   │
   ├─ _do_send_audio() được gọi:
   │  ├─ Kiểm tra protocol_version:
   │  │  ├─ Với protocol_version == 3:
   │  │  │  ├─ Tạo V3 header:
   │  │  │  │  ├─ Byte 0: type = 0 (audio)
   │  │  │  │  ├─ Byte 1: reserved = 0
   │  │  │  │  └─ Bytes 2-3: payload_size (big-endian, 2 bytes)
   │  │  │  │
   │  │  │  └─ Gửi: [header 4 bytes] + [opus packet]
   │  │  │
   │  │  └─ Với version khác hoặc không có:
   │  │     └─ Gửi raw opus packet (legacy)
   │  │
   │  └─ Với MQTT gateway:
   │     └─ Gửi với 16-byte header (khác format)
   │
   └─ Nếu là LAST:
      └─ Gửi TTS stop message:
         {
           "type": "tts",
           "state": "stop",
           "session_id": "..."
         }
```

**✅ Đã sửa:** Server thêm V3 header khi gửi audio về ESP32 với protocol_version == 3.

#### ESP32 Side (`websocket_protocol.cc`)
```
1. OnData() callback nhận data
   ├─ Buffer data vào buffer_
   │
   ├─ Xử lý Binary Protocol V3:
   │  ├─ Kiểm tra buffer size >= 4
   │  ├─ Parse header:
   │  │  ├─ type = buffer[0]
   │  │  ├─ reserved = buffer[1]
   │  │  └─ payload_size = ntohs(buffer[2:4])
   │  │
   │  ├─ Nếu buffer đủ lớn:
   │  │  ├─ Extract payload
   │  │  └─ Gọi on_incoming_audio_ callback
   │  │
   │  └─ Nếu chưa đủ:
   │     └─ Đợi thêm data
   │
   ├─ Xử lý JSON messages:
   │  ├─ Parse JSON
   │  ├─ Nếu type == "hello":
   │  │  └─ ParseServerHello()
   │  ├─ Nếu type == "tts":
   │  │  ├─ state == "start": Set device state to SPEAKING
   │  │  ├─ state == "stop": Set device state to LISTENING/IDLE
   │  │  └─ state == "sentence_start": Hiển thị text
   │  └─ Các type khác:
   │     └─ Gọi on_incoming_json_ callback
   │
   └─ Xử lý garbage data (DEBUG/INFO logs):
      └─ Drop cho đến khi gặp newline
```

**✅ Đã sửa:** ESP32 có buffer để xử lý fragmentation và protocol mixing.

---

## 🔍 Các Vấn đề Đã Được Sửa

### 1. ✅ Hello Message Race Condition
**Vấn đề:** Server gửi hello ngay lập tức, ESP32 chưa kịp gửi hello của mình.
**Giải pháp:** Server chỉ gửi hello ngay với protocol_version == 0, với V3 chờ client hello trước.

### 2. ✅ Audio Packets Bị Mất Khi ASR Chưa Sẵn Sàng
**Vấn đề:** Audio packets đến trước khi ASR khởi tạo xong, bị bỏ qua.
**Giải pháp:** Queue audio packets vào `asr_audio_queue` ngay cả khi ASR chưa sẵn sàng.

### 3. ✅ TTS Chưa Khởi Tạo Khi Chat Được Gọi
**Vấn đề:** `chat()` được gọi trước khi TTS khởi tạo xong, gây lỗi.
**Giải pháp:** Đợi TTS khởi tạo tối đa 5 giây trước khi xử lý chat.

### 4. ✅ Case-Insensitive Header Lookup
**Vấn đề:** Header "protocol-version" có thể có case khác nhau.
**Giải pháp:** Chuyển headers về lowercase trước khi lookup.

### 5. ✅ Server Không Gửi V3 Header Khi Gửi Audio Về ESP32
**Vấn đề:** Server gửi raw opus packet mà không có V3 header, ESP32 không thể parse đúng.
**Giải pháp:** Kiểm tra `protocol_version == 3` và thêm V3 header (4 bytes) trước khi gửi audio.

### 6. ✅ Server Gửi DEBUG_ACK Message Gây Nhầm Lẫn
**Vấn đề:** Server gửi "DEBUG_ACK: Received hello" trước hello response, ESP32 không thể parse đúng.
**Giải pháp:** Loại bỏ việc gửi DEBUG_ACK message, chỉ log để debug.

### 7. ✅ Đảm Bảo Transport Field Trong Hello Response
**Vấn đề:** ESP32 ParseServerHello() yêu cầu `transport == "websocket"`, nếu không đúng sẽ return sớm và không set event flag, gây timeout.
**Giải pháp:** Đảm bảo `transport: "websocket"` được set trong hello response cho protocol V3, và thêm log chi tiết để debug.

---

## 📊 Protocol V3 Format

### Audio Packet Format (ESP32 → Server)
```
[4 bytes header] + [opus payload]
Header:
  - Byte 0: type (0 = audio)
  - Byte 1: reserved (0)
  - Bytes 2-3: payload_size (big-endian, 2 bytes)
```

### Audio Packet Format (Server → ESP32)
```
[4 bytes header] + [opus packet]
Header: Tương tự như trên
```

### JSON Message Format
```json
{
  "type": "hello|listen|tts|stt|llm|mcp|...",
  "session_id": "...",
  "state": "start|stop|detect|...",
  "text": "...",
  ...
}
```

---

## ⚠️ Các Điểm Cần Lưu Ý

1. **Timing:** Server phải đợi client hello trước khi gửi response với V3.
2. **Queue Management:** Audio packets được queue khi ASR chưa sẵn sàng.
3. **Initialization:** TTS và LLM phải được khởi tạo trước khi xử lý chat.
4. **Buffer Handling:** ESP32 có buffer để xử lý fragmentation và mixed protocols.
5. **Error Handling:** Có timeout và error handling cho các trường hợp edge case.

---

## ✅ Kết luận

Logic giao tiếp giữa ESP32 và Server đã được kiểm tra và sửa các vấn đề chính:
- ✅ Hello handshake đúng thứ tự
- ✅ Audio packets không bị mất
- ✅ TTS/LLM initialization được đợi đúng cách
- ✅ Protocol V3 được xử lý đúng format
- ✅ Error handling và timeout được xử lý

Hệ thống đã sẵn sàng để sử dụng! 🎉

