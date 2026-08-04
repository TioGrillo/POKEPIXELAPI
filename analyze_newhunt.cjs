const fs = require('fs');

function stripCdata(s) {
  return s.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function parseBase64(s) {
  try { return Buffer.from(s.trim(), 'base64').toString('utf8'); } catch { return s || ''; }
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return null;
  return stripCdata(m[1]);
}

function extractTagWithAttr(block, tag) {
  const m = block.match(new RegExp(`<${tag}\\s+base64="(true|false)"[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return { isB64: false, value: '' };
  const isB64 = m[1] === 'true';
  const val = stripCdata(m[2]);
  return { isB64, value: isB64 ? parseBase64(val) : val };
}

function getHttpBody(rawHttp) {
  const idx = rawHttp.indexOf('\r\n\r\n');
  if (idx > -1) return rawHttp.substring(idx + 4).trim();
  const idx2 = rawHttp.indexOf('\n\n');
  if (idx2 > -1) return rawHttp.substring(idx2 + 2).trim();
  return '';
}

function analyzeBurp(filename) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`FILE: ${filename}`);
  console.log('='.repeat(60));
  
  const raw = fs.readFileSync(filename, 'utf8');
  const itemMatches = [...raw.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  console.log(`Total items: ${itemMatches.length}\n`);

  const byEndpoint = {};

  for (const match of itemMatches) {
    const block = match[1];
    const method = stripCdata(extractTag(block, 'method') || '');
    const url = stripCdata(extractTag(block, 'url') || '');
    const statusStr = stripCdata(extractTag(block, 'status') || '0');
    const timeStr = stripCdata(extractTag(block, 'time') || '0');
    
    if (!url.includes('/api/v1/hunt') && !url.includes('/api/v1/wild')) continue;
    
    const { isB64: reqB64, value: rawReq } = extractTagWithAttr(block, 'request');
    const { isB64: resB64, value: rawRes } = extractTagWithAttr(block, 'response');
    
    const reqBody = getHttpBody(rawReq);
    const resBody = getHttpBody(rawRes);
    
    const endpointPath = url.replace(/\?.*/, '').split('/api/v1')[1] || url;
    const key = `${method} ${endpointPath}`;
    
    if (!byEndpoint[key]) byEndpoint[key] = { count: 0, statuses: {}, samples: [], url };
    byEndpoint[key].count++;
    byEndpoint[key].statuses[statusStr] = (byEndpoint[key].statuses[statusStr] || 0) + 1;
    if (byEndpoint[key].samples.length < 3) {
      byEndpoint[key].samples.push({ status: statusStr, reqBody, resBody, url });
    }
  }

  for (const [ep, data] of Object.entries(byEndpoint)) {
    const statStr = Object.entries(data.statuses).map(([s,c]) => `${s}×${c}`).join(', ');
    console.log(`\n${ep} [${data.count}x | ${statStr}]`);
    
    for (const [idx, s] of data.samples.entries()) {
      if (s.reqBody && s.reqBody.length > 2) {
        try {
          const parsed = JSON.parse(s.reqBody);
          console.log(`  → Req: ${JSON.stringify(parsed)}`);
        } catch { console.log(`  → Req: ${s.reqBody.substring(0, 300)}`); }
      }
      if (s.resBody && s.resBody.length > 2) {
        try {
          const parsed = JSON.parse(s.resBody);
          const short = JSON.stringify(parsed).substring(0, 500);
          console.log(`  ← Res(${s.status}): ${short}`);
        } catch {}
      }
      // For wild-monsters, extract URL params
      if (ep.includes('wild-monster')) {
        try {
          const u = new URL(s.url);
          const events = u.searchParams.get('events') || '';
          const evParts = events.split(',');
          console.log(`  URL: zone=${u.searchParams.get('zone_id')?.substring(0,8)} map=${u.searchParams.get('map_id')} level=${u.searchParams.get('level')} events[0..2]="${evParts.slice(0,3).join(',')}..." total_events=${evParts.length}`);
        } catch {}
        break; // just show one wild-monsters sample
      }
    }
  }
}

analyzeBurp('C:/Users/Damiao/Desktop/NEWHUNT5.har');
analyzeBurp('C:/Users/Damiao/Desktop/NEWHUNT4.har');
