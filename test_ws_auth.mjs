import WebSocket from 'ws';

async function run() {
  const loginRes = await fetch('https://pokepixel.nietore.com/api/v1/auth/login', {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({login: 'b0v1nkbt55@web-library.net', password: 'Senha@2025'})
  });
  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;
  if (!token) return console.log('Login failed');

  const url = `wss://pokepixel.nietore.com/api/v1/ws?token=${token}`;
  console.log(`Testing ${url.substring(0, 50)}...`);
  const ws = new WebSocket(url);
  ws.on('open', () => {
    console.log(`SUCCESS! WebSocket connected!`);
    ws.send(JSON.stringify({type: 'ping'}));
  });
  ws.on('message', (data) => {
    console.log('Received:', data.toString().substring(0, 200));
    setTimeout(() => { ws.close(); process.exit(0); }, 1000);
  });
  ws.on('error', (e) => {
    console.log(`FAIL: -> ${e.message}`);
  });
  ws.on('unexpected-response', (req, res) => {
    console.log(`FAIL (Unexpected): -> ${res.statusCode}`);
  });
}
run();
