const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const { exec } = require('child_process');

let mainWindow;

function formatProxyUrl(str) {
  if (!str || !str.trim()) return null;
  let s = str.trim();
  
  if (s.startsWith('http://') || s.startsWith('https://')) {
    return s;
  }
  
  // Formato: host:port:user:pass (ex: brd.superproxy.io:44445:user:pass)
  const parts = s.split(':');
  if (parts.length === 4) {
    const host = parts[0];
    const port = parts[1];
    const user = parts[2];
    const pass = parts[3];
    return `http://${user}:${pass}@${host}:${port}`;
  }

  // Formato: user:pass@host:port
  if (s.includes('@')) {
    return `http://${s}`;
  }
  
  // Formato: host:port
  if (parts.length === 2) {
    return `http://${parts[0]}:${parts[1]}`;
  }
  
  return `http://${s}`;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
    autoHideMenuBar: true
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

ipcMain.on('window-min', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-max', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

app.setAppUserModelId("com.pokepixel.bot");

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC para Requisições HTTP com Suporte a Proxy Real via Node.js
ipcMain.handle('net:request', async (event, { url, method = 'GET', data = null, headers = {}, proxyUrl = null }) => {
  try {
    const reqHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Content-Type': 'application/json',
      ...headers
    };

    const config = {
      url,
      method,
      data,
      headers: reqHeaders,
      validateStatus: () => true,
      timeout: 20000,
      proxy: false
    };

    const formattedProxy = formatProxyUrl(proxyUrl);
    if (formattedProxy) {
      const agent = new HttpsProxyAgent(formattedProxy);
      config.httpsAgent = agent;
      config.httpAgent = agent;
    }

    const response = await axios(config);
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (err) {
    return {
      status: 500,
      error: err.message,
      data: null
    };
  }
});

ipcMain.handle('bot:test', () => {
  return "Bot engine rodando do absoluto ZERO!";
});

// IPC para abrir o jogo no navegador com auto-login
ipcMain.handle('browser:open-with-token', async (event, { token, email, password }) => {
  const { session } = require('electron');
  const gameSession = session.fromPartition('persist:pokepixel-game');

  const gameWin = new BrowserWindow({
    width: 1366,
    height: 768,
    title: 'PokePixel - Jogo',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false, // needed for executeJavaScript access to page DOM
      session: gameSession,
      webSecurity: false
    }
  });

  gameWin.setMenu(null);

  // Inject Bearer token on all API requests (backup auth for API calls)
  gameSession.webRequest.onBeforeSendHeaders(
    { urls: ['https://pokepixel.nietore.com/api/*'] },
    (details, callback) => {
      const headers = { ...details.requestHeaders };
      if (!headers['Authorization'] && !headers['authorization']) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      callback({ requestHeaders: headers });
    }
  );

  // Auto-login: after the login page loads, fill the form and click Entrar
  gameWin.webContents.on('did-finish-load', async () => {
    const url = gameWin.webContents.getURL();
    // Only auto-fill if we're on the login/play page (not already in the game)
    if (url.includes('/play') || url.includes('/login')) {
      try {
        await gameWin.webContents.executeJavaScript(`
          (function() {
            // Function to attempt filling the form
            function tryFillLogin() {
              const inputs = Array.from(document.querySelectorAll('input'));
              if (inputs.length < 2) return false; // Form not rendered yet

              // Password is easy
              const passInput = inputs.find(i => i.type === 'password');
              
              // Login/Email is usually the text/email input just before the password
              // Or we can just grab the first text/email input we find
              const emailInput = inputs.find(i => 
                i.name === 'login' || 
                i.name === 'email' || 
                i.id === 'login' || 
                i.type === 'email' || 
                (i.type === 'text' && !i.readOnly)
              );

              if (emailInput && passInput) {
                // Use native input value setter so React/Vue state is updated
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                
                nativeInputValueSetter.call(emailInput, ${JSON.stringify(email)});
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('change', { bubbles: true }));

                nativeInputValueSetter.call(passInput, ${JSON.stringify(password)});
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                passInput.dispatchEvent(new Event('change', { bubbles: true }));

                // Find and click the submit button
                setTimeout(() => {
                  const btn = Array.from(document.querySelectorAll('button')).find(b =>
                    b.textContent.trim().toLowerCase().includes('entrar') ||
                    b.type === 'submit'
                  );
                  if (btn) btn.click();
                }, 500);

                console.log('[PokePixelBot] Auto-login preenchido com sucesso!');
                return true;
              }
              return false;
            }

            // The form might take a moment to render if it's a SPA (React/Vue)
            if (!tryFillLogin()) {
              const observer = new MutationObserver((mutations, obs) => {
                if (tryFillLogin()) {
                  obs.disconnect(); // Stop observing once we filled the form
                }
              });
              observer.observe(document.body, { childList: true, subtree: true });
              
              // Fallback timeout to stop observing after 10s
              setTimeout(() => observer.disconnect(), 10000);
            }
          })();
        `);
      } catch (e) {
        console.error('Auto-login error:', e.message);
      }
    }
  });

  // Redirect from landing page to play
  gameWin.webContents.on('did-navigate', async (event, url) => {
    if (url === 'https://pokepixel.nietore.com/' || url === 'https://pokepixel.nietore.com') {
      await gameWin.loadURL('https://pokepixel.nietore.com/play/');
    }
  });

  await gameWin.loadURL('https://pokepixel.nietore.com/play/');

  gameWin.on('closed', () => {
    try { gameSession.webRequest.onBeforeSendHeaders(null); } catch {}
  });

  return true;
});


// --- KEYAUTH IPC HANDLERS ---
ipcMain.handle("system:hwid", () => {
  const data = [
    os.hostname(),
    os.type(),
    os.arch(),
    os.release(),
    os.totalmem().toString(),
    os.cpus().map(c => c.model).join("")
  ].join("|");
  return crypto.createHash("sha256").update(data).digest("hex");
});

ipcMain.handle("system:app-version", () => app.getVersion());

ipcMain.handle("system:keyauth-request", async (_, url) => {
  try {
    const res = await net.fetch(url, { headers: { "User-Agent": "KeyAuth-Electron-App" } });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { success: false, message: "Resposta inválida do servidor." };
    }
  } catch (e) {
    return { success: false, message: "Erro de conexão (Main Process)." };
  }
});

