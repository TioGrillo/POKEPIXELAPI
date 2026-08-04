const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Get full snapshot with kills to see the summary structure
let found = 0;
for(const item of items) {
  if(item.includes('hunts/current/snapshot')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        if(parsed?.snapshot && parsed.snapshot !== null) {
          const snap = parsed.snapshot;
          if(snap.kills > 0 || snap.captures > 0 || snap.exp_gained > 0) {
            console.log('\nSNAPSHOT WITH DATA:', JSON.stringify(snap, null, 2).substring(0, 1000));
            found++;
            if(found >= 2) break;
          }
          // Check the top-level keys of snapshot
          if(found === 0) {
            console.log('\nSNAPSHOT TOP KEYS:', Object.keys(snap).join(', '));
            found++;
          }
        }
      } catch(e) {}
    }
  }
}
