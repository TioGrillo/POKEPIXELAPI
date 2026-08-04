const fs = require('fs');
const fname = fs.readdirSync('.').find(f => f.includes('AODEPERSON.har'));
console.log('HAR file found:', fname);
const har = JSON.parse(fs.readFileSync(fname, 'utf8'));
const entries = har.log.entries;
console.log('Total entries:', entries.length);
// Show first few URLs
entries.slice(0, 30).forEach(e => {
  console.log(e.request.method, e.request.url.slice(0, 100), '→', e.response.status);
});
