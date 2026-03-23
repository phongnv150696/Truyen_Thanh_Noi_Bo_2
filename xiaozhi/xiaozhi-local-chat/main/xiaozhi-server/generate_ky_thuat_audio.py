"""
Generate audio for Chỉ thị 33 and Chức trách người gác
"""
import sys
import os
from pathlib import Path

sys.path.insert(0, '.')

# Content for Chỉ thị 33
CHI_THI_33_CONTENT = """
Chỉ thị 33 ngày 22/9/2009 của Tổng Tham mưu trưởng về việc quản lý, sử dụng vũ khí, đạn sẵn sàng chiến đấu, thay thế Chỉ thị 17 ngày 22/5/2006.

Đạn nhọn K51, K53, K56, 12 li 7 được biên chế theo Chỉ thị 15, thay cho chỉ thị 33, quản lý tập trung ở kho trung đoàn hoặc tiểu đoàn, đại đội độc lập, xếp riêng theo đầu mối từng tiểu đoàn, đại đội, không quản lý ở cấp trung đội, chỉ để ở trung đội 01 hòm đạn K56.

Khi làm nhiệm vụ canh phòng bảo vệ các mục tiêu như sở chỉ huy, kho tàng, doanh trại:

Đối với súng tiểu liên AK, mỗi khẩu trang bị 20 viên lắp vào 1 hộp tiếp đạn để trong bao đạn đeo vào người, không lắp vào súng, chỉ lắp vào súng 1 hộp tiếp đạn không có đạn.

Đối với súng ngắn, mỗi khẩu trang bị 6 viên lắp vào 1 hộp tiếp đạn để trong bao đạn đeo vào người, không lắp vào súng, chỉ lắp vào súng 1 hộp tiếp đạn không có đạn.

Kho đạn, tủ súng phải được khóa bằng 2 khóa, chỉ huy giữ 1 chìa khóa, thủ kho hoặc quân khí viên giữ 1 chìa khóa, người quản lý kho đạn, tủ súng phải luôn mang chìa khóa theo người; khi đi vắng phải bàn giao đầy đủ cho người được chỉ huy đơn vị giao nhiệm vụ nhận thay; nghiêm cấm việc gửi hoặc cho mượn chìa khóa kho đạn, tủ súng cho người không có trách nhiệm quản lý.
"""

# Content for Chức trách người gác
CHUC_TRACH_NGUOI_GAC_CONTENT = """
Chức trách người gác:

Người gác là người đang làm nhiệm vụ sẵn sàng chiến đấu để bảo vệ mục tiêu được giao. Không ai được xâm phạm đến thân thể, vị trí của người gác.

Người gác phải ở vị trí gác, có thể đi lại xung quanh khu vực vọng gác. Tư thế phải nghiêm túc, đúng động tác gác; nếu trang bị súng tiểu liên thì ở tư thế mang súng hoặc chuẩn bị bắn, nếu trang bị súng trường thì ở tư thế nghiêm, nghỉ, khi di chuyển thì xách súng hoặc cầm ngang súng.

Người gác phải luôn tỉnh táo, tập trung tư tưởng, không ngủ gật, hút thuốc, đọc báo, hát, nói chuyện, cười đùa, ăn uống. Cấm bỏ gác hoặc nhận bất cứ vật gì của người khác.
"""

def generate_audio_files():
    """Generate audio files"""
    print("=" * 70)
    print("🎙️ Generating Technical Directive Audio Files")
    print("=" * 70)
    
    output_dir = Path('./data/audio_templates')
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"\n📁 Output directory: {output_dir}")
    
    try:
        import pyttsx3
        
        print("\n🔊 Initializing TTS...")
        engine = pyttsx3.init()
        
        voices = engine.getProperty('voices')
        for voice in voices:
            if 'An' in voice.name or 'Vietnamese' in voice.name:
                engine.setProperty('voice', voice.id)
                print(f"✅ Selected voice: {voice.name}")
                break
        
        engine.setProperty('rate', 150)
        engine.setProperty('volume', 1.0)
        
        # Generate files
        files_to_generate = {
            'chi_thi_33.wav': CHI_THI_33_CONTENT,
            'chuc_trach_nguoi_gac.wav': CHUC_TRACH_NGUOI_GAC_CONTENT,
        }
        
        for filename, content in files_to_generate.items():
            output_file = output_dir / filename
            print(f"\n🎵 Generating {filename}...")
            print(f"  Content length: {len(content)} chars")
            
            try:
                engine.save_to_file(content.strip(), str(output_file))
                engine.runAndWait()
                
                if output_file.exists():
                    file_size = output_file.stat().st_size
                    print(f"  ✅ Success: {file_size / 1024:.1f} KB")
                else:
                    print(f"  ❌ Failed")
            except Exception as e:
                print(f"  ❌ Error: {e}")
        
        print("\n" + "=" * 70)
        print("🎉 Audio generation complete!")
        print("=" * 70)
        
        generated_files = list(output_dir.glob("chi_thi_*.wav")) + list(output_dir.glob("chuc_trach_nguoi_gac.wav"))
        print(f"\n✅ Generated {len(generated_files)} audio files")
        
        total_size = sum(f.stat().st_size for f in generated_files)
        print(f"📊 Total size: {total_size / 1024 / 1024:.2f} MB")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = generate_audio_files()
    sys.exit(0 if success else 1)
