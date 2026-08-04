const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Check ALL engage payloads & their responses for cubone zone
let count = 0;
for(const item of items) {
  if(item.includes('hunts/current/engage')) {
    const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(reqMatch) {
      const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1 && dec.includes('cubone')) {
        const reqBody = dec.substring(jsonStart);
        let resBody = 'no response';
        if(resMatch) {
          const resDec = Buffer.from(resMatch[1], 'base64').toString('utf8');
          const rJsonStart = resDec.indexOf('{');
          if(rJsonStart !== -1) resBody = resDec.substring(rJsonStart, rJsonStart + 200).replace(/\s+/g, ' ');
        }
        console.log(`\nENGAGE #${++count}:`);
        console.log('  REQ:', reqBody.replace(/\s+/g, ' '));
        console.log('  RES:', resBody);
        if(count >= 3) break;
      }
    }
  }
}

// Also check wild-monsters response structure for cubone
console.log('\n\n--- WILD-MONSTERS RESPONSE ---');
for(const item of items) {
  if(item.includes('wild-monsters') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('[');
      if(jsonStart !== -1) {
        try {
          const parsed = JSON.parse(dec.substring(jsonStart));
          if(parsed.length > 0) {
            console.log('Fields on monster:', Object.keys(parsed[0]).join(', '));
            console.log('Full first item:', JSON.stringify(parsed[0], null, 2));
            break;
          }
        } catch(e) { console.log('parse error:', e.message); }
      }
    }
  }
}

// Check connection-queue
console.log('\n--- CONNECTION QUEUE ---');
for(const item of items) {
  if(item.includes('connection-queue')) {
    const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      console.log('URL:', urlMatch?.[1]);
      if(jsonStart !== -1) console.log('RES:', dec.substring(jsonStart, jsonStart + 300).replace(/\s+/g, ' '));
    }
    break;
  }
}

// Check security-config
console.log('\n--- SECURITY CONFIG ---');
for(const item of items) {
  if(item.includes('security-config')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const jsonStart = dec.indexOf('{');
      if(jsonStart !== -1) console.log('RES:', dec.substring(jsonStart, jsonStart + 500).replace(/\s+/g, ' '));
    }
    break;
  }
}
