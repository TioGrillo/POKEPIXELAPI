import fs from 'fs';

async function run() {
  const loginRes = await fetch('https://pokepixel.nietore.com/api/v1/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({login: 'b0v1nkbt55@web-library.net', password: 'Senha@2025'})
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  if (!token) return console.log('Login failed');

  const headers = {'Authorization': `Bearer ${token}`};

  const tests = [
    '/api/v1/profile',
    '/api/v1/players/me',
    '/api/v1/me',
    '/api/v1/auto-helper',
    '/api/v1/players/auto-helper',
    '/api/v1/depot',
    '/api/v1/inventory',
    '/api/v1/map-markers',
    '/api/v1/hunts'
  ];

  for (const t of tests) {
    try {
      const r = await fetch(`https://pokepixel.nietore.com${t}`, { headers });
      console.log(`${t} -> ${r.status}`);
      if (r.status === 200 || r.status === 201) {
        const text = (await r.text()).substring(0, 150);
        console.log(`  ${text}`);
      }
    } catch(e) {
      console.log(`${t} -> ERR: ${e.message}`);
    }
  }
}
run();
