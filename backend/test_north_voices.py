import asyncio
import edge_tts

async def test_voices():
    voices = [
        ("vi-VN-HiepNeural", "test_hiep.mp3"),
        ("vi-VN-AnNeural", "test_an.mp3")
    ]
    for voice, filename in voices:
        try:
            communicate = edge_tts.Communicate("Chào các đồng chí, đây là giọng đọc miền Bắc chuẩn.", voice)
            await communicate.save(filename)
            print(f"Successfully saved {filename} with {voice}")
        except Exception as e:
            print(f"Failed to save {filename} with {voice}: {e}")

if __name__ == "__main__":
    asyncio.run(test_voices())
