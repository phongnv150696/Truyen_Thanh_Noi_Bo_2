/**
 * OpenClaw Speaker Firmware v1.0
 * For ESP32 (Arduino Framework)
 * 
 * Dependencies (Install via Arduino Library Manager):
 * 1. ArduinoJson (by Benoit Blanchon)
 * 2. WebSockets (by Markus Sattler)
 * 3. ESP32-audioI2S (by Wolle / schreibfaul1)
 */

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include "Audio.h"

// --- CONFIGURATION ---
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* server_ip = "192.168.1.100"; // LAN IP of your OpenClaw Server
const int server_port = 3000;

// Device Metadata
const int device_id = 10;
const int channel_id = 1; // Default Channel (e.g. Kênh Tổng hợp)
const char* device_name = "Loa_ESP32_Test";

// Pin Configuration (I2S - for MAX98357A or similar)
#define I2S_DOUT      25
#define I2S_BCLK      26
#define I2S_LRC       27

// Objects
WebSocketsClient webSocket;
Audio audio;
bool is_playing = false;

// --- FUNCTIONS ---

void connectToWiFi() {
  Serial.println("\nConnecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void identify() {
  StaticJsonDocument<200> doc;
  doc["type"] = "identify";
  doc["device_id"] = device_id;
  doc["channel_id"] = channel_id;
  doc["device_name"] = device_name;

  String output;
  serializeJson(doc, output);
  webSocket.sendTXT(output);
  Serial.println("Sent Identify: " + output);
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.println("[WS] Disconnected!");
      is_playing = false;
      audio.stopSong();
      break;
      
    case WStype_CONNECTED:
      Serial.println("[WS] Connected to Server!");
      identify();
      break;
      
    case WStype_TEXT: {
      String text = (char*)payload;
      Serial.println("[WS] Received: " + text);
      
      StaticJsonDocument<512> doc;
      DeserializationError error = deserializeJson(doc, text);
      if (error) return;

      const char* msgType = doc["type"];

      if (strcmp(msgType, "broadcast-start") == 0 || strcmp(msgType, "emergency-start") == 0) {
        const char* file_url = doc["file_url"];
        if (file_url) {
          Serial.printf("Starting Playback: %s\n", file_url);
          audio.connecttohost(file_url);
          is_playing = true;
        }
      } 
      else if (strcmp(msgType, "broadcast-stop") == 0 || strcmp(msgType, "emergency-stop") == 0) {
        Serial.println("Stopping Playback...");
        audio.stopSong();
        is_playing = false;
      }
      break;
    }
    
    default:
      break;
  }
}

void setup() {
  Serial.begin(115200);
  
  // 1. Audio Setup
  audio.setPinout(I2S_BCLK, I2S_LRC, I2S_DOUT);
  audio.setVolume(21); // 0...21

  // 2. WiFi Setup
  connectToWiFi();

  // 3. WebSocket Setup
  webSocket.begin(server_ip, server_port, "/ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000); // Try reconnecting every 5s
}

void loop() {
  webSocket.loop();
  audio.loop();

  // Heartbeat (every 30s)
  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000) {
    lastHeartbeat = millis();
    if (WiFi.status() == WL_CONNECTED) {
      // Periodic ping can be added here
    }
  }
}

// --- OPTIONAL CALLBACKS ---
void audio_info(const char *info){
    Serial.print("audio_info: "); Serial.println(info);
}
void audio_eof_mp3(const char *info){  // end of file
    Serial.print("eos_mp3: "); Serial.println(info);
    is_playing = false;
    
    // Notify server of completion
    StaticJsonDocument<100> doc;
    doc["type"] = "broadcast-complete";
    String output;
    serializeJson(doc, output);
    webSocket.sendTXT(output);
    Serial.println("Sent Broadcast Complete: " + output);
}
