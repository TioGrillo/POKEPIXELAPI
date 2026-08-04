const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Find the actual engage response body
for(const item of items) {
  if(item.includes('hunts/current/engage') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1] || parts[0];
      console.log('ENGAGE RESPONSE BODY:', body.substring(0, 800));
      break;
    }
  }
}

// Get the full wild-monsters response for cubone and see the new fields
for(const item of items) {
  if(item.includes('wild-monsters') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1] || parts[0];
      try {
        const parsed = JSON.parse(body);
        const data = parsed.data || parsed;
        if(data.length > 0) {
          console.log('\nWILD-MONSTERS NEW STRUCTURE:');
          console.log('Top-level keys:', Object.keys(parsed).join(', '));
          console.log('Monster fields:', Object.keys(data[0]).join(', '));
          console.log('Monster .id:', data[0].id);
          console.log('Monster .event_id:', data[0].event_id);
          console.log('Monster .hp:', data[0].hp);
        }
      } catch(e) { console.log('err:', e.message); }
      break;
    }
  }
}

// Check current hunt status GET endpoint
for(const item of items) {
  if(item.includes('/api/v1/hunts/current') && !item.includes('engage') && !item.includes('stop') && !item.includes('capture')) {
    const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch && urlMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const parts = dec.split('\r\n\r\n');
      const body = parts[parts.length - 1] || parts[0];
      try {
        const parsed = JSON.parse(body);
        console.log('\nHUNT/CURRENT URL:', urlMatch[1]);
        console.log('Top-level keys:', Object.keys(parsed).join(', '));
        if(parsed.snapshot) console.log('snapshot keys:', Object.keys(parsed.snapshot).join(', '));
        if(parsed.data) console.log('data keys:', Object.keys(parsed.data).join(', '));
      } catch(e) {}
      break;
    }
  }
}
