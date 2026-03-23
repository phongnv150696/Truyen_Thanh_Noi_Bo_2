"""
Test Edge Impulse Wake Word Model trên PC
Sử dụng microphone để test real-time
"""

import numpy as np
import wave
import struct
import os

# Kiểm tra xem có thể import pyaudio không
try:
    import pyaudio
    HAS_PYAUDIO = True
except ImportError:
    HAS_PYAUDIO = False
    print("⚠️ PyAudio chưa được cài đặt. Chạy: pip install pyaudio")

# Cố gắng import tflite
try:
    import tflite_runtime.interpreter as tflite
    HAS_TFLITE = True
except ImportError:
    try:
        import tensorflow.lite as tflite
        HAS_TFLITE = True
    except ImportError:
        HAS_TFLITE = False
        print("⚠️ TFLite chưa được cài đặt. Chạy: pip install tflite-runtime")


class WakeWordTester:
    """Test wake word model từ Edge Impulse"""
    
    def __init__(self, model_path=None):
        """
        Khởi tạo tester
        
        Args:
            model_path: Đường dẫn đến file .tflite (nếu có)
        """
        self.sample_rate = 16000
        self.duration = 1.0  # 1 giây
        self.samples = int(self.sample_rate * self.duration)
        
        # Labels từ model
        self.labels = ["noise", "wake_word"]  # Thay đổi theo model của bạn
        
        self.model_path = model_path
        self.interpreter = None
        
        if model_path and HAS_TFLITE and os.path.exists(model_path):
            self._load_model(model_path)
    
    def _load_model(self, model_path):
        """Load TFLite model"""
        try:
            self.interpreter = tflite.Interpreter(model_path=model_path)
            self.interpreter.allocate_tensors()
            
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            
            print(f"✅ Model loaded: {model_path}")
            print(f"   Input shape: {self.input_details[0]['shape']}")
            print(f"   Output shape: {self.output_details[0]['shape']}")
            
        except Exception as e:
            print(f"❌ Lỗi load model: {e}")
            self.interpreter = None
    
    def record_audio(self, duration=1.0):
        """
        Ghi âm từ microphone
        
        Returns:
            numpy array của audio samples
        """
        if not HAS_PYAUDIO:
            print("❌ Cần cài PyAudio để ghi âm")
            return None
        
        p = pyaudio.PyAudio()
        
        print(f"\n🎤 Đang ghi âm {duration}s... Nói wake word!")
        
        stream = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=self.sample_rate,
            input=True,
            frames_per_buffer=1024
        )
        
        frames = []
        for _ in range(int(self.sample_rate / 1024 * duration)):
            data = stream.read(1024, exception_on_overflow=False)
            frames.append(data)
        
        stream.stop_stream()
        stream.close()
        p.terminate()
        
        # Convert to numpy
        audio_data = b''.join(frames)
        samples = np.frombuffer(audio_data, dtype=np.int16)
        
        # Normalize to float32 [-1, 1]
        samples = samples.astype(np.float32) / 32768.0
        
        print(f"✅ Đã ghi {len(samples)} samples")
        
        return samples
    
    def extract_mfcc_features(self, audio):
        """
        Trích xuất MFCC features (đơn giản hóa)
        Để test chính xác cần dùng cùng cấu hình với Edge Impulse
        """
        try:
            import scipy.fftpack
            from scipy.signal import get_window
            
            # Cấu hình MFCC (từ Edge Impulse)
            frame_length = 0.02  # 20ms
            frame_stride = 0.01  # 10ms
            num_filters = 40
            num_cepstral = 13
            fft_length = 256
            
            frame_size = int(frame_length * self.sample_rate)
            frame_step = int(frame_stride * self.sample_rate)
            
            # Số frames
            num_frames = 1 + (len(audio) - frame_size) // frame_step
            
            # Tạo frames
            frames = np.zeros((num_frames, frame_size))
            for i in range(num_frames):
                start = i * frame_step
                frames[i] = audio[start:start + frame_size]
            
            # Windowing
            frames *= get_window('hamming', frame_size)
            
            # FFT
            mag_frames = np.absolute(np.fft.rfft(frames, fft_length))
            pow_frames = (1.0 / fft_length) * (mag_frames ** 2)
            
            # Đơn giản: Lấy log power spectrum thay vì full MFCC
            features = np.log(pow_frames + 1e-10)
            
            # Flatten
            features = features.flatten()
            
            return features
            
        except ImportError:
            print("⚠️ Cần scipy để extract features: pip install scipy")
            return audio  # Trả về raw audio
    
    def predict(self, audio):
        """
        Chạy inference trên audio
        
        Args:
            audio: numpy array của audio samples
            
        Returns:
            dict với predictions cho mỗi label
        """
        if self.interpreter is None:
            print("❌ Model chưa được load")
            return None
        
        # Resize/pad audio to expected size
        if len(audio) < self.samples:
            audio = np.pad(audio, (0, self.samples - len(audio)))
        else:
            audio = audio[:self.samples]
        
        # Prepare input
        input_shape = self.input_details[0]['shape']
        input_dtype = self.input_details[0]['dtype']
        
        # Reshape input
        input_data = audio.reshape(input_shape).astype(input_dtype)
        
        # Quantize if needed
        if input_dtype == np.int8:
            scale = self.input_details[0]['quantization'][0]
            zero_point = self.input_details[0]['quantization'][1]
            input_data = (audio / scale + zero_point).astype(np.int8)
            input_data = input_data.reshape(input_shape)
        
        # Run inference
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()
        
        # Get output
        output_data = self.interpreter.get_tensor(self.output_details[0]['index'])
        
        # Dequantize if needed
        if self.output_details[0]['dtype'] == np.int8:
            scale = self.output_details[0]['quantization'][0]
            zero_point = self.output_details[0]['quantization'][1]
            output_data = (output_data.astype(np.float32) - zero_point) * scale
        
        # Convert to probabilities
        predictions = {}
        for i, label in enumerate(self.labels):
            if i < len(output_data[0]):
                predictions[label] = float(output_data[0][i])
        
        return predictions
    
    def test_from_file(self, wav_path):
        """
        Test với file WAV
        
        Args:
            wav_path: Đường dẫn đến file WAV
        """
        print(f"\n📂 Loading: {wav_path}")
        
        try:
            with wave.open(wav_path, 'rb') as wf:
                # Kiểm tra format
                assert wf.getnchannels() == 1, "Cần file mono"
                assert wf.getframerate() == self.sample_rate, f"Cần sample rate {self.sample_rate}"
                
                # Đọc samples
                n_frames = wf.getnframes()
                audio_bytes = wf.readframes(n_frames)
                
                # Convert to numpy
                samples = np.frombuffer(audio_bytes, dtype=np.int16)
                samples = samples.astype(np.float32) / 32768.0
                
                print(f"✅ Loaded {len(samples)} samples")
                
                # Predict
                predictions = self.predict(samples)
                
                if predictions:
                    print("\n📊 Kết quả:")
                    for label, score in predictions.items():
                        bar = "█" * int(score * 20)
                        print(f"   {label}: {score:.2%} {bar}")
                    
                    # Kiểm tra wake word
                    if predictions.get('wake_word', 0) > 0.6:
                        print("\n🎉 WAKE WORD DETECTED!")
                    else:
                        print("\n❌ Không phát hiện wake word")
                
        except Exception as e:
            print(f"❌ Lỗi: {e}")
    
    def test_realtime(self, threshold=0.6, max_tests=10):
        """
        Test real-time với microphone
        
        Args:
            threshold: Ngưỡng để phát hiện wake word
            max_tests: Số lần test tối đa
        """
        print("\n" + "="*50)
        print("🎤 TEST REAL-TIME WAKE WORD")
        print("="*50)
        print(f"Threshold: {threshold}")
        print(f"Số lần test: {max_tests}")
        print("\nNhấn Ctrl+C để dừng\n")
        
        detected_count = 0
        
        try:
            for i in range(max_tests):
                print(f"\n--- Test {i+1}/{max_tests} ---")
                
                # Ghi âm
                audio = self.record_audio(self.duration)
                
                if audio is None:
                    continue
                
                # Predict
                predictions = self.predict(audio)
                
                if predictions:
                    for label, score in predictions.items():
                        bar = "█" * int(score * 20)
                        print(f"   {label}: {score:.2%} {bar}")
                    
                    if predictions.get('wake_word', 0) > threshold:
                        print("🎉 WAKE WORD DETECTED!")
                        detected_count += 1
                
                print()
                
        except KeyboardInterrupt:
            print("\n\n⏹️ Đã dừng test")
        
        print(f"\n📊 Tổng kết: Phát hiện {detected_count}/{max_tests} lần")


