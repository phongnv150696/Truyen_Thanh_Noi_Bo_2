import asyncio
import edge_tts

async def list_voices():
    voices = await edge_tts.VoicesManager.create()
    v_list = voices.find(Locale='vi-VN')
    for v in v_list:
        print(f"Name: {v['Name']}, Gender: {v['Gender']}, ContentCategories: {v.get('ContentCategories', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(list_voices())
