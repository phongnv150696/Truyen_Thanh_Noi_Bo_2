import { getLocalIP } from './network.js';

/**
 * Transforms a relative path (e.g. /uploads/file.mp3) into a full absolute URL
 * based on the server's current LAN IP and port.
 */
export function getFullURL(relativePath: string): string {
  if (!relativePath) return '';
  
  // If already absolute, return as is
  if (relativePath.startsWith('http')) return relativePath;
  
  const ip = getLocalIP();
  const port = process.env.PORT || 3000;
  
  // Ensure relative path starts with /
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  return `http://${ip}:${port}${path}`;
}
