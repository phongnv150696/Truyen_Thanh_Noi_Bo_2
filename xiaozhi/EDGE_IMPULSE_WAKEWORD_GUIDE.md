# Hướng Dẫn Train Custom Wake Word với Edge Impulse cho ESP32

## Tổng quan

Hướng dẫn này giúp bạn tạo custom wake word (ví dụ: "Chào đồng chí") sử dụng Edge Impulse và tích hợp vào ESP32.

**Thời gian ước tính:** 3-4 giờ  
**Yêu cầu:** Tài khoản Edge Impulse (miễn phí), microphone, ESP32

---

## Bước 1: Tạo Project trên Edge Impulse

1. Truy cập [https://studio.edgeimpulse.com](https://studio.edgeimpulse.com)
2. Đăng ký/Đăng nhập
3. Click **"Create new project"**
4. Đặt tên: `xiaozhi-wakeword`
5. Chọn **"Audio"** → **"Keyword Spotting"**

---

## Bước 2: Thu thập dữ liệu

### 2.1 Cần thu thập 3 loại:

| Label | Số lượng | Mô tả |
|-------|----------|-------|
| `chao_dong_chi` | 50-100 mẫu | Wake word chính |
| `noise` | 50-100 mẫu | Tiếng ồn background |
| `unknown` | 50-100 mẫu | Các từ khác (không phải wake word) |

### 2.2 Cách thu thập:

**Cách 1: Qua điện thoại**
1. Trong Edge Impulse → **Data acquisition**
2. Click **"Show QR code"** → Quét bằng điện thoại
3. Thu âm trực tiếp trên điện thoại

**Cách 2: Qua máy tính**
1. Cài đặt Edge Impulse CLI:
   ```bash
   npm install -g edge-impulse-cli
   ```
2. Chạy:
   ```bash
   edge-impulse-data-forwarder
   ```
3. Thu âm trực tiếp

### 2.3 Tips thu thập tốt:

- ✅ Thu nhiều giọng khác nhau (nam, nữ, trẻ, già)
- ✅ Thu ở nhiều môi trường (yên tĩnh, ồn ào)
- ✅ Nói với tốc độ/âm lượng khác nhau
- ✅ Mỗi mẫu ~1-2 giây
- ❌ Không thu âm quá dài (> 3 giây)

---

## Bước 3: Thiết kế Impulse

1. Vào **"Create impulse"**
2. Cấu hình:
   - **Time series data:** 
     - Window size: 1000ms
     - Window increase: 500ms
   - **Processing block:** MFCC
   - **Learning block:** Classification
3. Click **"Save Impulse"**

### 3.1 Cấu hình MFCC:

- **Frame length:** 0.02s
- **Frame stride:** 0.01s
- **Number of filters:** 40
- **FFT length:** 256
- **Number of coefficients:** 13

Click **"Generate features"** → Xem biểu đồ phân bố

---

## Bước 4: Train Model

1. Vào **"Classifier"**
2. Cấu hình:
   - **Number of training cycles:** 100-200
   - **Learning rate:** 0.005
   - **Minimum confidence rating:** 0.8
3. Click **"Start training"**
4. Đợi 5-15 phút

### 4.1 Đánh giá kết quả:

- **Accuracy > 90%:** Tốt
- **Accuracy 80-90%:** Chấp nhận được
- **Accuracy < 80%:** Cần thêm dữ liệu

---

## Bước 5: Test Model

1. Vào **"Model testing"**
2. Upload hoặc record mẫu test
3. Kiểm tra độ chính xác thực tế

---

## Bước 6: Deploy cho ESP32

1. Vào **"Deployment"**
2. Chọn **"ESP-IDF"** hoặc **"Arduino library"**
3. Click **"Build"**
4. Download file ZIP

### 6.1 Tích hợp vào xiaozhi-esp32:

```bash
# Giải nén thư viện
unzip ei-xiaozhi-wakeword-esp-idf.zip

# Copy vào components
cp -r edge-impulse-sdk xiaozhi-esp32-main/components/
```

### 6.2 Sửa CMakeLists.txt:

```cmake
# Thêm vào main/CMakeLists.txt
set(EXTRA_COMPONENT_DIRS "../components/edge-impulse-sdk")
```

### 6.3 Tạo file wake_word_ei.cc:

```cpp
#include "edge-impulse-sdk/classifier/ei_run_classifier.h"
#include "edge-impulse-sdk/dsp/numpy.hpp"

// Buffer để lưu audio
static float features[EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE];

bool detect_wake_word(int16_t* audio_buffer, size_t length) {
    // Convert to float
    for (size_t i = 0; i < length && i < EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE; i++) {
        features[i] = (float)audio_buffer[i] / 32768.0f;
    }
    
    // Run classifier
    signal_t signal;
    signal.total_length = EI_CLASSIFIER_DSP_INPUT_FRAME_SIZE;
    signal.get_data = [](size_t offset, size_t length, float *out_ptr) -> int {
        memcpy(out_ptr, features + offset, length * sizeof(float));
        return 0;
    };
    
    ei_impulse_result_t result = {0};
    EI_IMPULSE_ERROR err = run_classifier(&signal, &result, false);
    
    if (err != EI_IMPULSE_OK) {
        return false;
    }
    
    // Kiểm tra label "chao_dong_chi"
    for (size_t i = 0; i < EI_CLASSIFIER_LABEL_COUNT; i++) {
        if (strcmp(result.classification[i].label, "chao_dong_chi") == 0) {
            if (result.classification[i].value > 0.8) {
                return true;  // Wake word detected!
            }
        }
    }
    
    return false;
}
```

---

## Bước 7: Build và Test

```bash
cd xiaozhi-esp32-main
idf.py fullclean
idf.py build
idf.py flash monitor
```

---

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Accuracy thấp | Thêm dữ liệu (đặc biệt negative samples) |
| False positive cao | Tăng confidence threshold (0.9) |
| Model quá lớn | Chọn "EON Compiler" khi deploy |
| ESP32 crash | Kiểm tra RAM usage, giảm window size |

---

## Tài nguyên

- [Edge Impulse Docs](https://docs.edgeimpulse.com)
- [ESP32 Tutorial](https://docs.edgeimpulse.com/docs/edge-ai-tutorials/embedded-ai/esp32)
- [Keyword Spotting Guide](https://docs.edgeimpulse.com/docs/tutorials/audio-classification)
