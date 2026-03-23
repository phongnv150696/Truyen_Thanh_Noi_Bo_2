"""
Generate Static Audio for "5 Vững"
From General Secretary Tô Lâm's conclusion at 15th Central Military Committee
"""
import os
import pyttsx3

def generate_5_vung_audio():
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
    
    # Text content - 5 vững directive
    text = """Theo kết luận của Tổng Bí thư Tô Lâm, Bí thư Quân ủy Trung ương tại Hội nghị lần thứ 15, Quân ủy Trung ương nhiệm kỳ 2020 - 2025. Để toàn quân vững vàng bước vào kỷ nguyên phát triển mới, Tổng Bí thư Tô Lâm đề nghị hành động theo phương châm 5 vững, gồm:

Thứ nhất, Chính trị vững.
Thứ hai, Kỷ luật vững.
Thứ ba, Công nghệ vững.
Thứ tư, Nghệ thuật quân sự vững.
Thứ năm, Đời sống bộ đội vững."""
    
    # Output path
    output_path = "data/audio_static/5_vung.wav"
    
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
    print("🎙️ Generating Audio: 5 Vững")
    print("=" * 70)
    generate_5_vung_audio()
    print("\nℹ️  Restart server to use static audio")
