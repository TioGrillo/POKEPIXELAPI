import fs from 'fs';

async function run() {
  const loginRes = await fetch('https://pokepixel.nietore.com/api/v1/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({login: 'b0v1nkbt55@web-library.net', password: 'Senha@2025'})
  });
  const loginData = await loginRes.json();
  console.log('Login Response:');
  console.log(JSON.stringify(loginData, null, 2));
}
run();
