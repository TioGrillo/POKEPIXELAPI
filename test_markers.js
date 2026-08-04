const fs = require('fs');
const execSync = require('child_process').execSync;
const accounts = JSON.parse(fs.readFileSync('C:/Users/Damiao/AppData/Roaming/pokeidlebot-web/config.json', 'utf8')).accounts;
const token = accounts[0].token;
const res = execSync('curl -s -H "Authorization: Bearer ' + token + '" https://poke.idleworld.online/api/game/map-markers');
const data = JSON.parse(res.toString());
const pineco = data.hunts.filter(h => h.name.toLowerCase().includes('pineco') || h.slug.toLowerCase().includes('pineco'));
console.log(JSON.stringify(pineco));
