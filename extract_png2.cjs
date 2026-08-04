const fs = require('fs');
const files = ['NEWHUNT.har', 'NEWHUNT2.har', 'NEWHUNT3.har', 'MAPEAMENTO POKEPIXEL.har'];
const urls = new Set();
for (const file of files) {
  try {
    const content = fs.readFileSync(`C:/Users/Damiao/Desktop/${file}`, 'utf8');
    // Extract all URLs inside "url": "..." in HAR file
    const regex = /"url"\s*:\s*"([^"]+\.png.*?)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      urls.add(match[1]);
    }
  } catch (e) {}
}
fs.writeFileSync('D:/PROJETOS AT/a/POKEPIXELAPI/all_png_urls.txt', Array.from(urls).join('\n'));
