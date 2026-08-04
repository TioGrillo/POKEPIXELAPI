const fs = require('fs');
const file = 'C:/Users/Damiao/Desktop/NEWHUNT4.har';
const content = fs.readFileSync(file, 'utf8');
const items = content.split('<item>');

// Map all engage calls with their HTTP status
console.log('=== ALL ENGAGE CALLS ===');
let count = 0;
for(const item of items) {
  if(item.includes('hunts/current/engage')) {
    const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(reqMatch && resMatch) {
      const reqDec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
      const resDec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const reqBody = reqDec.split('\r\n\r\n').pop();
      const resLines = resDec.split('\r\n');
      const statusLine = resLines[0];
      const resBody = resDec.split('\r\n\r\n').pop();
      count++;
      if(count <= 5 || count > 15) {
        console.log(`\n#${count}: STATUS: ${statusLine.trim()} | REQ: ${reqBody?.replace(/\s+/g, ' ')} | RES: ${resBody?.substring(0, 200).replace(/\s+/g, ' ')}`);
      }
    }
  }
}
console.log(`\nTotal engage calls: ${count}`);

// Check wild-monsters call during cubone hunt - see if hp = 0 or dead
for(const item of items) {
  if(item.includes('wild-monsters') && item.includes('cubone')) {
    const resMatch = item.match(/<response base64="true"><!\[CDATA\[(.*?)\]\]><\/response>/);
    if(resMatch) {
      const dec = Buffer.from(resMatch[1], 'base64').toString('utf8');
      const body = dec.split('\r\n\r\n').pop();
      try {
        const parsed = JSON.parse(body);
        const data = parsed.data;
        const alive = data.filter(m => m.hp > 0);
        const dead = data.filter(m => m.hp <= 0);
        console.log(`\nWILD-MONSTERS: ${data.length} total, ${alive.length} alive (hp>0), ${dead.length} dead (hp<=0)`);
        console.log('respawn_seconds:', parsed.respawn_seconds);
        break;
      } catch(e) {}
    }
  }
}
