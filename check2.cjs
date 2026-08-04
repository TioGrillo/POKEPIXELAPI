const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/POKECENTRO.har', 'utf8');
const data = JSON.parse(content);
for (const entry of data.log.entries) {
  if (entry.request.url.includes('/api/v1/creatures')) {
    console.log(entry.request.method, entry.request.url);
  }
}
