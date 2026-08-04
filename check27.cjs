const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Get full engage response for cubone - see instance_key and what exactly changed
for(const item of items) {
  if(item.includes('hunts/current/engage') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        console.log('ENGAGE RESPONSE FULL:', JSON.stringify(parsed, null, 2));
      } catch(e) {
        console.log('ENGAGE RAW BODY:', body?.substring(0, 600));
      }
      break;
    }
  }
}

// Get the snapshot response after engages
for(const item of items) {
  if(item.includes('hunts/current/snapshot')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        if(parsed?.snapshot !== null) {
          console.log('\nNON-NULL SNAPSHOT:', JSON.stringify(parsed, null, 2).substring(0, 1200));
        }
      } catch(e) {}
    }
  }
}
