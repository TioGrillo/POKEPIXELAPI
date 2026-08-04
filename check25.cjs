const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Full current snapshot response
for(const item of items) {
  if(item.includes('/api/v1/hunts/current/snapshot')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1];
      try {
        const parsed = JSON.parse(body);
        console.log('SNAPSHOT FULL:', JSON.stringify(parsed, null, 2).substring(0, 1500));
      } catch(e) { console.log(body.substring(0, 500)); }
      break;
    }
  }
}

// Check engage response HTTP status code
for(const item of items) {
  if(item.includes('hunts/current/engage') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      // HTTP/2 status is in the first line
      const firstLine = dec.split('\r\n')[0];
      const bodyParts = dec.split('\r\n\r\n');
      const body = bodyParts[bodyParts.length - 1];
      console.log('\nENGAGE STATUS LINE:', firstLine);
      console.log('ENGAGE BODY:', body.substring(0, 400));
      break;
    }
  }
}

// Check the engage request specifically for the cubone zone and new format
for(const item of items) {
  if(item.includes('hunts/current/engage') && item.includes('cubone')) {
    const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
    if(reqMatch) {
      const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
      const bodyParts = dec.split('\r\n\r\n');
      const body = bodyParts[bodyParts.length - 1];
      console.log('\nENGAGE REQUEST BODY:', body);
      break;
    }
  }
}
