const { HttpsProxyAgent } = require('https-proxy-agent');
const axios = require('axios');

const proxyLine = "brd.superproxy.io:44445:brd-customer-hl_1727472a-zone-datacenter_proxy1-ip-45.144.88.230:juloidq9uod2";

function formatProxyUrl(str) {
  if (!str || !str.trim()) return null;
  let s = str.trim();
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  
  const parts = s.split(':');
  if (parts.length === 4) {
    const host = parts[0];
    const port = parts[1];
    const user = encodeURIComponent(parts[2]);
    const pass = encodeURIComponent(parts[3]);
    return `http://${user}:${pass}@${host}:${port}`;
  }
  if (parts.length === 2) {
    return `http://${parts[0]}:${parts[1]}`;
  }
  return `http://${s}`;
}

const formatted = formatProxyUrl(proxyLine);
console.log('Formatted URL:', formatted);

try {
  const agent = new HttpsProxyAgent(formatted);
  console.log('Agent constructed successfully!');
  console.log('Agent proxy options:', agent.proxy);
} catch(e) {
  console.log('Agent Error:', e.message);
}
