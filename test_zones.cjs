const axios = require('axios');

async function getZones() {
  try {
    const res = await axios.get('https://pokepixel.nietore.com/api/v1/zones');
    console.log('STATUS:', res.status);
    console.log('TOTAL ZONES:', res.data?.data?.length);
    if (res.data?.data) {
      console.log('SAMPLE ZONE:', res.data.data[0]);
      // Save zones list to a fallback file
      const fs = require('fs');
      fs.writeFileSync('D:/PROJETOS AT/a/POKEPIXELAPI/NovoBot/public/default_zones.json', JSON.stringify(res.data.data, null, 2));
      console.log('Saved default_zones.json!');
    }
  } catch(e) {
    console.log('ERR:', e.message);
  }
}

getZones();
