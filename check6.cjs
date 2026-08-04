const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT.har', 'utf8');
const items = content.split('<item>');
for(const item of items) {
  if(item.includes('/api/v1/hunts/prepare')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      console.log('Response for prepare:');
      console.log(Buffer.from(resMatch[1], 'base64').toString('utf8'));
    }
  }
}
