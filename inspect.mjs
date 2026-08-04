import fs from 'fs';

const js = fs.readFileSync('pokepixel_main.js', 'utf8');
console.log('File size:', js.length);

const pieces = js.split(/['"`]/);
const apis = pieces.filter(p => p.includes('api/v1') || p.includes('wss://') || p.includes('/api/'));
console.log('Found:', apis.filter((v, i, a) => a.indexOf(v) === i));

const wss = pieces.filter(p => p.includes('ws://') || p.includes('wss://') || p.includes('WebSocket'));
console.log('WS Found:', wss.filter((v, i, a) => a.indexOf(v) === i));
