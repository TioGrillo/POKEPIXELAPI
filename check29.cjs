const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Find snapshots with kill_count > 0 to see stats 
for(const item of items) {
  if(item.includes('hunts/current/snapshot')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        const snap = parsed?.snapshot;
        if(snap && snap.kill_count > 0) {
          console.log('SNAPSHOT WITH KILLS:', JSON.stringify(snap, null, 2).substring(0, 2000));
          break;
        }
      } catch(e) {}
    }
  }
}

// Check if there's a separate /api/v1/trainer or /api/v1/hunts/summary endpoint
for(const item of items) {
  if(item.includes('/api/v1/trainer') && !item.includes('team')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        console.log('\nTRAINER KEYS:', Object.keys(parsed).join(', '));
        if(parsed.kills !== undefined || parsed.total_kills !== undefined) {
          console.log('TRAINER DATA (kills related):', JSON.stringify({
            kills: parsed.kills, total_kills: parsed.total_kills, 
            exp: parsed.exp, total_exp: parsed.total_exp,
            captures: parsed.captures, total_captures: parsed.total_captures
          }));
        }
      } catch(e) {}
      break;
    }
  }
}
