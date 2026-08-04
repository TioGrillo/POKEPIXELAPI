const fs = require('fs');
const files = ['C:/Users/Damiao/Desktop/MAPEAMENTO POKEPIXEL.har', 'C:/Users/Damiao/Desktop/NEWHUNT.har', 'C:/Users/Damiao/Desktop/NEWHUNT2.har'];

const regexUrl = /<url><!\[CDATA\[(https:\/\/[^\]]+)\]\]><\/url>[\s\S]*?<method><!\[CDATA\[(POST)\]\]><\/method>[\s\S]*?<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/g;
const jsonRegexUrl = /"method"\s*:\s*"POST"[\s\S]*?"url"\s*:\s*"(https:\/\/[^"]+)"/g;

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  console.log(`\n--- Analisando ${file} ---`);
  
  const items = content.split('<item>');
  for(const item of items) {
    if(item.includes('POST') && item.includes('api/v1/')) {
        const urlMatch = item.match(/<url><!\[CDATA\[(.*?)\]\]><\/url>/);
        const reqMatch = item.match(/<request base64="true"><!\[CDATA\[(.*?)\]\]><\/request>/);
        if (urlMatch && reqMatch) {
            const url = urlMatch[1];
            if (url.includes('hunts') || url.includes('catch') || url.includes('item') || url.includes('capsule') || url.includes('battle')) {
                const dec = Buffer.from(reqMatch[1], 'base64').toString('utf8');
                if (dec.includes('{')) {
                    const jsonStart = dec.indexOf('{');
                    console.log(`[${url}] -> ${dec.substring(jsonStart).replace(/\s+/g, ' ')}`);
                } else {
                    console.log(`[${url}] -> (No JSON)`);
                }
            }
        }
    }
  }
}
