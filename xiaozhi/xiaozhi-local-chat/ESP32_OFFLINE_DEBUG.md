# ESP32 Offline Connectivity Issues - Troubleshooting Guide

## 🔍 Symptom

**Problem:** ESP32 không kết nối được server khi tắt internet, nhưng kết nối lại ngay khi bật internet.

**This means:** ESP32 hoặc network stack đang phụ thuộc vào internet connection!

---

## 🎯 Possible Root Causes

### 1. **NTP Time Sync** (Most Likely!) ⭐

ESP32 cần đồng bộ thời gian qua internet trước khi kết nối HTTPS/WSS.

**Fix:** Disable NTP hoặc use local time

**Check in ESP32 code:**
```cpp
// Look for:
configTime()
sntp_setoperatingmode()
sntp_init()
```

**Solution:**
```cpp
// Comment out or disable NTP
// configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);

// Or use manual time
struct timeval tv = {1700000000, 0}; // Fixed timestamp
settimeofday(&tv, NULL);
```

---

### 2. **DNS Resolution**

ESP32 đang resolve hostname thay vì dùng IP address trực tiếp.

**Fix:** Use IP address thay vì hostname

**Bad:**
```cpp
const char* serverHost = "xiaozhi-server.local";
```

**Good:**
```cpp
const char* serverHost = "192.168.100.189"; // Direct IP
```

---

### 3. **Cloud Server Fallback**

ESP32 vẫn cố kết nối cloud server trước khi fallback về local.

**Check for:**
```cpp
api.tenclass.net
mqtt.xiaozhi.me
```

**Fix:** Completely disable cloud connection code

---

### 4. **WiFi Router Issues**

Router có thể disconnect WiFi clients khi mất WAN.

**Symptoms:**
- Router LEDs thay đổi khi mất internet
- Devices bị disconnect khỏi WiFi

**Fix:**
- Check router settings
- Enable "LAN only mode" nếu có
- Try different router

---

### 5. **Certificate Validation**

HTTPS/WSS cert validation cần internet để check CRL/OCSP.

**Fix:** Disable cert validation cho local server

```cpp
// For testing only!
client.setInsecure(); // Skip cert validation
```

---

## 🛠️ Debugging Steps

### Step 1: Check ESP32 Serial Output

```bash
# Monitor ESP32 khi tắt internet
# Xem logs để tìm error
```

**Look for:**
- "NTP sync failed"
- "DNS resolution failed"
- "Connecting to api.tenclass.net"
- "Certificate validation error"

### Step 2: Test with Static IP

**ESP32 code:**
```cpp
IPAddress local_IP(192, 168, 100, 50);
IPAddress gateway(192, 168, 100, 1);
IPAddress subnet(255, 255, 255, 0);

WiFi.config(local_IP, gateway, subnet);
WiFi.begin(ssid, password);
```

### Step 3: Disable NTP

```cpp
// Comment out time sync
// configTime(0, 0, "pool.ntp.org");
```

### Step 4: Use IP Instead of Hostname

```cpp
// Instead of:
// ws://xiaozhi-server:8001/xiaozhi/v1/

// Use:
ws://192.168.100.189:8001/xiaozhi/v1/
```

---

## ✅ Quick Fix Checklist

1. **[ ] Disable NTP time sync**
   - Comment out `configTime()` calls
   - Or use fixed timestamp

2. **[ ] Use server IP address**
   - Not hostname/domain
   - Direct IP: `192.168.100.189`

3. **[ ] Disable cloud connections**
   - Remove api.tenclass.net
   - Remove mqtt.xiaozhi.me

4. **[ ] Static IP for ESP32**
   - Avoid DHCP delays
   - Fixed IP assignment

5. **[ ] Disable cert validation** (test only)
   - For local server
   - Skip HTTPS verification

---

## 🎯 Most Likely Solution

**NTP Time Sync is the culprit!**

ESP32 needs accurate time for:
- HTTPS certificate validation
- WebSocket secure connections
- Timestamp generation

**When internet is off:**
- NTP sync fails
- ESP32 waits/retries
- Connection blocked

**When internet is on:**
- NTP sync succeeds
- Time is set
- Connection works

**Fix:**
```cpp
// In setup():
// OLD:
// configTime(gmtOffset_sec, daylightOffset_sec, "pool.ntp.org");

// NEW: Use fixed time or disable
struct timeval tv = {1700000000, 0};
settimeofday(&tv, NULL);
```

---

## 📝 Action Items

**High Priority:**
1. Check ESP32 serial logs when offline
2. Identify exact error message
3. Disable NTP or use fixed time
4. Test offline connection

**Medium Priority:**
5. Use IP address instead of hostname
6. Configure static IP for ESP32
7. Verify no cloud server connections

**Low Priority:**
8. Router configuration
9. Certificate handling

---

## 🔍 Debug Commands

```bash
# On PC - Check server is running
netstat -an | findstr 8001

# On PC - Check IP hasn't changed
ipconfig

# ESP32 - Monitor serial output
# Look for connection attempts and errors
```

---

## ✅ Expected Result

**After fix:**
- ✅ ESP32 connects to server with internet OFF
- ✅ Full offline operation
- ✅ No dependency on external services

**Current state:**
- ❌ ESP32 needs internet for some dependency
- Most likely: **NTP time synchronization**

---

**Next Steps:**
1. Check ESP32 serial logs
2. Identify error when internet off
3. Apply appropriate fix from above
4. Test offline connection

**Most likely fix needed: Disable/bypass NTP sync!**
