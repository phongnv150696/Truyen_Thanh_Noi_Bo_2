/**
 * Central configuration for API connection.
 * Automatically detects if running in a GitHub Codespace or other environments.
 */

const getApiUrl = () => {
    const hostname = window.location.hostname;
    
    // 1. Handle GitHub Codespaces
    if (hostname.includes('.github.dev') || hostname.includes('.app.github.dev')) {
        // Regex to find the port part (e.g., -5173 or -80) and replace with -3000
        const backendHostname = hostname.replace(/-\d+\./, '-3000.');
        return `https://${backendHostname}`;
    }
    
    // 2. Default to port 3000 on the current hostname (Localhost or VPS IP)
    return `http://${hostname}:3000`;
};

export const API_URL = getApiUrl();
export const WEBSOCKET_URL = (() => {
    const { hostname, protocol } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Check if we are in GitHub Codespaces
    if (hostname.includes('.github.dev') || hostname.includes('.app.github.dev')) {
        // Codespaces uses subdomains for ports: <name>-80.<region>.github.dev
        // We need to change the port part to -3000 for the backend
        const backendHostname = hostname.replace(/-\d+\./, '-3000.');
        return `${wsProtocol}//${backendHostname}/ws`;
    }
    
    // Default/Local/VPS behavior (same host, port 3000)
    return `${wsProtocol}//${hostname}:3000/ws`;
})();
export const API_BASE_URL = API_URL; // Alias for compatibility
