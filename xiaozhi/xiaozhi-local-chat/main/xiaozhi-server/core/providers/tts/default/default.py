import os
import uuid
from datetime import datetime
from core.providers.tts.base import TTSProviderBase


class DefaultTTS(TTSProviderBase):
    """Default TTS provider - simplified implementation"""

    def __init__(self, config, delete_audio_file):
        super().__init__(config, delete_audio_file)
        self.voice = config.get("voice", "default")
        self.audio_file_type = config.get("format", "wav")

    def generate_filename(self, extension=".wav"):
        return os.path.join(
            self.output_file,
            f"tts-{datetime.now().date()}@{uuid.uuid4().hex}{extension}",
        )

    async def text_to_speak(self, text, output_file):
        """Generate speech from text"""
        # This is a placeholder implementation
        # In a real implementation, this would generate actual audio
        if output_file:
            # Create an empty file as placeholder
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
            with open(output_file, "wb") as f:
                # Write minimal WAV header + silence
                f.write(b'RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x01\x00\x08\x00data\x00\x08\x00\x00')
        else:
            # Return empty audio bytes
            return b'RIFF\x24\x08\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x01\x00\x08\x00data\x00\x08\x00\x00'