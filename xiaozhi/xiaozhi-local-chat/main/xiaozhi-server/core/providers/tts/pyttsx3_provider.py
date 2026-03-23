import os
import uuid
import pyttsx3
import asyncio
from datetime import datetime
from core.providers.tts.base import TTSProviderBase
from config.logger import setup_logging
import pythoncom

TAG = __name__

class TTSProvider(TTSProviderBase):
    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        self.logger = setup_logging()
        self.voice_id = config.get("voice", None)
        self.rate = config.get("rate", 150)
        self.volume = config.get("volume", 1.0)
        
        
        # Engine will be initialized per-request in the thread to ensure thread safety
        self.logger.bind(tag=TAG).info(f"TTS Provider Initialized with Rate={self.rate}, Voice={self.voice_id}")
        
    def generate_filename(self, extension=".wav"):
        return os.path.join(
            self.output_file,
            f"tts-{datetime.now().date()}@{uuid.uuid4().hex}{extension}",
        )

    async def text_to_speak(self, text, output_file):
        if not text:
            return None

        try:
            # If output_file is not provided, generate a temp one
            generated_temp_file = False
            if not output_file:
                output_file = self.generate_filename()
                generated_temp_file = True
                
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            
            # pyttsx3 save_to_file is synchronous and blocks the loop
            # We run it in a thread executor to avoid blocking the main server loop
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, self._save_audio_sync, text, output_file)

            # Check if file exists
            if os.path.exists(output_file):
                if generated_temp_file:
                    # If we generated a temp file, read it, delete it, and return bytes
                    try:
                        with open(output_file, "rb") as f:
                            audio_bytes = f.read()
                        os.remove(output_file)
                        return audio_bytes
                    except Exception as e:
                        self.logger.bind(tag=TAG).error(f"Error reading/deleting temp TTS file: {e}")
                        return None
                else:
                    # Caller provided the file path, just return it
                    return output_file
            else:
                self.logger.bind(tag=TAG).error("TTS output file was not created successfully.")
                return None
                
        except Exception as e:
            self.logger.bind(tag=TAG).error(f"pyttsx3 generation failed: {e}")
            return None

    def _save_audio_sync(self, text, output_file):
        """Synchronous wrapper for pyttsx3 save_to_file"""
        try:
            pythoncom.CoInitialize()
            # Initialize a new engine instance for this thread to ensure COM safety
            engine = pyttsx3.init()
            
            # Configure engine (must be done on the same thread as init)
            engine.setProperty('rate', self.rate)
            engine.setProperty('volume', self.volume)
            
            if self.voice_id:
                found = False
                voices = engine.getProperty('voices')
                for voice in voices:
                    if self.voice_id.lower() in voice.id.lower() or \
                       self.voice_id.lower() in voice.name.lower():
                        engine.setProperty('voice', voice.id)
                        found = True
                        break
            
            engine.save_to_file(text, output_file)
            engine.runAndWait()
            
            # Explicitly del engine to help cleanup COM objects
            del engine
        except Exception as e:
            self.logger.bind(tag=TAG).error(f"TTS Thread Error: {e}")
        finally:
            pythoncom.CoUninitialize()
