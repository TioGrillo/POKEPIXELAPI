const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT.har', 'utf8');
const regexJson = /"url"\s*:\s*"(https:\/\/[^"]+\/api\/v1\/hunts[^"]*)"/g;
const urls = new Set();
let match;
while ((match = regexJson.exec(content)) !== null) {
  urls.add(match[1]);
}
console.log(Array.from(urls).join('\n'));
