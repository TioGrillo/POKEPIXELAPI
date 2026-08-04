const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/MAPEAMENTO POKEPIXEL.har', 'utf8');

const items = content.split('<item>');
for(const item of items) {
  if(item.includes('/api/v1/hunts/current/engage') || item.includes('/api/v1/hunts/current/capture')) {
      const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
      const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
      if (urlMatch && reqMatch) {
          const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
          const jsonStart = dec.indexOf('{');
          if (jsonStart !== -1) {
              console.log(urlMatch[1].split('/').pop() + ':', dec.substring(jsonStart).replace(/\s+/g, ' '));
          }
      }
  }
}
