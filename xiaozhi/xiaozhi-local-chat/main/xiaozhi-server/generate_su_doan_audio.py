"""
Generate Static Audio for Sư đoàn 395 Leadership
Complete list of 5 leaders in CORRECT order
"""
import os
import pyttsx3

def generate_su_doan_audio():
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
    engine.setProperty('rate', 150)
    engine.setProperty('volume', 1.0)
    
    # Text content - Complete list in CORRECT order from document
    text = """Chỉ huy Sư đoàn 395 gồm 5 người:
- Sư đoàn trưởng: Đại tá Nguyễn Huy Toàn
- Chính ủy Sư đoàn: Đại tá Lê Hồng Thắng
- Phó Sư đoàn trưởng, Tham mưu trưởng: Đại tá Nguyễn Thành Lụy
- Phó Sư đoàn trưởng: Đại tá Nguyễn Văn Tiệp
- Phó Chính ủy Sư đoàn: Đại tá Đỗ Trung Kiên"""
    
    # Output path
    output_path = "data/audio_static/chi_huy_su_doan.wav"
    
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
    print("🎙️ Generating Audio for Sư đoàn 395 Leadership (5 leaders)")
    print("=" * 70)
    generate_su_doan_audio()
    print("\nℹ️  Restart server to use static audio")
