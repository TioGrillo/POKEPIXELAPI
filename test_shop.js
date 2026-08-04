const fs = require('fs');
const os = require('os');
const path = os.homedir() + '/AppData/Roaming/PokePixelBot-Web/config.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
const token = config.accounts[0].token;

async function testEndpoint(endpoint) {
    console.log(`Testing ${endpoint}...`);
    try {
        const res = await fetch(`https://pokepixel.nietore.com${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 200) {
            console.log(`SUCCESS: ${endpoint}`);
            const text = await res.text();
            console.log(text.substring(0, 500));
            return true;
        } else {
            console.log(`FAILED ${endpoint}: ${res.status}`);
        }
    } catch(e) {
        console.log(`ERROR ${endpoint}:`, e.message);
    }
    return false;
}

async function main() {
    const endpoints = [
        '/api/v1/shop',
        '/api/v1/store',
        '/api/v1/npc/shop',
        '/api/v1/npc/store',
        '/api/v1/game/items',
        '/api/v1/game/shop',
        '/api/v1/mart',
        '/api/v1/pokemart',
        '/api/v1/items',
        '/api/v1/inventory/shop',
        '/api/v1/market/npc'
    ];
    for (const e of endpoints) {
        if (await testEndpoint(e)) return;
    }
}
main();
