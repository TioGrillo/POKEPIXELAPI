const fs = require('fs');
const path = require('path');

const harPath = path.join(process.env.USERPROFILE, 'Desktop', 'POKEPEDIAITENS.har');
const harData = JSON.parse(fs.readFileSync(harPath, 'utf8'));

// The depot endpoint returns item prices!
// Let's look at ALL api/game/* responses and dump the ones with items
harData.log.entries.forEach(e => {
    const url = e.request.url;
    const content = e.response.content;
    
    if (content && content.text && url.includes('poke.idleworld') && url.includes('/api/game/')) {
        try {
            const data = JSON.parse(content.text);
            console.log('API URL:', url);
            console.log('Keys:', JSON.stringify(Object.keys(data)));
            
            // Check for inventory/items/drops
            if (data.inventory) {
                console.log('Has inventory! First item:', JSON.stringify(data.inventory[0]));
                fs.writeFileSync(path.join(process.env.USERPROFILE, 'Desktop', 'depot_data.json'), content.text);
            }
            console.log('---');
        } catch(e) {
            // Not JSON, skip
        }
    }
});
