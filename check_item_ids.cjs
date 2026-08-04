const fs = require('fs');
const content = fs.readFileSync('pokepixel_api_map.txt', 'utf8');

const itemBlocks = content.match(/\[GET\] \[G\]\/api\/v1\/(items|inventory)[\s\S]*?RES: (\{[\s\S]*?\n\n)/g) || [];

itemBlocks.forEach(block => {
  try {
    const jsonMatch = block.match(/RES:\s*(\{[\s\S]*)/);
    if (jsonMatch) {
      const json = JSON.parse(jsonMatch[1]);
      const data = json.data || [];
      console.log('=== ITEMS / INVENTORY SAMPLE ===');
      data.slice(0, 20).forEach(i => {
        console.log(`ID: "${i.item_id || i.id}", Name: "${i.name}", Type: "${i.type}", IconIndex: ${i.icon_index}`);
      });
    }
  } catch(e) {}
});
