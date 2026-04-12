from gtts import gTTS
import os

def test_google_tts():
    try:
        text = "Chào các đồng chí, đây là giọng đọc miền Bắc chuẩn của Google phục vụ hệ thống truyền thanh nội bộ."
        tts = gTTS(text=text, lang='vi')
        tts.save("test_google_north.mp3")
        print("Successfully generated Google Northern TTS to test_google_north.mp3")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_google_tts()
