// Stealth preload: executed in the renderer BEFORE any page script
// Hides automation fingerprints from Cloudflare Turnstile and other detection scripts

// 1. Hide navigator.webdriver
Object.defineProperty(navigator, 'webdriver', {
  get: () => undefined,
  configurable: true,
});

// 2. Ensure window.chrome exists (Electron doesn't have it by default)
if (!window.chrome) {
  Object.defineProperty(window, 'chrome', {
    value: {
      app: { isInstalled: false, InstallState: {}, RunningState: {} },
      csi: () => {},
      loadTimes: () => {},
      runtime: {},
    },
    configurable: true,
    enumerable: true,
    writable: true,
  });
}

// 3. Hide Notification permission override that Electron uses
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: Notification.permission } as PermissionStatus);
    }
    return originalQuery.call(window.navigator.permissions, parameters);
  };
}

// 4. Fix plugins length (empty plugins array is a bot signal)
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const arr = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];
    Object.defineProperty(arr, 'namedItem', { value: (n: string) => arr.find(p => p.name === n) || null });
    Object.defineProperty(arr, 'item', { value: (i: number) => arr[i] || null });
    return arr;
  },
  configurable: true,
});

// 5. Fix languages
Object.defineProperty(navigator, 'languages', {
  get: () => ['pt-BR', 'pt', 'en-US', 'en'],
  configurable: true,
});
