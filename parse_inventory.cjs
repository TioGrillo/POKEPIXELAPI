const fs = require('fs');
const files = ['NEWHUNT.har', 'NEWHUNT2.har', 'NEWHUNT3.har', 'MAPEAMENTO POKEPIXEL.har'];
const items = new Map();
for (const file of files) {
  try {
    const content = fs.readFileSync(`C:/Users/Damiao/Desktop/${file}`, 'utf8');
    let inventoryIdx = content.indexOf('api/v1/inventory');
    while (inventoryIdx !== -1) {
      // Find the JSON response nearby
      const jsonStart = content.indexOf('{"data":[', inventoryIdx);
      if (jsonStart !== -1 && jsonStart < inventoryIdx + 50000) {
        let braces = 0;
        let inString = false;
        let jsonStr = '';
        for (let i = jsonStart; i < content.length; i++) {
           const char = content[i];
           jsonStr += char;
           if (char === '"' && content[i-1] !== '\\') inString = !inString;
           if (!inString) {
             if (char === '{') braces++;
             if (char === '}') {
               braces--;
               if (braces === 0) break;
             }
           }
        }
        try {
          const parsed = JSON.parse(jsonStr);
          if (parsed && Array.isArray(parsed.data)) {
            parsed.data.forEach(item => {
              items.set(item.item_id, item.name);
            });
          }
        } catch (e) {}
      }
      inventoryIdx = content.indexOf('api/v1/inventory', inventoryIdx + 10);
    }
  } catch (e) {}
}
for (const [id, name] of items.entries()) {
  console.log(`${id} => ${name}`);
}
