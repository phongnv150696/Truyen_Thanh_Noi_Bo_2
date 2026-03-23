"""
Generate Pre-recorded Wake Word Greeting Audio
"""
import sys
import os
from pathlib import Path

# Add project root
sys.path.insert(0, '.')

def generate_wake_greeting():
    """Generate wake word greeting audio file"""
    print("=" * 70)
    print("🎙️ Generating Wake Word Greeting Audio")
    print("=" * 70)
    
    # Greeting text
    greeting_text = "Chào bạn, tôi là trợ lí ảo của Trung đoàn 8, tôi có thể giúp gì cho bạn không"
    
    # Create output directory
    output_dir = Path('./data/audio_templates')
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Output file
    output_file = output_dir / "wake_greeting.wav"
    
    print(f"\n📄 Text: {greeting_text}")
    print(f"📁 Output: {output_file}")
    
    # Import TTS - use direct pyttsx3
    try:
        import pyttsx3
        
        # Initialize TTS
        print("\n🔊 Initializing TTS...")
        engine = pyttsx3.init()
        
        # Set voice to Microsoft An (Vietnamese)
        voices = engine.getProperty('voices')
        print(f"\nAvailable voices: {len(voices)}")
        for voice in voices:
            if 'An' in voice.name or 'Vietnamese' in voice.name:
                engine.setProperty('voice', voice.id)
                print(f"✅ Selected voice: {voice.name}")
                break
        
        # Set properties for natural speech
        engine.setProperty('rate', 150)  # Speed
        engine.setProperty('volume', 1.0)  # Volume
        
        print("✅ TTS initialized")
        
        # Generate audio
        print("\n🎵 Generating audio...")
        engine.save_to_file(greeting_text, str(output_file))
        engine.runAndWait()
        
        # Verify
        if output_file.exists():
            file_size = output_file.stat().st_size
            print(f"\n✅ SUCCESS!")
            print(f"📊 File size: {file_size / 1024:.1f} KB")
            print(f"📁 Location: {output_file.absolute()}")
        else:
            print(f"\n❌ Failed - file not created")
            return False
        
        print("\n" + "=" * 70)
        print("🎉 Wake greeting audio generated!")
        print("=" * 70)
        print("\nNext: Update listenMessageHandler.py to use this file")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = generate_wake_greeting()
    sys.exit(0 if success else 1)
