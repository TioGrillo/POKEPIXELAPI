const fs = require('fs');
const files = ['NEWHUNT.har', 'NEWHUNT2.har', 'NEWHUNT3.har', 'MAPEAMENTO POKEPIXEL.har'];
const urls = new Set();
for (const file of files) {
  try {
    const content = fs.readFileSync(`C:/Users/Damiao/Desktop/${file}`, 'utf8');
    const matches = content.match(/https:\/\/[a-zA-Z0-9\.\/-_]+(?:\.png|\.webp|\.jpg)[a-zA-Z0-9\.\/-_\?]*/g) || [];
    for (const match of matches) {
      if (match.includes('item') || match.includes('loot') || match.includes('icon') || match.includes('asset')) {
        urls.add(match);
      }
    }
  } catch (e) {}
}
console.log(Array.from(urls).join('\n'));
