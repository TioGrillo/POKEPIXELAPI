const axios = require('axios');

async function run() {
  try {
    const loginRes = await axios.post('https://pokepixel.nietore.com/api/v1/auth/login', {
      login: 'by4wj8sj5v@web-library.net',
      password: 'Senha@2025'
    });
    const token = loginRes.data.access_token;
    const res = await axios.get('https://pokepixel.nietore.com/api/v1/creatures', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Creatures response structure:');
    console.log(JSON.stringify(res.data.data.slice(0, 5), null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
run();
