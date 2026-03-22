import WebSocket from 'ws';

const url = 'ws://127.0.0.1:3000/ws';
console.log('Testing WebSocket connection to:', url);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('✅ SUCCESS: WebSocket connected!');
  ws.close();
});

ws.on('message', (data) => {
  console.log('📨 Message received:', data.toString());
});

ws.on('error', (err) => {
  console.error('❌ ERROR:', err.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: code=${code} reason=${reason.toString()}`);
});

setTimeout(() => {
  console.log('⏰ Timeout - no connection established');
  process.exit(1);
}, 5000);
