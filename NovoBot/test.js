const axios = require('axios');
async function test() {
  try {
    const res = await axios.get('https://poke.idleworld.online/play');
    const m = res.data.match(/<script type="module" crossorigin src="(.*?)">/);
    if (m) {
      const jsUrl = 'https://poke.idleworld.online' + m[1];
      const js = await axios.get(jsUrl);
      const idx = js.data.indexOf('item_cocoon_stone');
      if (idx !== -1) {
        console.log(js.data.substring(Math.max(0, idx - 200), idx + 200));
      } else {
        console.log('Not found in main JS');
      }
    }
  } catch(e) { console.log(e.message); }
}
test();
