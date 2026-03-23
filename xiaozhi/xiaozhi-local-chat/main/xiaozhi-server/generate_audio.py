
import os
import pyttsx3

# Config from config.yaml
VOICE_NAME = "Microsoft An"
RATE = 140 # Slowed down slightly for clarity

# Text content with explicit punctuation for pauses
TEXT_23 = """Hai mươi ba đầu công việc trong ngày là: ...

1. . . Báo thức buổi sáng ...

2. . . Thể dục sáng ...

3. . . Vệ sinh cá nhân ...

4. . . Ăn sáng ...

5. . . Kiểm tra sáng ...

6. . . Chuẩn bị học tập công tác ...

7. . . Học tập công tác ...

8. . . Ăn trưa ...

9. . . Nghỉ trưa ...

10. . . Báo thức buổi chiều ...

11. . . Chuẩn bị học tập công tác ...

12. . . Học tập công tác ...

13. . . Bảo quản vũ khí, khí tài trang bị ...

14. . . Thể thao tăng gia sản xuất ...

15. . . Vệ sinh cá nhân ...

16. . . Ăn chiều ...

17. . . Sinh hoạt tổ ...

18. . . Sinh hoạt tiểu đội ...

19. . . Đọc báo, nghe tin, xem thời sự ...

20. . . Sinh hoạt học tập ...

21. . . Điểm danh, điểm quân số ...

22. . . Chuẩn bị mắc màn đi ngủ ...

23. . . Tắt điện đi ngủ ..."""

TEXT_9 = """Chín đầu công việc sáng thứ hai là: ...

1. . . Báo thức buổi sáng ...

2. . . Thể dục buổi sáng ...

3. . . Vệ sinh cá nhân ...

4. . . Ăn sáng ...

5. . . Kiểm tra sáng ...

6. . . Chuẩn bị chào cờ, duyệt đội ngũ ...

7. . . Chào cờ, duyệt đội ngũ ...

8. . . Thông báo chính trị ...

9. . . Học tập, công tác ..."""

def generate(text, filename):
    print(f"Generating {filename}...")
    engine = pyttsx3.init()
    engine.setProperty('rate', RATE)
    
    # Find voice
    voices = engine.getProperty('voices')
    voice_found = False
    for voice in voices:
        if VOICE_NAME in voice.name or VOICE_NAME in voice.id:
            engine.setProperty('voice', voice.id)
            print(f"Using voice: {voice.name}")
            voice_found = True
            break
    
    if not voice_found:
        print(f"Warning: Voice '{VOICE_NAME}' not found. Using default.")

    # Save to file
    # pyttsx3 save_to_file is synchronous but needs runAndWait
    engine.save_to_file(text, filename)
    engine.runAndWait()
    print(f"Done: {filename}")

def main():
    os.makedirs("data/audio_static", exist_ok=True)
    
    # Abs paths are safer for pyttsx3 sometimes
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "data", "audio_static")
    os.makedirs(output_dir, exist_ok=True)
    
    generate(TEXT_23, os.path.join(output_dir, "23_dau_cong_viec.wav")) # pyttsx3 usually saves wav better
    generate(TEXT_9, os.path.join(output_dir, "9_dau_cong_viec.wav"))

if __name__ == "__main__":
    main()
