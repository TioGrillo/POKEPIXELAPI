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
    const matches = text.match(/\/api\/[a-zA-Z0-9_/-]+/g) || [];
    for (const match of matches) {
      console.log(url, match);
    }
  }
}
test();
