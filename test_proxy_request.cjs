const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

async function testProxyReq(url, proxyUrl) {
  try {
    const agent = new HttpsProxyAgent(proxyUrl);
    const res = await axios.get(url, {
      httpsAgent: agent,
      httpAgent: agent,
      validateStatus: () => true
    });
    console.log(`[OK ${res.status}] ${url}`);
  } catch(e) {
    console.log(`[ERR] ${e.message}`);
  }
}

testProxyReq('https://api.mail.tm/domains', 'http://127.0.0.1:8080');