def main():
    """Main function"""
    print("="*50)
    print("🧪 EDGE IMPULSE WAKE WORD TESTER")
    print("="*50)
    
    # Tìm file .tflite trong project
    model_path = None
    project_dir = "project-1"
    
    # Tìm trong thư mục tflite-model
    tflite_dir = os.path.join(project_dir, "tflite-model")
    if os.path.exists(tflite_dir):
        for f in os.listdir(tflite_dir):
            if f.endswith('.tflite'):
                model_path = os.path.join(tflite_dir, f)
                print(f"✅ Tìm thấy model: {model_path}")
                break
    
    # Nếu không tìm thấy, thử tìm ở thư mục hiện tại
    if not model_path:
        for f in os.listdir('.'):
            if f.endswith('.tflite'):
                model_path = f
                print(f"✅ Tìm thấy model: {model_path}")
                break
    
    if not model_path:
        print("\n❌ Không tìm thấy file .tflite")
        print("Hãy đảm bảo file .tflite nằm trong thư mục project-1/tflite-model/")
        return
    
    # Khởi tạo tester
    tester = WakeWordTester(model_path)
    
    # Menu
    while True:
        print("\n" + "-"*30)
        print("MENU:")
        print("1. Test với microphone (real-time)")
        print("2. Test với file WAV")
        print("3. Thoát")
        print("-"*30)
        
        choice = input("Chọn (1-3): ").strip()
        
        if choice == "1":
            tester.test_realtime(threshold=0.6, max_tests=10)
        elif choice == "2":
            wav_path = input("Nhập đường dẫn file WAV: ").strip()
            if os.path.exists(wav_path):
                tester.test_from_file(wav_path)
            else:
                print(f"❌ Không tìm thấy file: {wav_path}")
        elif choice == "3":
            print("👋 Tạm biệt!")
            break
        else:
            print("❌ Lựa chọn không hợp lệ")


if __name__ == "__main__":
    main()
