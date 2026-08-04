const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'GOLENZADA.har');

if (fs.existsSync(harPath)) {
  console.log('Found GOLENZADA.har!');
  const harContent = fs.readFileSync(harPath, 'utf8');
  const harJson = JSON.parse(harContent);
  const entries = harJson.log.entries || [];
  
  for (const entry of entries) {
    const url = entry.request.url || '';
    if (url.includes('/api/v1/zones')) {
      const respText = entry.response.content?.text;
      if (respText) {
        try {
          const parsed = JSON.parse(respText);
          const zonesData = parsed.data || parsed;
          if (Array.isArray(zonesData)) {
            const outPath = 'D:/PROJETOS AT/a/POKEPIXELAPI/NovoBot/public/default_zones.json';
            fs.writeFileSync(outPath, JSON.stringify(zonesData, null, 2));
            console.log(`Successfully extracted ${zonesData.length} zones to ${outPath}!`);
            break;
          }
        } catch(e) {
          console.log('Error parsing response:', e.message);
        }
      }
    }
  }
} else {
  console.log('HAR file not found at:', harPath);
}
