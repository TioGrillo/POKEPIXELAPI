const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT.har', 'utf8');
const regex = /<url><!\[CDATA\[(.*?)\]\]><\/url>/g;
let match;
const urls = new Set();
while ((match = regex.exec(content)) !== null) {
  if (match[1].includes('/api/v1/')) {
    urls.add(match[1]);
  }
}
const regexJson = /"url"\s*:\s*"(https:\/\/[^"]+\/api\/v1\/[^"]+)"/g;
while ((match = regexJson.exec(content)) !== null) {
  urls.add(match[1]);
}
console.log(Array.from(urls).join('\n'));
