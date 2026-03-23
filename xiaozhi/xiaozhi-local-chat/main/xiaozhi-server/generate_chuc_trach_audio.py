"""
Generate Pre-recorded Audio Templates for 10 Chức Trách Quân Nhân
"""
import sys
import os
from pathlib import Path

# Add project root
sys.path.insert(0, '.')

# 10 Chức trách quân nhân content
CHUC_TRACH_CONTENT = {
    1: "Thực hiện đúng 10 lời thề danh dự và 12 điều kỷ luật khi quan hệ với nhân dân. Luôn rèn ý chí chiến đấu, khắc phục mọi khó khăn, không sợ hy sinh, gian khổ, quyết tâm hoàn thành xuất sắc mọi nhiệm vụ được giao.",
    2: "Tuyệt đối phục tùng lãnh đạo, chỉ huy, chấp hành nghiêm mệnh lệnh, chỉ thị của cấp trên và điều lệnh, điều lệ, chế độ, quy định của quân đội.",
    3: "Tích cực học tập chính trị, quân sự, văn hóa, khoa học kỹ thuật và pháp luật để không ngừng nâng cao phẩm chất, năng lực hoạt động. Rèn luyện thể thao, tác phong chiến đấu.",
    4: "Giữ gìn đoàn kết nội bộ, đề cao tự phê bình và phê bình, trung thực, bình đẳng, yêu thương, tôn trọng, bảo vệ, giúp đỡ lẫn nhau lúc bình thường cũng như khi chiến đấu.",
    5: "Giữ gìn vũ khí, trang bị, tài sản của quân đội, bảo vệ và tiết kiệm của công, không tham ô, lãng phí.",
    6: "Tuyệt đối giữ bí mật của nhà nước và quân đội, đề cao cảnh giác cách mạng. Nếu bị địch bắt quyết một lòng trung thành với sự nghiệp cách mạng, không phản bội.",
    7: "Đoàn kết bảo vệ giúp đỡ nhân dân, tôn trọng lợi ích chính đáng và phong tục tập quán của nhân dân.",
    8: "Gương mẫu chấp hành pháp luật của Đảng và Nhà nước, quy tắc sinh hoạt xã hội; bảo vệ cơ quan Đảng và Nhà nước.",
    9: "Nêu cao tinh thần đoàn kết quốc tế vô sản, làm tròn nghĩa vụ quốc tế, góp phần vào sự nghiệp cách mạng của các dân tộc đang đấu tranh chống chủ nghĩa đế quốc.",
    10: "Chấp hành đúng chính sách đối với tù binh, hàng binh, tích cực tiến hành công tác tuyên truyền đặc biệt.",
}

def generate_audio_files():
    """Generate audio files for each chức trách"""
    print("=" * 70)
    print("🎙️ Generating Audio Templates for 10 Chức Trách Quân Nhân")
    print("=" * 70)
    
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
                print(f"✅ Selected voice: {voice.name}")
                break
        
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 1.0)
        
        print("✅ TTS initialized")
        
        # Generate each audio file
        print("\n🎵 Generating audio files...")
        for num in sorted(CHUC_TRACH_CONTENT.keys()):
            content = CHUC_TRACH_CONTENT[num]
            
            # Format text for TTS
            text = f"Chức trách số {num}: {content}"
            
            # Output filename
            output_file = output_dir / f"chuc_trach_{num}.wav"
            
            print(f"\n  [{num}/10] Generating chuc_trach_{num}.wav...")
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
        generated_files = list(output_dir.glob("chuc_trach_*.wav"))
        print(f"\n✅ Generated {len(generated_files)} audio files")
        
        total_size = sum(f.stat().st_size for f in generated_files)
        print(f"📊 Total size: {total_size / 1024 / 1024:.2f} MB")
        
        print(f"\n📁 Location: {output_dir.absolute()}")
        
        # List files
        print("\n📋 Files:")
        for f in sorted(generated_files):
            size_kb = f.stat().st_size / 1024
            print(f"  - {f.name} ({size_kb:.1f} KB)")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = generate_audio_files()
    sys.exit(0 if success else 1)
