const axios = require('axios');
async function run() {
  try {
    const loginRes = await axios.post('https://pokepixel.nietore.com/api/v1/auth/login', { login: 'by4wj8sj5v@web-library.net', password: 'Senha@2025' });
    const token = loginRes.data.access_token;
    const teamRes = await axios.get('https://pokepixel.nietore.com/api/v1/team', { headers: { Authorization: `Bearer ${token}` } });
    console.log('TEAM CREATURE SAMPLE:', JSON.stringify(teamRes.data[0] || teamRes.data, null, 2));
    const creatRes = await axios.get('https://pokepixel.nietore.com/api/v1/creatures', { headers: { Authorization: `Bearer ${token}` } });
    const list = Array.isArray(creatRes.data) ? creatRes.data : (creatRes.data.data || creatRes.data.creatures || []);
    console.log('DEPOT CREATURE SAMPLE:', JSON.stringify(list[0], null, 2));
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
