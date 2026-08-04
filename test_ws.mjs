import fs from 'fs';
const js = fs.readFileSync('WebSocketClient.js', 'utf8');

const lines = js.split('\n');
lines.forEach((l, i) => {
  if (l.includes('WebSocket')) console.log(i, l);
});
