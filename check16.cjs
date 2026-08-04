const fs = require('fs');
const files = ['C:/Users/Damiao/Desktop/MAPEAMENTO POKEPIXEL.har', 'C:/Users/Damiao/Desktop/NEWHUNT.har', 'C:/Users/Damiao/Desktop/NEWHUNT2.har'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const items = content.split('<item>');
  for(const item of items) {
    if(item.includes('/api/v1/hunts/current/capture')) {
        const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
        if (reqMatch) {
            const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
            const jsonStart = dec.indexOf('{');
            if(jsonStart !== -1) {
                console.log(`Payload for capture in ${file}:`);
                console.log(dec.substring(jsonStart).replace(/\s+/g, ' '));
            }
        }
    }
  }
}
