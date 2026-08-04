const fs = require('fs');
const fname = fs.readdirSync('.').find(f => f.includes('AODEPERSON.har'));
const har = JSON.parse(fs.readFileSync(fname, 'utf8'));
const entries = har.log.entries;

const relevant = entries.filter(e => {
  const u = e.request.url;
  return u.includes('pokepixel') || u.includes('mail.tm');
}).map(e => {
  const req = e.request;
  const res = e.response;
  let resBody = '';
  try { resBody = JSON.stringify(JSON.parse(res.content.text || 'null'), null, 0).slice(0, 400); }
  catch { resBody = (res.content.text || '').slice(0, 200); }
  return {
    method: req.method,
    url: req.url.replace('https://pokepixel.nietore.com', '[GAME]').replace('https://api.mail.tm', '[MAIL]'),
    status: res.status,
    reqBody: (req.postData && req.postData.text ? req.postData.text.slice(0, 400) : ''),
    resBody: resBody
  };
});

console.log(JSON.stringify(relevant, null, 2));
