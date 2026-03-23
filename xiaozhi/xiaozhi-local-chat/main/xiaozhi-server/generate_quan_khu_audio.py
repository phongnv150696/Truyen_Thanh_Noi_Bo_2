"""
Generate Static Audio for Quân Khu 3 Leadership
Complete list of 7 leaders
"""
import os
import pyttsx3

def generate_quan_khu_audio():
    # Initialize TTS engine
    engine = pyttsx3.init()
    
    # Set voice to Vietnamese (Microsoft An)
    voices = engine.getProperty('voices')
    for voice in voices:
        if 'an' in voice.name.lower() and 'vi' in voice.name.lower():
            engine.setProperty('voice', voice.id)
            print(f"✅ Selected voice: {voice.name}")
            break
    
    # Set properties
    engine.setProperty('rate', 150)  # Speaking speed
    engine.setProperty('volume', 1.0)  # Volume
    
    # Text content - Complete list of 7 leaders
    text = """Thủ trưởng Bộ tư lệnh Quân khu 3 gồm 7 người:
- Tư lệnh Quân khu: Trung tướng Lương Văn Kiểm
- Chính ủy Quân khu: Trung tướng Nguyễn Đức Hưng
- Phó Tư lệnh, tham mưu trưởng Quân khu: Thiếu tướng Nguyễn Đức Dũng
- Phó Tư lệnh Quân khu: Thiếu tướng Lê Văn Long
- Phó Tư lệnh Quân khu: Thiếu tướng Hà Tất Đạt
- Phó Tư lệnh Quân khu: Thiếu tướng Tô Thành Quyết
- Phó Chính ủy Quân khu: Thiếu tướng Khúc Thành Dư"""
    
    # Output path
    output_path = "data/audio_static/chi_huy_quan_khu.wav"
    
    # Create directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Generate audio
    print(f"\n🎵 Generating audio...")
    print(f"  Content preview: {text[:100]}...")
    engine.save_to_file(text, output_path)
    engine.runAndWait()
    
    # Check file size
    if os.path.exists(output_path):
        size_kb = os.path.getsize(output_path) / 1024
        print(f"\n✅ SUCCESS!")
        print(f"  File: {output_path}")
        print(f"  Size: {size_kb:.1f} KB")
    else:
        print("❌ FAILED: Audio file not created")

if __name__ == "__main__":
    print("=" * 70)
    print("🎙️ Generating Audio for Quân Khu 3 Leadership (7 leaders)")
    print("=" * 70)
    generate_quan_khu_audio()
    print("\nℹ️  Restart server to use static audio")
