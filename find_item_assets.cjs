const fs = require('fs');
const content = fs.readFileSync('pokepixel_api_map.txt', 'utf8');

const lines = content.split('\n');
console.log('=== SEARCH ITEM ASSETS / ICONS ===');

lines.forEach((line, idx) => {
  if (line.match(/icon|item|sprite|assets/i) && line.match(/\.(png|jpg|webp|gif)/i)) {
    console.log(`Line ${idx+1}: ${line.trim().slice(0, 120)}`);
  }
});
