const fs = require('fs');
async function test() {
  const r = await fetch('https://poke.idleworld.online/');
  const html = await r.text();
  const scriptRegex = /src="(\/_next\/static\/chunks\/[^"]+)"/g;
  let m;
  const urls = [];
  while ((m = scriptRegex.exec(html)) !== null) {
    urls.push(m[1]);
  }
  for (const url of urls) {
    const full = 'https://poke.idleworld.online' + url;
    const res = await fetch(full);
    const text = await res.text();
    const bpMatches = text.match(/.{0,30}battlepass.{0,30}/gi) || [];
    for (const match of bpMatches) {
      if (match.includes('api/game')) console.log('BP:', match);
    }
    const giftMatches = text.match(/.{0,30}gifts?.{0,30}/gi) || [];
    for (const match of giftMatches) {
      if (match.includes('api/game') || match.includes('action')) console.log('GIFT:', match);
    }
  }
}
test();
