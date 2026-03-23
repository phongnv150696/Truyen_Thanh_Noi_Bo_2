"""
Generate Static Audio for "2 kiên định - 2 đẩy mạnh - 2 ngăn ngừa"
From General Secretary Tô Lâm's speech at Party Congress XII
"""
import os
import pyttsx3

def generate_2_2_2_audio():
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
    
    # Text content - Complete 2-2-2 directives
    text = """Phát biểu chỉ đạo của Tổng Bí thư Tô Lâm tại Đại hội Đảng bộ Quân đội lần thứ 12, nhiệm kỳ 2025 – 2030, gồm: 2 kiên định, 2 đẩy mạnh, 2 ngăn ngừa.

2 Kiên định:
Thứ nhất, Kiên định đường lối quân sự, quốc phòng của Đảng.
Thứ hai, Kiên định xây dựng Quân đội vững mạnh về chính trị, góp phần giữ vững và tăng cường sự lãnh đạo tuyệt đối, trực tiếp về mọi mặt của Đảng đối với Quân đội.

2 Đẩy mạnh:
Thứ nhất, Đẩy mạnh xây dựng Quân đội nhân dân cách mạng, chính quy, tinh nhuệ, hiện đại.
Thứ hai, Đẩy mạnh hội nhập quốc tế và đối ngoại quốc phòng.

2 Ngăn ngừa:
Thứ nhất, Ngăn ngừa các nguy cơ chiến tranh, xung đột.
Thứ hai, Ngăn ngừa mọi biểu hiện suy thoái về tư tưởng chính trị, đạo đức, lối sống, tự diễn biến, tự chuyển hóa trong Đảng bộ Quân đội và toàn quân."""
    
    # Output path
    output_path = "data/audio_static/2_kien_dinh_2_day_manh_2_ngan_ngua.wav"
    
    # Create directory if needed
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Generate audio
    print(f"\n🎵 Generating audio...")
    print(f"  Content length: {len(text)} chars")
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
    print("🎙️ Generating Audio: 2 Kiên định - 2 Đẩy mạnh - 2 Ngăn ngừa")
    print("=" * 70)
    generate_2_2_2_audio()
    print("\nℹ️  Restart server to use static audio")
