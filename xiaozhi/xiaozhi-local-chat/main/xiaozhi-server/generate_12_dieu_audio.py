"""
Generate Audio Templates for 12 Điều Kỷ Luật
"""
import sys
import re
from pathlib import Path

sys.path.insert(0, '.')

def extract_12_dieu_content(file_path):
    """Extract content of 12 điều from file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Pattern to match each điều
    pattern = r'\*\*Điều (\d+):\*\* (.+?)(?=\n\n\*\*Điều |\Z)'
    matches = re.findall(pattern, content, re.DOTALL)
    
    dieu_dict = {}
    for num, text in matches:
        dieu_dict[int(num)] = text.strip()
    
    return dieu_dict


def generate_audio_files():
    """Generate audio files for each điều"""
    print("=" * 70)
    print("🎙️ Generating Audio Templates for 12 Điều Kỷ Luật")
    print("=" * 70)
    
    # Extract content
    print("\n📄 Extracting content from 12_dieu_ky_luat.md...")
    content_file = Path(__file__).parent.parent.parent.parent / '12_dieu_ky_luat.md'
    dieu_dict = extract_12_dieu_content(content_file)
    
    print(f"✅ Extracted {len(dieu_dict)} điều")
    
    # Create output directory
    output_dir = Path('./data/audio_templates')
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 Output directory: {output_dir}")
    
    # Import TTS
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
        for num in sorted(dieu_dict.keys()):
            content = dieu_dict[num]
            
            # Format text for TTS
            text = f"Điều {num}: {content}"
            
            # Output filename
            output_file = output_dir / f"dieu_{num}.wav"
            
            print(f"\n  [{num}/12] Generating dieu_{num}.wav...")
            print(f"  Content: {content[:60]}...")
            
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
        generated_files = list(output_dir.glob("dieu_*.wav"))
        print(f"\n✅ Generated {len(generated_files)} audio files")
        
        total_size = sum(f.stat().st_size for f in generated_files)
        print(f"📊 Total size: {total_size / 1024 / 1024:.2f} MB")
        
        print(f"\n📁 Location: {output_dir.absolute()}")
        
        # List files
        print("\n📋 Files:")
        for f in sorted(generated_files, key=lambda x: int(x.stem.split('_')[1])):
            size_kb = f.stat().st_size / 1024
            print(f"  - {f.name} ({size_kb:.1f} KB)")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    generate_audio_files()
