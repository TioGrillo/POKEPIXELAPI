const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('C:\\Users\\Damiao\\Desktop\\REGOTHER.har', 'utf8'));
  const entries = data.log.entries;
  
  console.log(`Total requests: ${entries.length}`);
  
  for (const entry of entries) {
    const req = entry.request;
    const url = req.url;
    
    // Look for registration POST or Turnstile token endpoints
    if ((url.includes('/register') && req.method === 'POST') || url.includes('api/characters') || url.includes('/challenge') || url.includes('turnstile')) {
      console.log(`\n--- REQUEST: ${req.method} ${url} ---`);
      
      if (req.postData && req.postData.text) {
        console.log("Payload:", req.postData.text.substring(0, 500));
      }
      
      const res = entry.response;
      console.log(`Status: ${res.status}`);
      if (res.content && res.content.text) {
        console.log("Response:", res.content.text.substring(0, 500));
      }
    }
  }
} catch (e) {
  console.error("Error reading HAR:", e);
}
