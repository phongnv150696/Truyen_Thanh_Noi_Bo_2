import axios from 'axios';

async function testTTS() {
  console.log('--- Testing TTS Generation ---');
  try {
    const response = await axios.post('http://localhost:3000/media/tts', {
      text: 'Chào mừng bạn đến với hệ thống truyền thanh nội bộ thông minh OpenClaw.',
      voice: 'vi-VN-NamMinhNeural', // Trying a male voice
      file_name: 'Welcome_OpenClaw.mp3'
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 201) {
      console.log('SUCCESS: TTS generated and saved to media library.');
    }
  } catch (err: any) {
    console.error('TTS Test Failed:', err.response?.data || err.message);
  }
}

testTTS();
