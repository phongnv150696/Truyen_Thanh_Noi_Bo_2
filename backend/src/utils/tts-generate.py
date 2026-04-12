import asyncio
import edge_tts
import sys
import os
import types

async def generate_edge_tts(text, voice, rate, pitch, output_path):
    """Generate TTS using Microsoft Edge TTS (online, neural)"""
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(output_path)

def generate_gemini(text, voice_name, output_path, api_key):
    """Generate TTS using Google Gemini Multimodal Audio Generation API"""
    try:
        from google import genai
        try:
            from google.genai import types
        except ImportError:
            # For older versions or different environments
            import google.genai.types as types
        
        if not api_key:
            # Fallback for when the Node backend process hasn't reloaded .env
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
            try:
                with open(env_path, 'r') as f:
                    for line in f:
                        if line.startswith("GEMINI_API_KEY="):
                            # strip whitespace and quotes
                            api_key = line.strip().split("=", 1)[1].strip('"\'')
                            break
            except Exception:
                pass
                
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set or passed.")

        client = genai.Client(api_key=api_key)
        
        print(f"Gemini-TTS: Calling model with voice={voice_name}...")
        response = client.models.generate_content(
            model='gemini-2.5-flash-preview-tts',
            contents=text, # Simplified prompt as we are using a TTS-specific model
            config=types.GenerateContentConfig(
                response_modalities=["AUDIO"],
                speech_config=types.SpeechConfig(
                    voice_config=types.VoiceConfig(
                        prebuilt_voice_config=types.PrebuiltVoiceConfig(
                            voice_name=voice_name
                        )
                    )
                )
            )
        )
        
        if not response.candidates or not response.candidates[0].content.parts:
            print(f"Gemini-TTS Error: API returned no candidates. Full response: {response}")
            raise Exception("No audio data parts returned from Gemini")

        audio_data = response.candidates[0].content.parts[0].inline_data.data
        if not audio_data:
            print(f"Gemini-TTS Error: Inline data is empty. Parts: {response.candidates[0].content.parts}")
            raise Exception("No audio data bytes returned from Gemini")

        print(f"Gemini-TTS: Received {len(audio_data)} bytes of audio data.")

        # Save to wav format since Gemini returns audio bytes (typically PCM/wav)
        wav_path = output_path.replace('.mp3', '.wav')
        with open(wav_path, "wb") as f:
            f.write(audio_data)

        # Convert raw PCM (24kHz, 16-bit, mono) -> mp3 using ffmpeg if output_path is .mp3
        if output_path.endswith('.mp3'):
            import subprocess
            print(f"Gemini-TTS: Converting PCM to MP3 using FFmpeg...")
            res = subprocess.run(
                ['ffmpeg', '-y', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', wav_path, '-codec:a', 'libmp3lame', '-qscale:a', '2', '-preset', 'ultrafast', output_path],
                capture_output=True, text=True
            )
            if res.returncode != 0:
                print(f"Gemini-TTS FFmpeg Error: {res.stderr}")
                raise Exception(f"FFmpeg conversion failed: {res.stderr}")
            
            os.remove(wav_path)
            
        print(f"Gemini-TTS: Successfully generated {output_path}")
    except ImportError:
        print("ERROR: google-genai not installed. Run: pip install google-genai")
        sys.exit(1)
    except Exception as e:
        print(f"Gemini TTS Error: {str(e)}")
        # Log stack trace for easier debugging
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Usage: python tts-generate.py <text> <voice> <rate> <pitch> <output_path> [api_key]")
        sys.exit(1)

    text = sys.argv[1]
    voice = sys.argv[2]
    rate = sys.argv[3]
    pitch = sys.argv[4]
    output_path = sys.argv[5]
    api_key = sys.argv[6] if len(sys.argv) > 6 else os.environ.get("GEMINI_API_KEY", "")

    try:
        if voice.startswith("gemini-"):
            speaker = voice.replace("gemini-", "").capitalize()
            generate_gemini(text, speaker, output_path, api_key)
        else:
            asyncio.run(generate_edge_tts(text, voice, rate, pitch, output_path))

        print(f"Successfully generated TTS to {output_path}")
    except Exception as e:
        print(f"Error generating TTS: {str(e)}")
        sys.exit(1)
