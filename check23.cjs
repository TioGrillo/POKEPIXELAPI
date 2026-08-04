const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Find the actual engage response body (not CF-NEL headers)
for(const item of items) {
  if(item.includes('hunts/current/engage') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      // Find JSON after all the headers
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1] || parts[0];
      console.log('ENGAGE BODY (first 600 chars):', body.substring(0, 600));
      break;
    }
  }
}

// Find wild-monsters response body (separate header from body)
for(const item of items) {
  if(item.includes('wild-monsters') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1] || parts[0];
      console.log('\nWILD-MONSTERS BODY (first 600 chars):', body.substring(0, 600));
      break;
    }
  }
}

// Find /api/v1/hunts GET response
for(const item of items) {
  if(item.includes('/api/v1/hunts') && !item.includes('current') && !item.includes('prepare') && !item.includes('fishing') && !item.includes('disconnect')) {
    const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch && urlMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1] || parts[0];
      console.log('\n/api/v1/hunts URL:', urlMatch[1]);
      console.log('/api/v1/hunts BODY:', body.substring(0, 600));
      break;
    }
  }
}
