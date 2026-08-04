const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/POKECENTRO.har', 'utf8');
const urls = new Set();
const regexJson = /"url"\s*:\s*"(https:\/\/[^"]+\/api\/v1\/creatures[^"]*)"/g;
let match;
while ((match = regexJson.exec(content)) !== null) {
  urls.add(match[1]);
}
console.log(Array.from(urls).join('\n'));
