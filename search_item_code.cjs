const fs = require('fs');
const path = require('path');

const pluginDir = 'C:\\Users\\Damiao\\.gemini\\antigravity\\brain\\2f93cb6b-2d78-4c74-a292-651377dc9b1d\\scratch\\plugins';

const files = fs.readdirSync(pluginDir);

files.forEach(file => {
  if (!file.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(pluginDir, file), 'utf8');
  if (content.includes('icon_index') || content.includes('items') || content.includes('Inventory')) {
    const lines = content.split('\n');
    lines.forEach((l, idx) => {
      if (l.includes('icon_index') || l.includes('item_id') || l.includes('assets/')) {
        console.log(`[${file}:${idx+1}] ${l.trim().slice(0, 150)}`);
      }
    });
  }
});
