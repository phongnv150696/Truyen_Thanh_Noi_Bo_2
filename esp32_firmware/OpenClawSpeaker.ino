/**
 * OpenClaw Minimalist Binary Speaker v1.3
 * ========================================
 * Chỉ dùng cho Binary Stream (Nguyên lý XiaoZhi)
 * Không dùng thư viện Audio nặng nề để tránh lỗi Boot Loop trên ESP32-S3.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>

// --- CẤU HÌNH WIFI & SERVER ---
const char* ssid     = "Wifi8";
const char* password = "244466666";
const char* server_host = "192.168.100.189";
const int   server_port = 3000;

// --- CẤU HÌNH THIẾT BỊ ---
const int device_id  = 22;
const int channel_id = 1;

// --- CẤU HÌNH CHÂN I2S (S3) ---
#define I2S_DOUT      7
#define I2S_BCLK      15
#define I2S_LRCK      16
#define I2S_NUM       I2S_NUM_0

WebSocketsClient webSocket;

// Cấu khởi tạo I2S Raw
void initI2S() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_TX),
    .sample_rate = 16000,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 32,    // Tăng từ 8 -> 32
    .dma_buf_len = 1024,   // Tăng từ 512 -> 1024 để chống giật
    .use_apll = false,
    .tx_desc_auto_clear = true
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_BCLK,
    .ws_io_num = I2S_LRCK,
    .data_out_num = I2S_DOUT,
    .data_in_num = I2S_PIN_NO_CHANGE
  };
  i2s_driver_install(I2S_NUM, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM, &pin_config);
  i2s_zero_dma_buffer(I2S_NUM);
  Serial.println("[I2S] Driver installed (16kHz PCM).");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      break;
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to OpenClaw!");
      // Identify
      {
        StaticJsonDocument<200> doc;
        doc["type"] = "identify";
        doc["device_id"] = device_id;
        doc["channel_id"] = channel_id;
        String msg;
        serializeJson(doc, msg);
        webSocket.sendTXT(msg);
      }
      break;
    case WStype_TEXT:
      Serial.printf("[WS] Msg: %s\n", (char*)payload);
      break;
    case WStype_BIN:
      // Phát trực tiếp Binary Stream
      if (length > 0) {
        size_t bytes_written;
        i2s_write(I2S_NUM, payload, length, &bytes_written, portMAX_DELAY);
      }
      break;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n=== OpenClaw Minimalist V1.3 ===");

  // 1. Wifi
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[WiFi] Connected!");

  // 2. I2S
  initI2S();

  // 3. WS
  webSocket.begin(server_host, server_port, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void loop() {
  webSocket.loop();
}
