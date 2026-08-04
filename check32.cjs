const fs = require('fs');
const content = fs.readFileSync('C:/Users/Damiao/Desktop/NEWHUNT5.har', 'utf8');
const items = content.split('<item>');

// Get full engage response
console.log('=== ENGAGE FULL RESPONSE ===');
for(const item of items) {
  if(!item.includes('hunts/current/engage')) continue;
  const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
  if(res) {
    const body = Buffer.from(res[1], 'base64').toString('utf8').split('\r\n\r\n').pop();
    try {
      const p = JSON.parse(body);
      console.log(JSON.stringify(p, null, 2).substring(0, 1500));
    } catch(e) { console.log(body?.substring(0,500)); }
    break;
  }
}

// Get hunts/current response 
console.log('\n=== HUNTS/CURRENT ===');
for(const item of items) {
  if(item.includes('/api/v1/hunts/current') && !item.includes('engage') && !item.includes('stop') && !item.includes('snapshot') && !item.includes('settings') && !item.includes('capture')) {
    const u = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
    const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(u && res) {
      const body = Buffer.from(res[1], 'base64').toString('utf8').split('\r\n\r\n').pop();
      console.log('URL:', u[1]);
      try {
        const p = JSON.parse(body);
        console.log(JSON.stringify(p, null, 2).substring(0, 800));
      } catch(e) {}
      break;
    }
  }
}

// hunts/analyzer  
console.log('\n=== HUNTS/ANALYZER ===');
for(const item of items) {
  if(item.includes('/api/v1/hunts/analyzer')) {
    const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(res) {
      const body = Buffer.from(res[1], 'base64').toString('utf8').split('\r\n\r\n').pop();
      try {
        const p = JSON.parse(body);
        console.log(JSON.stringify(p, null, 2).substring(0, 800));
      } catch(e) {}
      break;
    }
  }
}

// entry-status
console.log('\n=== HUNTS/ENTRY-STATUS ===');
for(const item of items) {
  if(item.includes('/api/v1/hunts/entry-status')) {
    const res = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(res) {
      const body = Buffer.from(res[1], 'base64').toString('utf8').split('\r\n\r\n').pop();
      try {
        const p = JSON.parse(body);
        console.log(JSON.stringify(p, null, 2).substring(0, 600));
      } catch(e) {}
      break;
    }
  }
}
