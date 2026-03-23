"""
Script để tạo file audio cho chủ đề Đại hội 14

Chạy script này từ thư mục xiaozhi-server:
    python tools/create_dai_hoi_14_audio.py
"""

import sys
import os
import wave
import numpy as np

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def main():
    # Chủ đề Đại hội 14
    text = """Chủ đề Đại hội đại biểu toàn quốc lần thứ mười bốn của Đảng là:
    
    Dưới lá cờ vẻ vang của Đảng, chung sức, đồng lòng thực hiện thắng lợi các mục tiêu phát triển đất nước đến năm hai nghìn không trăm ba mươi; tự chủ chiến lược, tự cường, tự tin, tiến mạnh trong kỷ nguyên vươn mình của dân tộc vì hoà bình, độc lập, dân chủ, giàu mạnh, phồn vinh, văn minh, hạnh phúc, vững bước đi lên chủ nghĩa xã hội.
    """
    
    print("=" * 80)
    print("TẠO FILE AUDIO CHO CHỦ ĐỀ ĐẠI HỘI 14")
    print("=" * 80)
    
    output_path = os.path.abspath(os.path.join("data", "audio_static", "chu_de_dai_hoi_14.wav"))
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"\n📝 Text to convert:")
    print(f"{text}")
    print(f"\n📂 Output path: {output_path}")
    
    print("\n" + "=" * 80)
    print("HƯỚNG DẪN TẠO FILE AUDIO:")
    print("=" * 80)
    print("""
1. Chạy server Xiaozhi normally
2. Mở web interface hoặc kết nối ESP32
3. Nói/gõ: "Chủ đề đại hội 14 là gì?"
4. Server sẽ tạo TTS và phát
5. Sau đó, copy file TTS từ tmp/ sang data/audio_static/chu_de_dai_hoi_14.wav
   
HOẶC:

1. Sử dụng công cụ TTS bên ngoài (Edge TTS, Google TTS, etc.)
2. Lưu kết quả vào: data/audio_static/chu_de_dai_hoi_14.wav
    """)
    
    print("\nℹ️  Sau khi tạo file, restart server để sử dụng static audio")

if __name__ == "__main__":
    main()
