import requests
import json

url = "http://127.0.0.1:3000/devices/register-xiaozhi"
payload = {
    "device_id": "MOCK_MAC_ADDRESS_1234",
    "name": "Loa XiaoZhi TEST",
    "ip_address": "127.0.0.1",
    "type": "xiaozhi-speaker"
}

try:
    print(f"Sử dụng URL: {url}")
    response = requests.post(url, json=payload, timeout=5)
    print(f"Trạng thái phản hồi: {response.status_code}")
    print(f"Dữ liệu trả về: {response.json()}")
except Exception as e:
    print(f"Lỗi: {e}")
