import WebSocket from 'ws';

async function testWSToken(name, token) {
  const url = `wss://pokepixel.nietore.com/api/v1/ws?${name}=${token}`;
  console.log(`Testing query param ${name}...`);
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    ws.on('open', () => {
      console.log(`SUCCESS with ${name}!`);
      ws.close();
      resolve(true);
    });
    ws.on('unexpected-response', (req, res) => {
      console.log(`FAIL ${name} -> ${res.statusCode}`);
      resolve(false);
    });
    ws.on('error', () => {
      resolve(false);
    });
  });
}

async function testWSSubprotocol(token) {
  const url = `wss://pokepixel.nietore.com/api/v1/ws`;
  console.log(`Testing subprotocol...`);
  return new Promise((resolve) => {
    const ws = new WebSocket(url, ['access_token', token]);
    ws.on('open', () => {
      console.log(`SUCCESS with subprotocol!`);
      ws.close();
      resolve(true);
    });
    ws.on('unexpected-response', (req, res) => {
      console.log(`FAIL subprotocol -> ${res.statusCode}`);
      resolve(false);
    });
    ws.on('error', () => resolve(false));
  });
}

async function testWSHeader(token) {
  const url = `wss://pokepixel.nietore.com/api/v1/ws`;
  console.log(`Testing Authorization header...`);
  return new Promise((resolve) => {
    const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${token}` } });
    ws.on('open', () => {
      console.log(`SUCCESS with header!`);
      ws.close();
      resolve(true);
    });
    ws.on('unexpected-response', (req, res) => {
      console.log(`FAIL header -> ${res.statusCode}`);
      resolve(false);
    });
    ws.on('error', () => resolve(false));
  });
}

async function run() {
  const loginRes = await fetch('https://pokepixel.nietore.com/api/v1/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({login: 'b0v1nkbt55@web-library.net', password: 'Senha@2025'})
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  
  await testWSToken('token', token);
  await testWSToken('access_token', token);
  await testWSToken('jwt', token);
  await testWSToken('auth', token);
  
  await testWSSubprotocol(token);
  await testWSHeader(token);
}
run();