ipcMain.on("updates:keyauth-start", async (e, url) => {
  let dest = null;
  try {
    mainWindow?.webContents.send("updates:keyauth-progress", "Preparando download...", 0);
    const res = await net.fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const contentLength = Number(res.headers.get("content-length")) || 0;
    const destPath = path.join(app.getPath("temp"), `Update-PokePixel-${Date.now()}.exe`);
    dest = fs.createWriteStream(destPath);
    
    let downloaded = 0;
    let lastEmit = Date.now();

    if (res.body) {
      const reader = res.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          downloaded += value.length;
          dest.write(value);
          
          const now = Date.now();
          if (now - lastEmit > 50) { 
            lastEmit = now;
            const pct = contentLength ? (downloaded / contentLength) * 100 : 0;
            mainWindow?.webContents.send("updates:keyauth-progress", `Baixando atualização... ${(downloaded / 1024 / 1024).toFixed(1)}MB`, pct);
          }
        }
      }
    }
    
    dest.end();
    dest.on('finish', () => {
      mainWindow?.webContents.send("updates:keyauth-progress", "Instalando nova versão...", 100);
      exec(`"${destPath}"`, (err) => {
        if (err) console.error("Error executing update:", err);
      });
      setTimeout(() => app.quit(), 2000);
    });
  } catch (error) {
    console.error("Update error:", error);
    mainWindow?.webContents.send("updates:keyauth-progress", "Erro ao atualizar. Tente baixar manualmente.", 0);
  }
});


