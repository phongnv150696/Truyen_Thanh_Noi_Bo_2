"""
Script đơn giản tạo audio cho Đại hội 14 bằng pyttsx3
Chạy: python tools/create_dai_hoi_14_audio_simple.py
"""

import os
import pyttsx3

# Chủ đề Đại hội 14
text = """Chủ đề Đại hội đại biểu toàn quốc lần thứ mười bốn của Đảng là:

Dưới lá cờ vẻ vang của Đảng, chung sức, đồng lòng thực hiện thắng lợi các mục tiêu phát triển đất nước đến năm hai nghìn không trăm ba mươi; tự chủ chiến lược, tự cường, tự tin, tiến mạnh trong kỷ nguyên vươn mình của dân tộc vì hoà bình, độc lập, dân chủ, giàu mạnh, phồn vinh, văn minh, hạnh phúc, vững bước đi lên chủ nghĩa xã hội.
"""

output_path = os.path.abspath("data/audio_static/chu_de_dai_hoi_14.wav")

print("=" * 80)
print("TẠO FILE AUDIO CHO CHỦ ĐỀ ĐẠI HỘI 14")
print("=" * 80)

# Tạo thư mục nếu chưa có
os.makedirs(os.path.dirname(output_path), exist_ok=True)

print(f"\n📝 Text: {text[:100]}...")
print(f"📂 Output: {output_path}")

try:
    # Khởi tạo pyttsx3
    engine = pyttsx3.init()
    
    # Cấu hình (tùy chọn)
    engine.setProperty('rate', 150)    # Tốc độ đọc
    engine.setProperty('volume', 0.9)  # Âm lượng
    
    # Lấy danh sách giọng
    voices = engine.getProperty('voices')
    print(f"\n🎤 Giọng hiện tại: {voices[0].name if voices else 'Default'}")
    
    # Tạo file
    print("\n⏳ Đang tạo file audio...")
    engine.save_to_file(text, output_path)
    engine.runAndWait()
    
    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / 1024 / 1024
        print(f"\n✅ SUCCESS!")
        print(f"   File: {output_path}")
        print(f"   Size: {size_mb:.2f} MB")
        print(f"\nℹ️  Restart server để sử dụng static audio")
    else:
        print("\n❌ Không tạo được file")
        
except Exception as e:
    print(f"\n❌ Lỗi: {e}")
    print("\nHoặc copy file TTS có sẵn từ tmp/ sang:")
    print(f"  {output_path}")
