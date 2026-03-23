"""
Generate Pre-recorded Audio Templates for 10 Lời Thề
"""
import sys
import os
import re
from pathlib import Path

# Add project root
sys.path.insert(0, '.')

def extract_loi_the_content(file_path):
    """Extract content of 10 lời thề from chinh_tri.md"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match each lời thề
    pattern = r'\*\*Lời thề số (\d+):\*\* (.+?)(?=\n\n\*\*Lời thề số|\n\n---|\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    loi_the_dict = {}
    for num, text in matches:
        loi_the_dict[int(num)] = text.strip()
    
    return loi_the_dict


def generate_audio_files():
    """Generate audio files for each lời thề"""
    print("=" * 70)
    print("🎙️ Generating Audio Templates for 10 Lời Thề")
    print("=" * 70)
    
    # Extract content
    print("\n📄 Extracting content from chinh_tri.md...")
    chinh_tri_path = Path(__file__).parent.parent.parent.parent / 'chinh_tri.md'
    loi_the_dict = extract_loi_the_content(chinh_tri_path)
    
    print(f"✅ Extracted {len(loi_the_dict)} lời thề")
    
    # Create output directory
    output_dir = Path('./data/audio_templates')
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 Output directory: {output_dir}")
    
    # Import TTS - use direct pyttsx3
    try:
        import pyttsx3
        
        # Initialize TTS
        print("\n🔊 Initializing TTS...")
        engine = pyttsx3.init()
        
        # Set voice to Microsoft An
        voices = engine.getProperty('voices')
        for voice in voices:
            if 'An' in voice.name or 'Vietnamese' in voice.name:
                engine.setProperty('voice', voice.id)
                break
        
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 1.0)
        
        print("✅ TTS initialized")
        
        # Generate each audio file
        print("\n🎵 Generating audio files...")
        for num in sorted(loi_the_dict.keys()):
            content = loi_the_dict[num]
            
            # Format text for TTS
            text = f"Lời thề số {num}: {content}"
            
            # Output filename
            output_file = output_dir / f"loi_the_{num}.wav"
            
            print(f"\n  [{num}/10] Generating loi_the_{num}.wav...")
            print(f"  Content: {content[:80]}...")
            
            # Generate
            try:
                engine.save_to_file(text, str(output_file))
                engine.runAndWait()
                
                if output_file.exists():
                    file_size = output_file.stat().st_size
                    print(f"  ✅ Success: {file_size / 1024:.1f} KB")
                else:
                    print(f"  ❌ Failed - file not created")
            except Exception as e:
                print(f"  ❌ Error: {e}")
        
        print("\n" + "=" * 70)
        print("🎉 Audio generation complete!")
        print("=" * 70)
        
        # Summary
        generated_files = list(output_dir.glob("loi_the_*.wav"))
        print(f"\n✅ Generated {len(generated_files)} audio files")
        
        total_size = sum(f.stat().st_size for f in generated_files)
        print(f"📊 Total size: {total_size / 1024 / 1024:.2f} MB")
        
        print(f"\n📁 Location: {output_dir.absolute()}")
        
        # List files
        print("\n📋 Files:")
        for f in sorted(generated_files):
            size_kb = f.stat().st_size / 1024
            print(f"  - {f.name} ({size_kb:.1f} KB)")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    generate_audio_files()
