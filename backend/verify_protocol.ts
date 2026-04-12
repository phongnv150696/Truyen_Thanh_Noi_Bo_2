import { WebSocket } from 'ws';

// 1. Simulator for a Hardware Speaker (Not a browser)
const speaker = new WebSocket('ws://localhost:3000/ws');
speaker.on('open', () => {
  console.log('[Speaker] Connected');
  speaker.send(JSON.stringify({
    type: 'identify',
    channel_id: 1,
    device_id: 123
    // protocol should be set to xiaozhi-v3 by default now!
  }));
});

speaker.on('message', (data, isBinary) => {
  if (isBinary) {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as any);
    const header = buffer.slice(0, 4);
    if (header[0] === 0x01 && header[1] === 0x00) {
      console.log('[Speaker] ✅ Received valid XiaoZhi-V3 packet with header!');
      process.exit(0);
    } else {
      console.error('[Speaker] ❌ Received binary but MISSING XiaoZhi header!');
      process.exit(1);
    }
  }
});

// 2. Trigger
setTimeout(() => {
  const trigger = new WebSocket('ws://localhost:3000/ws');
  trigger.on('open', () => {
    trigger.send(JSON.stringify({
      type: 'broadcast-start',
      channel_id: 1,
      title: 'Protocol Test',
      file_url: 'http://localhost:3000/uploads/5b19ec88-b476-4b5f-adb9-52007e2e8778.mp3'
    }));
  });
}, 1000);

setTimeout(() => {
  console.error('Timed out');
  process.exit(1);
}, 10000);
