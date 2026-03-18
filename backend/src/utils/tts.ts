import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface TTSOptions {
  text: string;
  voice?: string;
  outputPath: string;
}

export async function generateTTS(options: TTSOptions): Promise<void> {
  const { text, voice = 'vi-VN-HoaiMyNeural', outputPath } = options;
  const scriptPath = path.join(__dirname, 'tts-generate.py');
  
  return new Promise((resolve, reject) => {
    // Calling python3 or python based on environment
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    const pythonProcess = spawn(pythonCmd, [scriptPath, text, voice, outputPath]);
    
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      console.log(`TTS stdout: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`TTS stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`TTS generation failed with code ${code}: ${errorOutput}`));
      }
    });
  });
}
