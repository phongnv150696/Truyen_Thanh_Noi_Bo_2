import asyncio
import edge_tts
import sys
import os

async def generate_tts(text, voice, output_path):
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(output_path)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python tts-generate.py <text> <voice> <output_path>")
        sys.exit(1)
    
    text = sys.argv[1]
    voice = sys.argv[2]
    output_path = sys.argv[3]
    
    try:
        asyncio.run(generate_tts(text, voice, output_path))
        print(f"Successfully generated TTS to {output_path}")
    except Exception as e:
        print(f"Error generating TTS: {str(e)}")
        sys.exit(1)
