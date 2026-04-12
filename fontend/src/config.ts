/**
 * Central configuration for API connection.
 * Automatically detects if running in a GitHub Codespace or other environments.
 */

const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // 1. Handle GitHub Codespaces
    if (hostname.includes('.github.dev') || hostname.includes('.app.github.dev')) {
        // If the hostname already has a port part (e.g., -5173.), replace it
        if (/-\d+\./.test(hostname)) {
            const backendHostname = hostname.replace(/-\d+\./, '-3000.');
            return `https://${backendHostname}`;
        }
        // If it doesn't have a port part, it's likely port 80/443, so we append -3000 to the first part
        const parts = hostname.split('.');
        parts[0] = parts[0] + '-3000';
        return `https://${parts.join('.')}`;
    }
    
    // 2. Default to port 3000 on the current hostname (Localhost or VPS IP)
    return `http://${hostname}:3000`;
};

export const API_URL = getApiUrl();
console.log('📡 Detected API_URL:', API_URL);

export const WEBSOCKET_URL = (() => {
    const { hostname, protocol } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    
    if (hostname.includes('.github.dev') || hostname.includes('.app.github.dev')) {
        let backendHostname = hostname;
        if (/-\d+\./.test(hostname)) {
            backendHostname = hostname.replace(/-\d+\./, '-3000.');
        } else {
            const parts = hostname.split('.');
            parts[0] = parts[0] + '-3000';
            backendHostname = parts.join('.');
        }
        return `${wsProtocol}//${backendHostname}/ws`;
    }
    
    return `${wsProtocol}//${hostname}:3000/ws`;
})();
export const API_BASE_URL = API_URL; // Alias for compatibility
