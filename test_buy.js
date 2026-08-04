const fs = require('fs');
const os = require('os');
const path = os.homedir() + '/AppData/Roaming/PokePixelBot-Web/config.json';
const config = JSON.parse(fs.readFileSync(path, 'utf8'));
const { savedUser, savedPass } = config.auth;

async function login() {
    const res = await fetch(`https://pokepixel.nietore.com/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: savedUser, password: savedPass })
    });
    const data = await res.json();
    return data.access_token || data.token || data.accessToken;
}

async function testBuy(endpoint, payload, token) {
    console.log(`Testing POST ${endpoint}...`);
    try {
        const res = await fetch(`https://pokepixel.nietore.com${endpoint}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        console.log(`Status: ${res.status}`);
        const text = await res.text();
        console.log(text.substring(0, 500));
        return res.status !== 404;
    } catch(e) {
        console.log(`ERROR:`, e.message);
    }
    return false;
}

async function main() {
    const token = await login();
    console.log("Logged in!");
    
    // Test the buy endpoint with correct payload
    await testBuy('/api/v1/shop/buy', { item_id: 'potion_small', qty: 1 }, token);
}
main();
