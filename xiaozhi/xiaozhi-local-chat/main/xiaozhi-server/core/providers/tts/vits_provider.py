import os
import uuid
import sherpa_onnx
import soundfile as sf
import asyncio
from datetime import datetime
from core.providers.tts.base import TTSProviderBase
from config.logger import setup_logging

TAG = __name__

class TTSProvider(TTSProviderBase):
    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        self.logger = setup_logging()
        
        # Load config
        self.config = config
        self.model_dir = config.get("model_dir", "models/vits-mms-vie")
        
        # Find .onnx file
        model_file = "model.onnx"
        if os.path.exists(self.model_dir):
            for f in os.listdir(self.model_dir):
                if f.endswith(".onnx"):
                    model_file = f
                    break
        
        model_path = os.path.join(self.model_dir, model_file)
        tokens_path = os.path.join(self.model_dir, "tokens.txt")
        data_dir = os.path.join(self.model_dir, "espeak-ng-data")
        
        if not os.path.exists(model_path) or not os.path.exists(tokens_path):
             self.logger.bind(tag=TAG).error(f"VITS model not found at {self.model_dir}")
             self.tts = None
             return

        try:
            self.tts = sherpa_onnx.OfflineTts(
                config=sherpa_onnx.OfflineTtsConfig(
                    model=sherpa_onnx.OfflineTtsModelConfig(
                        vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                            model=model_path,
                            lexicon="",
                            tokens=tokens_path,
                            data_dir=data_dir if os.path.exists(data_dir) else "",
                        ),
                        provider="cpu",
                        debug=False,
                        num_threads=1,
                    )
                )
            )
            self.sample_rate = self.tts.sample_rate
            self.logger.bind(tag=TAG).info(f"VITS Provider Initialized (Rate: {self.sample_rate})")
        except Exception as e:
            self.logger.bind(tag=TAG).error(f"Failed to initialize VITS: {e}")
            self.tts = None

    def generate_filename(self, extension=".wav"):
        return os.path.join(
            self.output_file,
            f"tts-{datetime.now().date()}@{uuid.uuid4().hex}{extension}",
        )

    async def text_to_speak(self, text, output_file):
        if not text or not self.tts:
            return None

        try:
            # Run generation in executor to avoid blocking main loop
            loop = asyncio.get_running_loop()
            return await loop.run_in_executor(None, self._generate_audio_sync, text, output_file)
        except Exception as e:
            self.logger.bind(tag=TAG).error(f"VITS generation failed: {e}")
            return None

    def _normalize_text(self, text):
        """
        Normalize text for VITS:
        1. Expand numbers to Vietnamese text (0-9)
        2. Remove unsupported characters (Chinese, Korean, etc)
        """
        if not text:
            return ""
            
        import re
        # Basic number expansion (0-9)
        replacements = {
            "0": "không", "1": "một", "2": "hai", "3": "ba", "4": "bốn",
            "5": "năm", "6": "sáu", "7": "bảy", "8": "tám", "9": "chín"
        }
        
        normalized = text
        for digit, word in replacements.items():
            normalized = normalized.replace(digit, f" {word} ")
        
        # Keep only Vietnamese characters, English, punctuation, and spaces
        # Vietnamese unicode blocks:
        # \u00C0-\u1EF9 : Latin-1 Supplement, Latin Extended-A/B, Latin Extended Additional (covers most VI tones)
        # \u0020-\u007E : Basic ASCII (English + Punctuation)
        # We aggressively filter anything else (like Chinese \u4e00-\u9fff)
        normalized = re.sub(r'[^\u0020-\u007E\u00C0-\u1EF9]', ' ', normalized)
            
        # Clean extra spaces
        normalized = " ".join(normalized.split())
        return normalized

    def _generate_audio_sync(self, text, output_file):
        # Normalize text first
        text = self._normalize_text(text)
        self.logger.bind(tag=TAG).debug(f"Normalized text for VITS: {text}")

        if not text.strip():
            self.logger.bind(tag=TAG).warning(f"Text is empty after normalization. Skipping VITS.")
            return None

        # Generate audio
        speed = self.config.get("speed", 1.0)
        audio = self.tts.generate(text, sid=0, speed=speed)
        
        # Generate temp file if needed
        generated_temp_file = False
        if not output_file:
            output_file = self.generate_filename()
            generated_temp_file = True
            
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        # Save to WAV
        sf.write(
            output_file,
            audio.samples,
            samplerate=audio.sample_rate,
            subtype="PCM_16",
        )
        
        if generated_temp_file:
            # Read bytes and delete if we made a temp file for byte return
            try:
                with open(output_file, "rb") as f:
                    audio_bytes = f.read()
                os.remove(output_file)
                return audio_bytes
            except Exception:
                return None
        else:
            return output_file
