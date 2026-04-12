import * as mm from 'music-metadata';
import fs from 'fs';
import path from 'path';

export interface AudioMetadata {
  duration: number; // seconds
  size: number; // bytes
  size_formatted: string;
}

export async function getAudioMetadata(filePath: string): Promise<AudioMetadata | null> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.warn(`[AudioMeta] File not found: ${filePath}`);
      return null;
    }

    const stats = fs.statSync(filePath);
    const size = stats.size;
    
    // Format size
    let size_formatted = '';
    if (size < 1024 * 1024) {
      size_formatted = (size / 1024).toFixed(2) + ' KB';
    } else {
      size_formatted = (size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    // Get duration
    const metadata = await mm.parseFile(filePath);
    const duration = metadata.format.duration || 0;

    return {
      duration,
      size,
      size_formatted
    };
  } catch (error) {
    console.error(`[AudioMeta] Error parsing metadata for ${filePath}:`, error);
    return null;
  }
}
