const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/POKECENTRO.har', 'utf8');
const regex = /<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/g;
let match;
let count = 0;
while ((match = regex.exec(content)) !== null) {
  const dec = Buffer.from(match[1], 'base64').toString('utf8');
  if (dec.includes('"data":') && dec.includes('ivs')) {
    const jsonMatch = dec.match(/\{"data":\[.*?\]\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.data && parsed.data.length > 0) {
           const storages = parsed.data.filter(p => p.location === 'storage');
           if (storages.length > 0) {
             console.log('Found storage! count:', storages.length);
             count++;
           }
        }
      } catch (e) {}
    }
  }
}
if(count===0) console.log("No storage found");
