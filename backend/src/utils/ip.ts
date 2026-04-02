import os from 'os';

/**
 * Gets the local IP address of the server in the network.
 * This is used to provide reachable URLs for ESP32 devices.
 */
export function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  let fallbackIp = '127.0.0.1';
  
  // Preferred range for this specific user's environment
  const preferredSubnet = '192.168.100.';

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // If we find our preferred subnet, return immediately
        if (iface.address.startsWith(preferredSubnet)) {
          return iface.address;
        }
        // Otherwise keep the first valid non-internal IPv4 as fallback
        if (fallbackIp === '127.0.0.1') {
          fallbackIp = iface.address;
        }
      }
    }
  }
  return fallbackIp;
}
