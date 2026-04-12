import { WebSocket } from 'ws';

// 1. Create a Global Monitor (like the Dashboard)
const monitor = new WebSocket('ws://localhost:3000/ws');
monitor.on('open', () => {
  console.log('[Monitor] Connected');
  monitor.send(JSON.stringify({
    type: 'identify',
    channel_id: 0, // Global Monitor
    device_id: 999
  }));
});

monitor.on('message', (data, isBinary) => {
  if (isBinary) {
    console.log('[Monitor] Received binary audio packet!');
    process.exit(0); // Success!
  } else {
    console.log('[Monitor] Received JSON:', data.toString());
  }
});

// 2. Trigger a broadcast on Channel 6 (not Channel 1!)
setTimeout(() => {
  const trigger = new WebSocket('ws://localhost:3000/ws');
  trigger.on('open', () => {
    console.log('[Trigger] Connected');
    trigger.send(JSON.stringify({
      type: 'broadcast-start',
      channel_id: 6, // Targeted at Channel 6
      title: 'Channel 6 Test',
      file_url: 'http://localhost:3000/uploads/5b19ec88-b476-4b5f-adb9-52007e2e8778.mp3'
    }));
  });
}, 1000);

setTimeout(() => {
  console.error('Timed out waiting for binary audio');
  process.exit(1);
}, 10000);
