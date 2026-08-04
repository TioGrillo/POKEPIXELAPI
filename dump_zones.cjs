const axios = require('axios');
const fs = require('fs');
const token = JSON.parse(fs.readFileSync('D:/PROJETOS AT/a/POKEPIXELAPI/NovoBot/test_creds.json', 'utf8')).token;

async function run() {
  try {
    const res = await axios.get('https://pokepixel.nietore.com/api/v1/zones', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const zones = res.data.data;
    console.log(`Total zones: ${zones.length}`);
    for (const z of zones) {
      if (z.name.toLowerCase().includes('geodude') || z.name.toLowerCase().includes('moon')) {
        console.log(z);
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}
run();
