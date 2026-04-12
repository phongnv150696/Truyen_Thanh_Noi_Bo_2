import { generateTTS } from './src/utils/tts';

generateTTS({ text: 'Xin chào', voice: 'gemini-Aoede', outputPath: 'tts_test_frontend_node.mp3' })
  .then(() => {
    console.log('TTS SUCCESS');
    process.exit(0);
  })
  .catch((e) => {
    console.error('TTS FAILED', e);
    process.exit(1);
  });
