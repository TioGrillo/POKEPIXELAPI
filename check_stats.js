const fs = require('fs');
const lines = fs.readFileSync('src/bot/engine.ts', 'utf8').split('\n');
const start = lines.findIndex(l => l.includes('stats() {'));
if(start !== -1) {
  for(let i = start; i < start + 25; i++) {
     console.log((i+1) + ': ' + lines[i]);
  }
}
