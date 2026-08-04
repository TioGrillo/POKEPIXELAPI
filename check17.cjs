const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/MAPEAMENTO POKEPIXEL.har', 'utf8');

const items = content.split('<item>');
for(const item of items) {
  if(item.includes('/api/v1/hunts/current/engage') || item.includes('/api/v1/hunts/current/capture')) {
      const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
      if (urlMatch) {
          console.log('Request to:', urlMatch[1]);
      }
  }
}
