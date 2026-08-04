const https = require('https');

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  try {
    const html = await fetchUrl('https://pokepixel.nietore.com/play/');
    const jsUrls = [
      "js/rmmz_core.js",
      "js/rmmz_managers.js",
      "js/rmmz_objects.js",
      "js/rmmz_scenes.js",
      "js/rmmz_sprites.js",
      "js/rmmz_windows.js",
      "js/plugins.js"
    ];
    console.log("Found dynamic JS files:", jsUrls.length);
    
    for (let url of jsUrls) {
      url = 'https://pokepixel.nietore.com/play/' + url;
      const js = await fetchUrl(url);
      
      const wssMatches = js.match(/wss?:\/\/[^"'\s`]+/gi);
      if (wssMatches) console.log(`[${url}] WSS:`, [...new Set(wssMatches)]);
      
      const wsMatches = js.match(/.{0,50}WebSocket.{0,50}/gi);
      if (wsMatches) console.log(`[${url}] WebSocket:`, wsMatches.slice(0, 5));
      
      const huntMatches = js.match(/.{0,50}\/api\/v1\/hunts.{0,50}/gi);
      if (huntMatches) console.log(`[${url}] Hunts API:`, huntMatches.slice(0, 5));
      
      const wsConnect = js.match(/.{0,50}\/api\/v1\/ws.{0,50}/gi);
      if (wsConnect) console.log(`[${url}] /api/v1/ws:`, wsConnect.slice(0, 5));
    }
  } catch(e) {
    console.error(e);
  }
})();
