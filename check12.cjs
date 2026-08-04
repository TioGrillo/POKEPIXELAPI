const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT.har', 'utf8');
const items = content.split('<item>');
for(const item of items) {
  if(item.includes('/api/v1/hunts/current')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1) {
         const json = dec.substring(jsonStart);
         console.log(json.substring(0, 300));
         break;
      }
    }
  }
}
