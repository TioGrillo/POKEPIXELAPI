const fs = require('fs');

const harPath = 'C:\\Users\\Damiao\\Desktop\\MAPEAMENTO POKEPIXEL.har';

if (fs.existsSync(harPath)) {
  const content = fs.readFileSync(harPath, 'utf8');
  const har = JSON.parse(content);
  const entries = har.log.entries || [];
  
  let foundZones = null;
  for (const e of entries) {
    if (e.request.url.includes('/api/v1/zones')) {
      try {
        const data = JSON.parse(e.response.content.text);
        if (data && data.data && Array.isArray(data.data)) {
          foundZones = data.data;
          break;
        }
      } catch(err) {}
    }
  }
  
  if (foundZones) {
    console.log(`FOUND ${foundZones.length} ZONES in HAR!`);
    const code = `import type { Zone } from '../types';\n\nexport const DEFAULT_ZONES: Zone[] = ${JSON.stringify(foundZones, null, 2)};\n`;
    fs.writeFileSync('D:/PROJETOS AT/a/POKEPIXELAPI/NovoBot/src/lib/defaultZones.ts', code);
    console.log('Successfully written real zones to defaultZones.ts!');
  } else {
    console.log('No /zones response found in HAR.');
  }
} else {
  console.log('HAR file not found.');
}
