import asyncio
import edge_tts
import sys

async def list_voices():
    try:
        voices = await edge_tts.VoicesManager.create()
        v_list = voices.find(Locale='vi-VN')
        with open('voices_list.txt', 'w', encoding='utf-8') as f:
            for v in v_list:
                f.write(f"Name: {v['Name']}, Gender: {v['Gender']}\n")
        print("Successfully wrote voice list to voices_list.txt")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_voices())
