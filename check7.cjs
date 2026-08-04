const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT.har', 'utf8');
const items = content.split('<item>');
for(const item of items) {
  if(item.includes('/api/v1/wild-monsters?zone_id=')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      console.log('Response for wild-monsters:');
      console.log(Buffer.from(resMatch[1], 'base64').toString('utf8').substring(0, 500));
    }
  }
}
