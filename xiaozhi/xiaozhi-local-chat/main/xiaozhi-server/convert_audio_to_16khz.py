"""
Convert audio templates to 16kHz mono WAV for correct playback speed
"""
from pathlib import Path
import subprocess
import shutil

def convert_audio_files():
    """Convert all audio template files to 16kHz mono"""
    
    audio_dir = Path('./data/audio_templates')
    backup_dir = Path('./data/audio_templates_backup')
    
    # Create backup
    if not backup_dir.exists():
        print("📦 Creating backup...")
        shutil.copytree(audio_dir, backup_dir)
        print(f"✅ Backup created: {backup_dir}")
    
    # Get all WAV files
    audio_files = list(audio_dir.glob("loi_the_*.wav"))
    
    print(f"\n🔧 Converting {len(audio_files)} files to 16kHz mono...")
    print("=" * 70)
    
    for audio_file in sorted(audio_files):
        temp_file = audio_file.with_suffix('.tmp.wav')
        
        try:
            # ffmpeg command: convert to 16kHz, mono, 16-bit
            cmd = [
                'ffmpeg',
                '-i', str(audio_file),
                '-ar', '16000',        # Sample rate: 16kHz
                '-ac', '1',            # Channels: mono
                '-sample_fmt', 's16',  # Format: 16-bit signed
                '-y',                  # Overwrite
                str(temp_file)
            ]
            
            # Run conversion
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )
            
            # Replace original with converted
            shutil.move(str(temp_file), str(audio_file))
            
            # Get file size
            size_kb = audio_file.stat().st_size / 1024
            print(f"✅ {audio_file.name}: {size_kb:.1f} KB")
            
        except subprocess.CalledProcessError as e:
            print(f"❌ Error converting {audio_file.name}:")
            print(f"   {e.stderr}")
        except Exception as e:
            print(f"❌ Error: {e}")
            # Clean up temp file if exists
            if temp_file.exists():
                temp_file.unlink()
    
    print("=" * 70)
    print("✅ Conversion complete!")
    print(f"\n📁 Converted files: {audio_dir}")
    print(f"📦 Backup location: {backup_dir}")
    print("\nℹ️  All files are now 16kHz mono for correct playback speed")


if __name__ == "__main__":
    try:
        convert_audio_files()
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
