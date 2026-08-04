const fs = require('fs');
const path = require('path');
const https = require('https');

async function run() {
  const p = path.join(process.env.APPDATA, 'pokepixelbot-web', 'config.json');
  if (!fs.existsSync(p)) return console.log('no config');
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  const acc = cfg.accounts[0];
  if (!acc || !acc.token) return console.log('no token');

  const options = {
    hostname: 'pokepixel.nietore.com',
    port: 443,
    path: '/api/v1/creatures?location=team',
    method: 'GET',
    headers: { 'Authorization': `Bearer ${acc.token}` }
  };

  const req = https.request(options, res => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('BODY:', data.slice(0, 1000));
    });
  });
  req.on('error', e => console.error(e));
  req.end();
}
run();
