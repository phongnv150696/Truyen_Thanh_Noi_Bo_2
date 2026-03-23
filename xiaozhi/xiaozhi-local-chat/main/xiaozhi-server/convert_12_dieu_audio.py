"""
Convert 12 điều audio templates to 16kHz mono
"""
from pathlib import Path
import subprocess
import shutil

def convert_12_dieu_audio():
    """Convert 12 điều audio files to 16kHz mono"""
    
    audio_dir = Path('./data/audio_templates')
    
    # Get all dieu_*.wav files
    audio_files = list(audio_dir.glob("dieu_*.wav"))
    
    if not audio_files:
        print("❌ No dieu_*.wav files found!")
        return
    
    print(f"\n🔧 Converting {len(audio_files)} files to 16kHz mono...")
    print("=" * 70)
    
    for audio_file in sorted(audio_files, key=lambda x: int(x.stem.split('_')[1])):
        temp_file = audio_file.with_suffix('.tmp.wav')
        
        try:
            # ffmpeg command
            cmd = [
                'ffmpeg',
                '-i', str(audio_file),
                '-ar', '16000',
                '-ac', '1',
                '-sample_fmt', 's16',
                '-y',
                str(temp_file)
            ]
            
            result = subprocess.run(cmd, capture_output=True, check=True)
            shutil.move(str(temp_file), str(audio_file))
            
            size_kb = audio_file.stat().st_size / 1024
            print(f"✅ {audio_file.name}: {size_kb:.1f} KB")
            
        except Exception as e:
            print(f"❌ Error converting {audio_file.name}: {e}")
            if temp_file.exists():
                temp_file.unlink()
    
    print("=" * 70)
    print("✅ Conversion complete!")


if __name__ == "__main__":
    convert_12_dieu_audio()
