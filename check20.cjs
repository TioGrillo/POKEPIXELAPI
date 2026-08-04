const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
if (!fs.existsSync(file)) { console.log('NEWHUNT4.har not found'); process.exit(1); }

const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');
const seenUrls = new Set();
for(const item of items) {
  if(!item.includes('api/v1')) continue;
  const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
  if(urlMatch) seenUrls.add(urlMatch[1]);
}
console.log([...seenUrls].join('\n'));
