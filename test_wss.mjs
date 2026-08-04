import WebSocket from 'ws';

async function testWS(url) {
  return new Promise((resolve) => {
    console.log(`Testing ${url}...`);
    const ws = new WebSocket(url);
    ws.on('open', () => {
      console.log(`SUCCESS: ${url}`);
      ws.close();
      resolve(true);
    });
    ws.on('error', (e) => {
      console.log(`FAIL: ${url} -> ${e.message}`);
      resolve(false);
    });
    ws.on('unexpected-response', (req, res) => {
      console.log(`FAIL (Unexpected): ${url} -> ${res.statusCode}`);
      resolve(false);
    });
  });
}

async function run() {
  await testWS('wss://pokepixel.nietore.com/ws');
  await testWS('wss://pokepixel.nietore.com/socket');
  await testWS('wss://pokepixel.nietore.com/cable');
  await testWS('wss://pokepixel.nietore.com/socket.io/?EIO=4&transport=websocket');
  await testWS('wss://pokepixel.nietore.com/api/v1/ws');
}
run();
