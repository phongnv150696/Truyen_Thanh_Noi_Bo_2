"""
Generate Audio for Party Congress 14 Theme
Sử dụng pyttsx3 như các file audio templates khác
"""
import sys
import os
from pathlib import Path

# Add project root
sys.path.insert(0, '.')

# Chủ đề Đại hội 14
DAI_HOI_14_TEXT = """Chủ đề và Phương châm Đại hội đại biểu toàn quốc lần thứ mười bốn của Đảng:

Chủ đề là: Dưới lá cờ vẻ vang của Đảng, chung sức, đồng lòng thực hiện thắng lợi các mục tiêu phát triển đất nước đến năm hai nghìn không trăm ba mươi; tự chủ chiến lược, tự cường, tự tin, tiến mạnh trong kỷ nguyên vươn mình của dân tộc vì hoà bình, độc lập, dân chủ, giàu mạnh, phồn vinh, văn minh, hạnh phúc, vững bước đi lên chủ nghĩa xã hội.

Phương châm là: Đoàn kết, Dân chủ, Kỷ cương, Đột phá, Phát triển.
"""

def generate_audio_file():
    """Generate audio file for Party Congress 14"""
    print("=" * 70)
    print("🎙️ Generating Audio for Party Congress 14 Theme")
    print("=" * 70)
    
    # Create output directory
    output_dir = Path('./data/audio_static')
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 Output directory: {output_dir}")
    
    # Import TTS - use direct pyttsx3
    try:
        import pyttsx3
        
        # Initialize TTS
        print("\n🔊 Initializing TTS...")
        engine = pyttsx3.init()
        
        # Set voice to Microsoft An (Vietnamese)
        voices = engine.getProperty('voices')
        for voice in voices:
            if 'An' in voice.name or 'Vietnamese' in voice.name:
                engine.setProperty('voice', voice.id)
                print(f"✅ Selected voice: {voice.name}")
                break
        
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 1.0)
        
        print("✅ TTS initialized")
        
        # Output filename
        output_file = output_dir / "chu_de_dai_hoi_14.wav"
        
        print(f"\n🎵 Generating audio file...")
        print(f"  Content: {DAI_HOI_14_TEXT[:80]}...")
        
        # Generate
        try:
            engine.save_to_file(DAI_HOI_14_TEXT, str(output_file))
            engine.runAndWait()
            
            if output_file.exists():
                file_size = output_file.stat().st_size
                print(f"\n✅ SUCCESS!")
                print(f"  File: {output_file}")
                print(f"  Size: {file_size / 1024:.1f} KB ({file_size / 1024 / 1024:.2f} MB)")
                print(f"\nℹ️  Restart server để sử dụng static audio")
                return True
            else:
                print(f"\n❌ Failed - file not created")
                return False
                
        except Exception as e:
            print(f"\n❌ Error during generation: {e}")
            return False
        
    except ImportError:
        print(f"\n❌ Error: pyttsx3 not installed")
        print("\nInstall with: pip install pyttsx3")
        return False
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = generate_audio_file()
    sys.exit(0 if success else 1)
