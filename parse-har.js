const fs = require('fs');
const har = JSON.parse(fs.readFileSync('CRIAÇAODEPERSON.har', 'utf8'));

const entries = har.log.entries.filter(e => e.request.url.includes('poke.idleworld.online') && e.request.method === 'POST');
entries.forEach(e => {
  console.log(e.request.url);
  if (e.request.postData && e.request.postData.text) {
    console.log("PAYLOAD:", e.request.postData.text);
  }
  console.log("---------");
});
