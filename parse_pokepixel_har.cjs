const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'MAPEAMENTO POKEPIXEL.har');
const xml = fs.readFileSync(harPath, 'utf8');

const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
const results = [];

while ((match = itemRegex.exec(xml)) !== null) {
  const item = match[1];
  
  const getTag = (tag) => {
    const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
    return m ? m[1].trim() : '';
  };
  const getTagWithAttr = (tag) => {
    const m = item.match(new RegExp(`<${tag}\\s+base64="(true|false)"[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i'));
    if (!m) return { base64: false, content: '' };
    return { base64: m[1] === 'true', content: m[2].trim() };
  };

  const url = getTag('url');
  const method = getTag('method');
  const status = getTag('status');

  // Only API endpoints (not assets/images)
  if (!url.includes('/api/v1/') && !url.includes('mail.tm')) continue;

  const reqData = getTagWithAttr('request');
  const resData = getTagWithAttr('response');

  let reqDecoded = reqData.base64 ? Buffer.from(reqData.content.replace(/\s/g, ''), 'base64').toString('utf8') : reqData.content;
  let reqBody = '';
  const reqParts = reqDecoded.split(/\r?\n\r?\n/);
  if (reqParts.length > 1) reqBody = reqParts.slice(1).join('\n').trim().slice(0, 600);

  let resDecoded = resData.base64 ? Buffer.from(resData.content.replace(/\s/g, ''), 'base64').toString('utf8') : resData.content;
  let resBody = '';
  const resParts = resDecoded.split(/\r?\n\r?\n/);
  if (resParts.length > 1) {
    resBody = resParts.slice(1).join('\n').trim();
    // Remove gzip/compressed check
    if (resBody.startsWith('\x1f\x8b') || resBody.charCodeAt(0) === 31) {
      resBody = '[COMPRESSED/BINARY]';
    } else {
      try { resBody = JSON.stringify(JSON.parse(resBody), null, 2).slice(0, 800); }
      catch { resBody = resBody.slice(0, 400); }
    }
  }

  results.push({
    method,
    url: url.replace('https://pokepixel.nietore.com', '[G]'),
    status,
    reqBody,
    resBody
  });
}

// Output
const lines = [];
lines.push(`Found ${results.length} API items\n`);

const unique = [...new Set(results.map(r => `${r.method} ${r.url.split('?')[0]}`))];
lines.push('=== UNIQUE API ENDPOINTS ===');
unique.forEach(u => lines.push(u));
lines.push('');

lines.push('=== FULL DETAILS ===');
results.forEach(r => {
  lines.push(`\n[${r.method}] ${r.url} → ${r.status}`);
  if (r.reqBody) lines.push(`  REQ: ${r.reqBody}`);
  if (r.resBody) lines.push(`  RES: ${r.resBody}`);
});

fs.writeFileSync('pokepixel_api_map.txt', lines.join('\n'), 'utf8');
console.log('Done! Saved to pokepixel_api_map.txt');
console.log(lines.slice(0, 40).join('\n'));
