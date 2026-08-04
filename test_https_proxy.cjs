try {
  const { HttpsProxyAgent } = require('https-proxy-agent');
  console.log('https-proxy-agent IS AVAILABLE!');
} catch(e) {
  console.log('https-proxy-agent is NOT available:', e.message);
}
