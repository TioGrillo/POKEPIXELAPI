const fs = require('fs');
const files = ['C:/Users/Damiao/Desktop/MAPEAMENTO POKEPIXEL.har', 'C:/Users/Damiao/Desktop/NEWHUNT.har', 'C:/Users/Damiao/Desktop/NEWHUNT2.har'];

const urls = new Set();
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const items = content.split('<item>');
  for(const item of items) {
    if(item.includes('POST') && item.includes('api/v1/')) {
        const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
        if (urlMatch) {
            urls.add(urlMatch[1]);
        }
    }
  }
}
console.log(Array.from(urls).join('\n'));
