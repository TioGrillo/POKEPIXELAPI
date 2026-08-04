const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'MAPEAMENTO POKEPIXEL.har');
const xml = fs.readFileSync(harPath, 'utf8');

const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
const allStarters = new Set();

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
  if (!url.includes('/api/v1/species')) continue;
  
  const resData = getTagWithAttr('response');
  let resDecoded = resData.base64 ? Buffer.from(resData.content.replace(/\s/g, ''), 'base64').toString('utf8') : resData.content;
  const resParts = resDecoded.split(/\r?\n\r?\n/);
  if (resParts.length < 2) continue;
  
  let body = resParts.slice(1).join('\n').trim();
  
  try {
    const json = JSON.parse(body);
    const speciesList = Array.isArray(json.data) ? json.data : (json.id ? [json] : []);
    
    speciesList.forEach(s => {
      if (s.is_starter) {
        allStarters.add(`${s.name} (${s.id})`);
      }
    });
  } catch(e) {}
}

console.log('=== TODOS OS STARTERS COM is_starter: true ===');
console.log(Array.from(allStarters));
