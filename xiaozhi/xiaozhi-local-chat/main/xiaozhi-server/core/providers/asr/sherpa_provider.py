import os
import sherpa_onnx
import wave
import numpy as np
from core.providers.asr.base import ASRProviderBase
from config.logger import setup_logging
from typing import Optional, Tuple, List

TAG = __name__

class ASRProvider(ASRProviderBase):
    def __init__(self, config, delete_audio_file):
        super().__init__()
        self.logger = setup_logging()
        self.delete_audio_file = delete_audio_file
        self.model_dir = config.get("model_dir", "models/sherpa-onnx-zipformer-vi-2023-05-23")
        self.output_dir = config.get("output_dir", "tmp/")
        self.interface_type = "local" # Use local interface type

        self.recognizer = None
        
        # Auto-detect model paths
        encoder = None
        decoder = None
        joiner = None
        tokens = os.path.join(self.model_dir, "tokens.txt")
        
        if os.path.exists(self.model_dir):
            for file in os.listdir(self.model_dir):
                if file.startswith("encoder-") and file.endswith(".onnx"):
                    encoder = os.path.join(self.model_dir, file)
                elif file.startswith("decoder-") and file.endswith(".onnx"):
                    decoder = os.path.join(self.model_dir, file)
                elif file.startswith("joiner-") and file.endswith(".onnx"):
                    joiner = os.path.join(self.model_dir, file)
        
        # Fallback/Check
        if not (encoder and decoder and joiner):
             # Try specific Multilingual names if auto-detect failed
             if not encoder: encoder = os.path.join(self.model_dir, "encoder-epoch-99-avg-1.int8.onnx")
             if not decoder: decoder = os.path.join(self.model_dir, "decoder-epoch-99-avg-1.int8.onnx")
             if not joiner: joiner = os.path.join(self.model_dir, "joiner-epoch-99-avg-1.int8.onnx")

        if encoder and os.path.exists(encoder) and os.path.exists(tokens):
            try:
                self.logger.bind(tag=TAG).info(f"Loading Sherpa Model: {encoder}")
                self.recognizer = sherpa_onnx.OfflineRecognizer.from_transducer(
                    encoder=encoder,
                    decoder=decoder,
                    joiner=joiner,
                    tokens=tokens,
                    num_threads=1,
                    provider="cpu",
                    model_type="zipformer",
                    debug=False
                )
                self.logger.bind(tag=TAG).info(f"Sherpa-ONNX ASR Initialized from {self.model_dir}")
                self.sample_rate = 16000
            except Exception as e:
                self.logger.bind(tag=TAG).error(f"Failed to initialize Sherpa-ONNX ASR: {e}")
        else:
             self.logger.bind(tag=TAG).error(f"Sherpa-ONNX model files not found in {self.model_dir}")

    async def speech_to_text(self, opus_data: List[bytes], session_id: str, audio_format="opus") -> Tuple[Optional[str], Optional[str]]:
        if not self.recognizer:
             return "", None

        try:
            # Decode Opus to PCM
            if audio_format == "pcm":
                pcm_data = opus_data
            else:
                pcm_data = self.decode_opus(opus_data)
            
            combined_pcm_data = b"".join(pcm_data)
            
            if len(combined_pcm_data) == 0:
                return "", None

            # Convert bytes to float32 array normalized to [-1, 1]
            # Assuming 16-bit PCM (s16le)
            samples = np.frombuffer(combined_pcm_data, dtype=np.int16).astype(np.float32) / 32768.0

            # Recognize
            stream = self.recognizer.create_stream()
            stream.accept_waveform(16000, samples)
            self.recognizer.decode_stream(stream)
            text = stream.result.text.strip()
            
            # Post-processing: Word correction for common ASR errors
            text = self._apply_word_correction(text)
            
            file_path = None
            if not self.delete_audio_file:
                file_path = self.save_audio_to_file(pcm_data, session_id)

            self.logger.bind(tag=TAG).info(f"Sherpa ASR Result: {text}")
            return text, file_path

        except Exception as e:
            self.logger.bind(tag=TAG).error(f"Sherpa ASR Error: {e}")
            return "", None
    
    def _apply_word_correction(self, text: str) -> str:
        """Apply word-level corrections for common ASR errors"""
        if not text:
            return text
        
        # Dictionary of common misrecognitions
        corrections = {
            "người khác": "người gác",
            "người gat": "người gác",
            "người gap": "người gác",
            "người gác": "người gác",  # Keep correct version
            "chỉ thị ba ba": "chỉ thị 33",
            "chỉ thị 3 3": "chỉ thị 33",
        }
        
        # Convert to lowercase for matching
        text_lower = text.lower()
        corrected = text_lower
        
        # Apply corrections (case-insensitive)
        for wrong, correct in corrections.items():
            corrected = corrected.replace(wrong.lower(), correct.lower())
        
        # Preserve original casing style
        if text.isupper():
            return corrected.upper()
        elif text.istitle():
            return corrected.title()
        else:
            return corrected

