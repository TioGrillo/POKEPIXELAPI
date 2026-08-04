const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'MAPEAMENTO POKEPIXEL.har');
const xml = fs.readFileSync(harPath, 'utf8');

const itemRegex = /<item>([\s\S]*?)<\/item>/g;
let match;
let zonesData = null;
let speciesData = [];

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
  
  if (url.includes('/api/v1/zones')) {
    const resData = getTagWithAttr('response');
    let resDecoded = resData.base64 ? Buffer.from(resData.content.replace(/\s/g, ''), 'base64').toString('utf8') : resData.content;
    const resParts = resDecoded.split(/\r?\n\r?\n/);
    if (resParts.length >= 2) {
      try {
        const json = JSON.parse(resParts.slice(1).join('\n'));
        zonesData = json.data || json;
      } catch(e) {}
    }
  }

  if (url.includes('/api/v1/species')) {
    const resData = getTagWithAttr('response');
    let resDecoded = resData.base64 ? Buffer.from(resData.content.replace(/\s/g, ''), 'base64').toString('utf8') : resData.content;
    const resParts = resDecoded.split(/\r?\n\r?\n/);
    if (resParts.length >= 2) {
      try {
        const json = JSON.parse(resParts.slice(1).join('\n'));
        const list = Array.isArray(json.data) ? json.data : (json.id ? [json] : []);
        speciesData.push(...list);
      } catch(e) {}
    }
  }
}

console.log('=== ZONAS DE ILHAS LENDÁRIAS ===');
if (zonesData) {
  const legZones = zonesData.filter(z => (z.world || '').toLowerCase() === 'legendary' || z.id.includes('legendary'));
  console.log(`Encontradas ${legZones.length} zonas lendárias:`);
  legZones.forEach(z => {
    console.log(`\n- ${z.name} (${z.id})`);
    console.log(`  Mundo: ${z.world} | Nível recomendado: ${z.recommended_level || z.min_level}`);
    console.log(`  Encounters:`, JSON.stringify(z.encounters || []));
  });
} else {
  console.log('Nenhum dado de zonas no HAR.');
}

console.log('\n=== CHECAGEM DE ESPÉCIES LENDÁRIAS (Catch Rate / Capturabilidade) ===');
const speciesMap = new Map();
speciesData.forEach(s => {
  if (s.id) speciesMap.set(s.id, s);
});

const legendarySpecies = ['articuno', 'zapdos', 'moltres', 'mewtwo', 'mew', 'raikou', 'entei', 'suicune', 'lugia', 'ho-oh'];
legendarySpecies.forEach(sp => {
  const data = speciesMap.get(sp);
  if (data) {
    console.log(`- ${data.name} (${sp}): Catch Rate=${data.catch_rate}, BaseCaptureChance=${data.base_capture_chance}%`);
  } else {
    console.log(`- ${sp}: Dados de espécie não encontrados no HAR.`);
  }
});
