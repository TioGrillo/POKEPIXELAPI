const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT.har', 'utf8');
const items = content.split('<item>');
for(const item of items) {
  if(item.includes('/api/v1/wild-monsters?zone_id=')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{"data":');
      if (jsonStart !== -1) {
          console.log('JSON from wild-monsters:');
          console.log(dec.substring(jsonStart, jsonStart + 500));
      } else {
          console.log('No JSON found in response');
      }
    }
  }
}
