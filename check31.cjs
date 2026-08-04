const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT5.har';
if (!fs.existsSync(file)) { console.log('NOT FOUND'); process.exit(1); }
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// 1. List all unique API URLs
const urls = new Set();
for(const item of items) {
  if(!item.includes('api/v1')) continue;
  const u = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
  if(u) urls.add(u[1]);
}
console.log('=== ALL URLS ===');
[...urls].forEach(u => console.log(u));

// 2. Find wild-monsters calls and print first one with data
console.log('\n=== WILD-MONSTERS ANALYSIS ===');
for(const item of items) {
  if(!item.includes('wild-monsters')) continue;
  const u = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
  const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
  if(u && res) {
    const dec = Buffer.from(res[1], 'base64').toString('utf8');
    const body = dec.split('\r\n\r\n').pop();
    try {
      const parsed = JSON.parse(body);
      const data = parsed.data || [];
      if(data.length > 0) {
        const url = new URL(u[1]);
        console.log('events param (first):', url.searchParams.get('events')?.split(',')[0]);
        console.log('map_id:', url.searchParams.get('map_id'));
        console.log('zone_id:', url.searchParams.get('zone_id'));
        console.log('level:', url.searchParams.get('level'));
        console.log('monster.id:', data[0].id);
        console.log('monster.event_id:', data[0].event_id);
        console.log('monster.hp:', data[0].hp);
        break;
      }
    } catch(e) {}
  }
}

// 3. Engage request/response
console.log('\n=== ENGAGE ANALYSIS (first) ===');
for(const item of items) {
  if(!item.includes('hunts/current/engage')) continue;
  const req = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
  const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
  if(req && res) {
    const reqBody = Buffer.from(req[1], 'base64').toString('utf8').split('\r\n\r\n').pop();
    const resBody = Buffer.from(res[1], 'base64').toString('utf8').split('\r\n\r\n').pop();
    console.log('REQ:', reqBody);
    try { const p = JSON.parse(resBody); console.log('RES keys:', Object.keys(p).join(', ')); console.log('RES:', JSON.stringify(p).substring(0, 300)); } catch(e) { console.log('RES:', resBody.substring(0,200)); }
    break;
  }
}

// 4. Snapshot
console.log('\n=== SNAPSHOT WITH DATA ===');
for(const item of items) {
  if(!item.includes('hunts/current/snapshot')) continue;
  const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
  if(res) {
    const dec = Buffer.from(res[1], 'base64').toString('utf8');
    const body = dec.split('\r\n\r\n').pop();
    try {
      const p = JSON.parse(body);
      if(p?.snapshot && p.snapshot !== null && p.snapshot.kill_count > 0) {
        console.log('kill_count:', p.snapshot.kill_count);
        console.log('snapshot keys:', Object.keys(p.snapshot).join(', '));
        break;
      }
    } catch(e) {}
  }
}
