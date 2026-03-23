import pyttsx3

try:
    engine = pyttsx3.init()
    voices = engine.getProperty('voices')
    print(f"Found {len(voices)} voices:")
    for idx, voice in enumerate(voices):
        print(f"Index: {idx}")
        print(f"Timestamp: {voice.id}")
        print(f"Name: {voice.name}")
        print(f"Languages: {voice.languages}")
        print("-" * 30)
except Exception as e:
    print(f"Error: {e}")
