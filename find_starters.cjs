const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'MAPEAMENTO POKEPIXEL.har');
const xml = fs.readFileSync(harPath, 'utf8');

const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;

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
  if (!url.includes('/api/v1/species') && !url.includes('/api/v1/items')) continue;
  
  const resData = getTagWithAttr('response');
  let resDecoded = resData.base64 ? Buffer.from(resData.content.replace(/\s/g, ''), 'base64').toString('utf8') : resData.content;
  const resParts = resDecoded.split(/\r?\n\r?\n/);
  if (resParts.length < 2) continue;
  
  let body = resParts.slice(1).join('\n').trim();
  
  try {
    const json = JSON.parse(body);
    const species = json.data || (json.id ? [json] : []);
    
    const starters = species.filter(s => s.is_starter === true);
    
    if (starters.length > 0) {
      console.log(`\n=== STARTERS ENCONTRADOS (${url}) ===`);
      starters.forEach(s => {
        console.log(`\n${s.name} (${s.id})`);
        console.log(`  Elementos: ${s.elements?.join(', ')}`);
        console.log(`  Stats: HP:${s.base_stats?.hp} ATK:${s.base_stats?.atk} DEF:${s.base_stats?.def} SPA:${s.base_stats?.spa} SPD:${s.base_stats?.spd} SPE:${s.base_stats?.spe}`);
        console.log(`  Catch Rate: ${s.catch_rate} | Base Capture: ${s.base_capture_chance}%`);
        console.log(`  Moves: ${s.learn_moves?.join(', ')}`);
      });
      break; // Found the full list, stop
    }
  } catch(e) {}
}
