import { app, BrowserWindow, ipcMain, session, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";
import Store from "electron-store";
import { autoUpdater } from "electron-updater";
import { BotSession, AccountConfig } from "../bot/engine";
import { kaLogin, kaRegister, kaUpgrade } from "./auth";
import { ProxyAgent, fetch } from "undici";
import { runApiRegistration, runApiLoginOnly, type RegJob } from "./regbot-api";

let mainWindow: BrowserWindow | null = null;
const sessions = new Map<string, BotSession>();

interface BotBatchEvent {
  logs: any[];
  stats: Record<string, any>;
  captures: any[];
}
const batchData: BotBatchEvent = { logs: [], stats: {}, captures: [] };

setInterval(() => {
  if (batchData.logs.length > 0 || Object.keys(batchData.stats).length > 0 || batchData.captures.length > 0) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("bot:batch-update", {
        logs: [...batchData.logs],
        stats: { ...batchData.stats },
        captures: [...batchData.captures]
      });
    }
    batchData.logs = [];
    batchData.stats = {};
    batchData.captures = [];
  }
}, 500);

function queueEvent(type: "log" | "stats" | "capture-log", data: any) {
  if (type === "log") {
    batchData.logs.push(data);
  } else if (type === "stats") {
    batchData.stats[data.account] = { ...batchData.stats[data.account], ...data };
  } else if (type === "capture-log") {
    batchData.captures.push(data);
  }
}

interface AppState {
  accounts: AccountConfig[];
  mountedRoutes: Record<string, any>;
  regbotHistory: any[];
  settings: {
    theme: string;
    language: string;
    autoStart: boolean;
  };
  auth: {
    authenticated: boolean;
    savedUser: string;
    savedPass: string;
  };
}

const store = new Store<AppState>({
  defaults: {
    accounts: [],
    mountedRoutes: {},
    regbotHistory: [],
    settings: { theme: "dark-amber", language: "pt-BR", autoStart: false },
    auth: { authenticated: false, savedUser: "", savedPass: "" },
  },
});

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 600,
    frame: false,
    show: false,
    backgroundColor: "#0f172a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      sandbox: false,
    },
  });

  if (process.env.NODE_ENV === "development" || process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  mainWindow.on("ready-to-show", () => mainWindow?.show());
}

