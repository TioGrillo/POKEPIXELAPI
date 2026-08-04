const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Check the new wild-monsters API
for(const item of items) {
  if(item.includes('wild-monsters') && item.includes('cubone')) {
    const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('[');
      if(jsonStart !== -1) {
        try {
          const parsed = JSON.parse(dec.substring(jsonStart));
          if(parsed.length > 0) {
            console.log('URL:', urlMatch?.[1]);
            console.log('First monster:', JSON.stringify(parsed[0], null, 2));
            break;
          }
        } catch(e) {}
      }
    }
  }
}

// Check prepare payload
for(const item of items) {
  if(item.includes('/api/v1/hunts/prepare') && item.includes('POST')) {
    const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(reqMatch) {
      const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1) console.log('\nPREPARE PAYLOAD:', dec.substring(jsonStart).replace(/\s+/g, ' '));
    }
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1) console.log('PREPARE RESPONSE:', dec.substring(jsonStart, jsonStart + 400).replace(/\s+/g, ' '));
    }
    break;
  }
}

// Check engage payload
for(const item of items) {
  if(item.includes('hunts/current/engage') && item.includes('cubone')) {
    const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(reqMatch) {
      const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1) console.log('\nENGAGE PAYLOAD:', dec.substring(jsonStart));
    }
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1) console.log('ENGAGE RESPONSE:', dec.substring(jsonStart, jsonStart + 300).replace(/\s+/g, ' '));
    }
    break;
  }
}
