const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\Damiao\\Desktop\\REGOTHER.har', 'utf8'));
const entries = data.log.entries;

// Find all unique domains used
const domains = new Set();
for (const e of entries) {
  try { domains.add(new URL(e.request.url).hostname); } catch(e) {}
}
console.log('Domains visited:', [...domains].join('\n'));

// Find email-related requests
console.log('\n--- EMAIL PROVIDER REQUESTS ---');
for (const entry of entries) {
  const url = entry.request.url;
  if (!url.includes('cloudflare') && !url.includes('poke.idleworld') && !url.includes('chrome') && !url.includes('gstatic')) {
    const method = entry.request.method;
    const status = entry.response.status;
    console.log(`${method} ${url} -> ${status}`);
  }
}
