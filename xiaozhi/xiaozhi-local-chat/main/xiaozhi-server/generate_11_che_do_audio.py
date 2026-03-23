import os
import pyttsx3

# Config
VOICE_NAME = "Microsoft An"
RATE = 140

# Text with pauses
TEXT_11_CHE_DO = """Mười một chế độ trong ngày là: ...

1. . . Treo Quốc kỳ ...

2. . . Thức dậy ...

3. . . Thể dục sáng ...

4. . . Kiểm tra sáng ...

5. . . Học tập ...

6. . . Ăn uống ...

7. . . Bảo quản vũ khí, khí tài, trang bị ...

8. . . Thể thao, tăng gia sản xuất ...

9. . . Đọc báo, nghe tin ...

10. . . Điểm danh, điểm quân số ...

11. . . Ngủ, nghỉ ..."""

def generate(text, filename):
    print(f"Generating {filename}...")
    engine = pyttsx3.init()
    engine.setProperty('rate', RATE)
    
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

    import pythoncom
    try:
        pythoncom.CoInitialize()
        engine.save_to_file(text, filename)
        engine.runAndWait()
        del engine
    except Exception as e:
        print(f"Error: {e}")
    finally:
        pythoncom.CoUninitialize()
        
    print(f"Done: {filename}")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(base_dir, "data", "audio_static")
    os.makedirs(output_dir, exist_ok=True)
    
    generate(TEXT_11_CHE_DO, os.path.join(output_dir, "11_che_do_trong_ngay.wav"))

if __name__ == "__main__":
    main()
