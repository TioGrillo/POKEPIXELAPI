const fs = require('fs');
const path = require('path');
const https = require('https');

function fetchJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
            });
        }).on('error', reject);
    });
}

async function main() {
    const data = await fetchJson('https://poke.idleworld.online/game/items.json');
    const items = data.items || [];
    
    // Fix relative icon URLs to absolute
    const fixed = items.map(item => ({
        ...item,
        icon: item.icon 
            ? (item.icon.startsWith('http') ? item.icon : `https://poke.idleworld.online${item.icon}`)
            : ''
    })).filter(item => item.id && item.name && item.icon);

    const out = path.join(__dirname, 'src', 'shared', 'items_data.json');
    fs.writeFileSync(out, JSON.stringify(fixed, null, 2));
    console.log(`Saved ${fixed.length} items to items_data.json`);
    
    // Also save a markdown database
    let md = '# Poke Idle World - Items Database\n\n';
    md += `> Última atualização: ${new Date().toISOString()}\n\n`;
    
    const categories = [...new Set(fixed.map(i => i.category))].sort();
    for (const cat of categories) {
        const catItems = fixed.filter(i => i.category === cat);
        md += `## ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catItems.length} items)\n\n`;
        md += '| ID | Nome | Preço NPC | Raro |\n';
        md += '|----|------|-----------|------|\n';
        catItems.sort((a,b) => b.npcPrice - a.npcPrice).forEach(item => {
            md += `| ${item.id} | ${item.name} | ${item.npcPrice.toLocaleString()} gold | ${item.rare ? '⭐' : '—'} |\n`;
        });
        md += '\n';
    }

    const mdOut = path.join(__dirname, 'src', 'shared', 'items_database.md');
    fs.writeFileSync(mdOut, md);
    console.log(`Saved items_database.md`);
}

main().catch(console.error);
