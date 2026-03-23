"""
Add silence padding to audio files to prevent truncation
"""
from pathlib import Path
from pydub import AudioSegment
import shutil

def add_silence_padding():
    """Add 500ms silence to end of each audio file"""
    
    audio_dir = Path('./data/audio_templates')
    
    # Get all audio files
    all_files = list(audio_dir.glob("loi_the_*.wav")) + list(audio_dir.glob("dieu_*.wav"))
    
    if not all_files:
        print("❌ No audio files found!")
        return
    
    print(f"\n🔧 Adding silence padding to {len(all_files)} files...")
    print("=" * 70)
    
    # Silence: 500ms at 16kHz mono
    silence = AudioSegment.silent(duration=500, frame_rate=16000)
    
    for audio_file in sorted(all_files):
        try:
            # Load audio
            audio = AudioSegment.from_wav(str(audio_file))
            
            # Add silence at end
            padded_audio = audio + silence
            
            # Export
            padded_audio.export(str(audio_file), format='wav')
            
            size_kb = audio_file.stat().st_size / 1024
            print(f"✅ {audio_file.name}: {size_kb:.1f} KB (+ 500ms padding)")
            
        except Exception as e:
            print(f"❌ Error padding {audio_file.name}: {e}")
    
    print("=" * 70)
    print("✅ Padding complete!")
    print("\nℹ️  All files now have 500ms silence at end to prevent truncation")


if __name__ == "__main__":
    add_silence_padding()
