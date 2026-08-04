import fs from 'fs';
import vm from 'vm';

const js = fs.readFileSync('WebSocketClient.js', 'utf8');

const sandbox = {
  window: { 
    location: { protocol: 'https:', host: 'pokepixel.nietore.com', pathname: '/play/', search: '' },
    addEventListener: () => {}
  },
  document: { currentScript: { src: '' }, addEventListener: () => {} },
  console: { log: console.log, warn: console.log, error: console.log },
  WebSocket: class {
    constructor(url) {
      console.log('WEBSOCKET CREATED:', url);
    }
    addEventListener() {}
    send() {}
  },
  PluginManager: { registerParameters: () => {}, parameters: () => ({ apiBaseUrl: '/api/v1', wsBaseUrl: '' }) },
  AuthManager: { getToken: () => 'MY_FAKE_TOKEN' },
  Utils: { isNwjs: () => false },
  navigator: { userAgent: 'Mozilla/5.0' },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval
};

vm.createContext(sandbox);

try {
  vm.runInContext(js, sandbox);
  // See if we can call connect
  if (sandbox.WebSocketClient && typeof sandbox.WebSocketClient.connect === 'function') {
    console.log('Calling WebSocketClient.connect()...');
    sandbox.WebSocketClient.connect().catch(e => console.log('Connect error:', e));
  } else {
    console.log('WebSocketClient not found globally.');
    // Maybe it's registered somewhere else
    console.log(Object.keys(sandbox));
  }
} catch (e) {
  console.log('Eval error:', e.message);
}
