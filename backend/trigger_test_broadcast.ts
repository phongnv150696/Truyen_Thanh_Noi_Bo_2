import { WebSocket } from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('Connected to server');
  
  // 1. Identify
  ws.send(JSON.stringify({
    type: 'identify',
    channel_id: 1,
    device_id: 888,
    device_name: 'Test Device'
  }));

  setTimeout(() => {
    // 2. Trigger broadcast
    ws.send(JSON.stringify({
      type: 'broadcast-start',
      channel_id: 1,
      title: 'Test Call From CLI',
      file_url: 'http://localhost:3000/uploads/test.mp3'
    }));
    
    setTimeout(() => ws.close(), 2000);
  }, 1000);
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});
