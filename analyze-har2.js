const fs = require('fs');

const data = JSON.parse(fs.readFileSync('C:\\Users\\Damiao\\Desktop\\REGOTHER.har', 'utf8'));
const entries = data.log.entries;

// Find the register page load to get headers (user-agent etc.)
for (const entry of entries) {
  const req = entry.request;
  const url = req.url;
  
  if (url.includes('poke.idleworld.online/register') && req.method === 'GET') {
    console.log(`\n=== GET ${url} ===`);
    console.log('Headers:');
    for (const h of req.headers) {
      console.log(`  ${h.name}: ${h.value}`);
    }
  }
  
  if (url.includes('/api/auth/register') && req.method === 'POST') {
    console.log(`\n=== POST ${url} ===`);
    console.log('Request Headers:');
    for (const h of req.headers) {
      console.log(`  ${h.name}: ${h.value}`);
    }
    console.log('Payload:', req.postData?.text);
    console.log(`Response Status: ${entry.response.status}`);
  }
}