function registerHandlers(): void {
  ipcMain.on("window:close", () => mainWindow?.close());
  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:maximize-toggle", () => {
    if (mainWindow?.isMaximized()) mainWindow.unmaximize();
    else mainWindow?.maximize();
  });

  ipcMain.handle("accounts:list", () => store.get("accounts", []));
  ipcMain.handle("accounts:save", (_, accounts: AccountConfig[]) => {
    store.set("accounts", accounts);
    return true;
  });

  ipcMain.handle("bot:start", (_, accountName: string) => {
    const accounts = store.get("accounts", []);
    const cfg = accounts.find((a) => a.name === accountName);
    if (!cfg) return false;
    
    if (sessions.has(accountName)) {
      const existing = sessions.get(accountName);
      if (existing) existing.stop();
      sessions.delete(accountName);
    }

    const session = new BotSession(cfg);
    session.on("log", (data) => queueEvent("log", { account: accountName, ...data }));
    session.on("stats", (data) => queueEvent("stats", { account: accountName, ...data }));
    session.on("capture-log", (data) => queueEvent("capture-log", { account: accountName, ...data }));
    sessions.set(accountName, session);
    session.start();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("bot:stats", { account: accountName, ...session.stats() });
    }
    return true;
  });

  ipcMain.handle("bot:stop", (_, accountName: string) => {
    const session = sessions.get(accountName);
    if (session) {
      session.stop();
      sessions.delete(accountName);
    }
    return true;
  });

  ipcMain.handle("bot:start-all", () => {
    const accounts = store.get("accounts", []);
    for (const cfg of accounts) {
      if (cfg.enabled && !sessions.has(cfg.name)) {
        const s = new BotSession(cfg);
        s.on("log", (d: any) => queueEvent("log", { account: cfg.name, ...d }));
        s.on("stats", (d: any) => queueEvent("stats", { account: cfg.name, ...d }));
        s.on("capture-log", (d: any) => queueEvent("capture-log", { account: cfg.name, ...d }));
        sessions.set(cfg.name, s);
        s.start();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send("bot:stats", { account: cfg.name, ...s.stats() });
        }
      }
    }
    return true;
  });

  ipcMain.handle("bot:stop-all", () => {
    for (const [name, s] of sessions) {
      s.stop();
    }
    sessions.clear();
    return true;
  });

  ipcMain.handle("bot:status", () => {
    const status: Record<string, boolean> = {};
    for (const [name, s] of sessions) {
      status[name] = s.connected;
    }
    return status;
  });

  ipcMain.handle("accounts:clear-proxies", () => {
    const accounts = store.get("accounts", []);
    const updated = accounts.map(a => ({ ...a, proxy: "" }));
    store.set("accounts", updated);
    return updated;
  });

  ipcMain.handle("proxy:test", async (_, proxyUrl: string) => {
    try {
      let raw = proxyUrl.trim();
      let url = raw;

      if (!raw.startsWith("http://") && !raw.startsWith("https://") && !raw.startsWith("socks5://") && !raw.startsWith("socks4://")) {
        const parts = raw.split(":");
        if (parts.length === 4) {
          const isSecondPort = /^\d+$/.test(parts[1]);
          const isFourthPort = /^\d+$/.test(parts[3]);
          if (isSecondPort) {
            url = `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`;
          } else if (isFourthPort) {
            url = `http://${parts[0]}:${parts[1]}@${parts[2]}:${parts[3]}`;
          } else {
            url = `http://${raw}`;
          }
        } else if (parts.length === 2 && /^\d+$/.test(parts[1])) {
          url = `http://${parts[0]}:${parts[1]}`;
        } else {
          url = `http://${raw}`;
        }
      }

      const agent = new ProxyAgent(url);
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const options: any = {
        dispatcher: agent,
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: controller.signal
      };
      const res = await fetch("https://pokepixel.nietore.com/api/game/ping", options);
      clearTimeout(timeoutId);
      const latency = Date.now() - start;
      return { success: true, latency };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("settings:get", () => store.get("settings"));
  ipcMain.handle("settings:set", (_, s) => {
    store.set("settings", s);
    return true;
  });

  ipcMain.handle("auth:login", async (_, username: string, password: string) => {
    const result = await kaLogin(username, password);
    if (result.success) store.set("auth.authenticated", true);
    return result;
  });

  ipcMain.handle("auth:register", async (_, username: string, password: string, key: string) => {
    return await kaRegister(username, password, key);
  });

  ipcMain.handle("auth:upgrade", async (_, username: string, password: string, key: string) => {
    return await kaUpgrade(username, password, key);
  });

  ipcMain.handle("auth:check", () => {
    return { success: store.get("auth.authenticated", false) };
  });

  ipcMain.handle("auth:logout", () => {
    store.set("auth.authenticated", false);
    return true;
  });

  ipcMain.handle("auth:get-saved", () => {
    const auth = store.get("auth", { authenticated: false, savedUser: "", savedPass: "" });
    return { user: auth.savedUser, pass: auth.savedPass };
  });

  ipcMain.handle("auth:save-credentials", (_, user: string, pass: string) => {
    store.set("auth.savedUser", user);
    store.set("auth.savedPass", pass);
    return true;
  });

  ipcMain.handle("bot:sell-loot", (_, name: string, opts?: any) => {
    const s = sessions.get(name);
    return s ? s.sellLootFiltered(opts) : null;
  });

  ipcMain.handle("bot:store-pokemon", (_, name: string, pokeId: string) => {
    const s = sessions.get(name);
    return s ? s.storePokemon(pokeId) : null;
  });

  ipcMain.handle("bot:equip-pokemon-id", (_, name: string, pokeId: string) => {
    const s = sessions.get(name);
    return s ? s.equipPokemonId(pokeId) : null;
  });

  ipcMain.handle("bot:buy-max", (_, name: string, itemId: number) => {
    const s = sessions.get(name);
    return s ? s.buyMax(itemId) : null;
  });

  ipcMain.handle("bot:buy-item", (_, name: string, itemId: string | number, qty: number) => {
    const s = sessions.get(name);
    return s ? s.buyItem(Number(itemId), qty) : null;
  });

  ipcMain.handle("bot:start-hunt", (_, name: string, slug?: string) => {
    const s = sessions.get(name);
    if (s) s.startHunt(slug);
    return true;
  });

  ipcMain.handle("bot:stop-hunt", (_, name: string) => {
    const s = sessions.get(name);
    if (s) s.stopHunt();
    return true;
  });

  ipcMain.handle("bot:connect", (_, name: string) => {
    const accounts = store.get("accounts", []);
    const cfg = accounts.find((a) => a.name === name);
    if (!cfg) return false;
    if (sessions.has(name)) return true;
    const s = new BotSession(cfg);
    s.on("log", (d: any) => queueEvent("log", { account: name, ...d }));
    s.on("stats", (d: any) => queueEvent("stats", { account: name, ...d }));
    s.on("capture-log", (d: any) => queueEvent("capture-log", { account: name, ...d }));
    sessions.set(name, s);
    s.start();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("bot:stats", { account: name, ...s.stats() });
    }
    return true;
  });

  ipcMain.handle("bot:claim-streak", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.claimStreak() : null;
  });

  ipcMain.handle("bot:claim-gifts", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.claimGifts() : null;
  });

  ipcMain.handle("bot:claim-bp", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.claimBattlepass() : null;
  });

  ipcMain.handle("bot:claim-all", (_, name: string) => {
    const s = sessions.get(name);
    if (s) s.claimAll();
    return true;
  });

  ipcMain.handle("bot:start-fishing", (_, name: string, tier?: number) => {
    const s = sessions.get(name);
    if (s) s.startFishing(tier);
    return true;
  });

  ipcMain.handle("bot:casino-reroll", (_, name: string, speciesId: number) => {
    const s = sessions.get(name);
    return s ? s.casinoReroll(speciesId) : null;
  });

  ipcMain.handle("bot:get-radar-hits", async () => { return []; });

  ipcMain.handle("bot:scan-shinies", async (_, name: string) => { const s = sessions.get(name); if(s) return s.scanShinies(); return []; });

  ipcMain.handle("bot:set-profession", (_, name: string, profession?: string) => {
    const s = sessions.get(name);
    return s ? s.setProfession(profession) : null;
  });

  ipcMain.handle("bot:rankup-profession", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.rankupProfession() : null;
  });

  ipcMain.handle("bot:equip-pokemon", (_, name: string, species: string, mode?: string, minScore?: number) => {
    const s = sessions.get(name);
    return s ? s.equipPokemon(species, mode, minScore) : null;
  });

  ipcMain.handle("bot:get-pokemons", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getPokemons() : [];
  });

  ipcMain.handle("bot:lock-pokemon-minscore", (_, name: string, minScore?: number) => {
    const s = sessions.get(name);
    return s ? s.lockPokemon(minScore) : null;
  });

  ipcMain.handle("bot:get-inventory", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getInventory() : [];
  });

  ipcMain.handle("bot:get-shop", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getShopItems() : null;
  });

  ipcMain.handle("bot:sync-gold", async (_, name: string) => {
    const s = sessions.get(name);
    if (!s) return 0;
    const profile = await s.httpGet("/api/game/profile");
    if (profile && profile.gold !== undefined) {
      s.gold = profile.gold;
      s.emit("stats", s.stats());
    }
    return s.gold || 0;
  });

  ipcMain.handle("bot:get-listings", (_, name: string, category?: string) => {
    const s = sessions.get(name);
    return s ? s.getListings(category) : [];
  });

  ipcMain.handle("bot:market-list", (_, name: string, refId: string, qty: number, price: number) => {
    const s = sessions.get(name);
    return s ? s.marketListItem(refId, qty, price) : null;
  });

  ipcMain.handle("bot:market-offer", (_, name: string, listingId: string, money: number) => {
    const s = sessions.get(name);
    return s ? s.marketMakeOffer(listingId, money) : null;
  });

  ipcMain.handle("bot:market-accept", (_, name: string, offerId: string) => {
    const s = sessions.get(name);
    return s ? s.marketAcceptOffer(offerId) : null;
  });

  ipcMain.handle("mounted-routes:list", () => {
    return store.get("mountedRoutes", {});
  });

  ipcMain.handle("mounted-routes:save", (_, routes: Record<string, any>) => {
    store.set("mountedRoutes", routes);
    return true;
  });

  ipcMain.handle("mounted-routes:clear", () => {
    store.set("mountedRoutes", {});
    return true;
  });

  ipcMain.handle("accounts:export", async () => {
    const accounts = store.get("accounts", []);
    if (accounts.length === 0) return { success: false, error: "Nenhuma conta para exportar." };
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: "Exportar Contas",
      defaultPath: "contas.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (result.canceled || !result.filePath) return { success: false, error: "Cancelado." };
    try {
      fs.writeFileSync(result.filePath, JSON.stringify(accounts, null, 4), "utf-8");
      return { success: true, path: result.filePath };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("accounts:import", async (_, mode: "merge" | "replace") => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: "Importar Contas",
      filters: [{ name: "JSON", extensions: ["json"] }],
      properties: ["openFile"],
    });
    if (result.canceled || result.filePaths.length === 0) return { success: false, error: "Cancelado." };
    try {
      const data = JSON.parse(fs.readFileSync(result.filePaths[0], "utf-8"));
      if (!Array.isArray(data)) throw new Error("Arquivo nao contem uma lista valida de contas.");
      const existing = store.get("accounts", []);
      let merged: AccountConfig[];
      if (mode === "replace") {
        merged = data;
      } else {
        const existingNames = new Set(existing.map((a) => a.name));
        merged = [...existing];
        for (const acc of data) {
          if (!existingNames.has(acc.name)) {
            merged.push(acc);
            existingNames.add(acc.name);
          }
        }
      }
      store.set("accounts", merged);
      return { success: true, accounts: merged, count: data.length };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle("bot:get-team", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getTeam() : [];
  });

  ipcMain.handle("bot:get-all-pokemon", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getAllPokemon() : [];
  });

  ipcMain.handle("bot:set-leader", (_, name: string, capturedId: string) => {
    const s = sessions.get(name);
    return s ? s.setLeader(capturedId) : null;
  });

  ipcMain.handle("bot:get-depot", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getDepot() : { inventory: [], depot: [], maxSlots: 200 };
  });

  ipcMain.handle("bot:sell-items", (_, name: string, items: {itemId: number, qty: number}[]) => {
    const s = sessions.get(name);
    return s ? s.sellItems(items) : null;
  });

  ipcMain.handle("bot:sell-pokemon", (_, name: string, pokeIds: string[]) => {
    const s = sessions.get(name);
    if (!s) return null;
    return s.sellPokemon(pokeIds);
  });

  ipcMain.handle("bot:evolve-pokemon", async (_, name: string, pokeId: string, useStone: boolean) => {
    const s = sessions.get(name);
    if (!s) return { success: false, message: "Bot not found" };
    return await s.evolvePokemon(pokeId, useStone);
  });

  ipcMain.handle("bot:evolve-pokemon-mass", async (_, name: string, pokeIds: string[], useStone: boolean) => {
    const s = sessions.get(name);
    if (!s) return { successCount: 0 };
    return await s.evolvePokemonMass(pokeIds, useStone);
  });

  ipcMain.handle("bot:lock-pokemon", (_, name: string, capturedId: string, locked: boolean) => {
    const s = sessions.get(name);
    return s ? s.lockPokemon(capturedId, locked) : null;
  });

  ipcMain.handle("bot:toggle-lock-pokemon", (_, name: string, capturedId: string) => {
    const s = sessions.get(name);
    return s ? s.lockPokemon(capturedId, true) : null;
  });

  // ── Refresh token for existing accounts ─────────────────────────────────
  ipcMain.handle("accounts:refresh-token", async (_, { name, email, password }: { name: string; email: string; password: string }) => {
    const BASE = "https://pokepixel.nietore.com";
    try {
      const res = await fetch(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.text();
      let data: any = {};
      try { data = JSON.parse(body); } catch {}
      const token = data.token || data.access_token || "";
      const refreshToken = data.refresh_token || "";
      if (!res.ok || !token) return { success: false, message: data.error?.message || `HTTP ${res.status}` };
      const accounts = store.get("accounts", []);
      const updated = accounts.map((a: any) => a.name === name ? { ...a, token, email, password, refreshToken } : a);
      store.set("accounts", updated);
      const s = sessions.get(name);
      if (s) { s.token = token; s.cfg.token = token; s.cfg.email = email; s.cfg.password = password; s.cfg.refreshToken = refreshToken; }
      return { success: true, token };
    } catch (e: any) {
      return { success: false, message: e.message || "Erro de rede" };
    }
  });

  // ── RegisterBot: persistent account registration history ────────────────
  ipcMain.handle("regbot:history-get", () => {
    return store.get("regbotHistory", []);
  });

  ipcMain.handle("regbot:history-save", (_, history: any[]) => {
    store.set("regbotHistory", history);
    return true;
  });

  // Register a new game account and immediately login to get the JWT token
  ipcMain.handle("regbot:register", async (_, { login, password, nick, trainerName }: {
    login: string; password: string; nick: string; trainerName: string;
  }) => {
    const BASE = "https://pokepixel.nietore.com";
    try {
      // Step 1: Register
      const regRes = await fetch(`${BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login, password, username: nick, trainerName: trainerName || nick }),
        signal: AbortSignal.timeout(20000),
      });
      const regBody = await regRes.text();
      let regData: any = {};
      try { regData = JSON.parse(regBody); } catch {}

      // If registration succeeded or account already exists, try to login
      if (!regRes.ok && !regBody.toLowerCase().includes("already") && !regBody.toLowerCase().includes("exist") && !regBody.toLowerCase().includes("cadastr")) {
        return { success: false, message: `Registro falhou (${regRes.status}): ${regBody.slice(0, 200)}` };
      }

      // Step 2: Login to get JWT
      const loginRes = await fetch(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login, password }),
        signal: AbortSignal.timeout(20000),
      });
      const loginBody = await loginRes.text();
      let loginData: any = {};
      try { loginData = JSON.parse(loginBody); } catch {}

      const token = loginData.token || loginData.accessToken || loginData.access_token || loginData.jwt || "";
      if (!token) {
        return { success: false, message: `Login falhou após registro (${loginRes.status}): ${loginBody.slice(0, 200)}` };
      }
      return { success: true, token };
    } catch (e: any) {
      return { success: false, message: e.message || "Erro de rede" };
    }
  });

  // Login to an existing game account to refresh JWT token
  ipcMain.handle("regbot:login", async (_, { login, password }: { login: string; password: string }) => {
    const BASE = "https://pokepixel.nietore.com";
    try {
      const res = await fetch(`${BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: login, password }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await res.text();
      let data: any = {};
      try { data = JSON.parse(body); } catch {}

      const token = data.token || data.accessToken || data.access_token || data.jwt || "";
      if (!res.ok || !token) {
        return { success: false, message: data.message || data.error || `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      return { success: true, token };
    } catch (e: any) {
      return { success: false, message: e.message || "Erro de rede" };
    }
  });

  // ── Browser-based registration (opens real BrowserWindow) ───────────────
  ipcMain.handle("regbot:run-browser", async (event, { config, delayMs }: { config: any; delayMs: number }) => {
    try {
      const results = await runApiRegistration(
        config,
        delayMs,
        (info) => {
          // Push progress events to renderer
          if (!event.sender.isDestroyed()) {
            try {
              event.sender.send("regbot:progress", info);
            } catch (e) {
              // Ignore disposed frame errors
            }
          }
        }
      );
      return { success: true, results };
    } catch (e: any) {
      return { success: false, message: e.message || "Erro ao iniciar navegador", results: [] };
    }
  });

  // ── Browser-based login (token refresh via BrowserWindow) ───────────────
  ipcMain.handle("regbot:login-browser", async (event, { accounts, delayMs }: {
    accounts: Array<{ login: string; password: string; nick: string; trainerName: string }>;
    delayMs: number;
  }) => {
    try {
      // Re-use runBrowserRegistration but skip the register step — just do login
      const loginJobs: RegJob[] = accounts.map(a => ({
        login: a.login, password: a.password, nick: a.nick, trainerName: a.trainerName,
      }));
      const results = await runApiLoginOnly(
        loginJobs,
        delayMs,
        (info) => {
          if (!event.sender.isDestroyed()) {
            try {
              event.sender.send("regbot:progress", info);
            } catch (e) {
              // Ignore disposed frame errors
            }
          }
        }
      );
      return { success: true, results };
    } catch (e: any) {
      return { success: false, message: e.message || "Erro ao iniciar navegador", results: [] };
    }
  });
}

// Disable automation flags so Cloudflare Turnstile doesn't detect Electron
app.commandLine.appendSwitch('disable-blink-features', 'AutomationControlled');
app.commandLine.appendSwitch('disable-features', 'AutomationControlledEnabled');

app.whenReady().then(() => {
  autoUpdater.checkForUpdatesAndNotify();
  registerHandlers();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  for (const [, s] of sessions) s.stop();
  sessions.clear();
  if (process.platform !== "darwin") app.quit();
});
