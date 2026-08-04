import Module from "module";
const originalRequire = (Module.prototype as any).require;
(Module.prototype as any).require = function (path: string) {
  if (path === "electron-store") {
    return class Store {
      get() { return null; }
      set() {}
      has() { return false; }
    };
  }
  if (path === "electron") {
    return { app: { isPackaged: false, getPath: () => "" } };
  }
  return originalRequire.apply(this, arguments);
};

import { Engine } from "./src/bot/engine";
const EMAIL = "damdam5";
const PASSWORD = "Vd522431";
const BASE_URL = "https://pokepixel.nietore.com";

async function login() {
  console.log(`[TESTE] Fazendo login como ${EMAIL}...`);
  const r = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: EMAIL, password: PASSWORD }),
  });
  const data = await r.json() as any;
  const token = data.access_token || data.token || data.accessToken;
  if (!token) {
    console.error("[ERRO] Login falhou:", JSON.stringify(data));
    process.exit(1);
  }
  return token;
}

(async () => {
  const token = await login();

  // Use a minimal config for the hunt test
  const cfg = {
    hunt: "hunt_abra",
    route_enabled: false,
    route_obey_always: false
  };
  
  const sellCfg = {
    sell_categories: ["loot"],
    catch_ball_id: 4,
    shiny_ball_id: 5
  };

  const engine = new Engine("damdam5", { token }, cfg, sellCfg);

  engine.on("log", (msg) => {
    console.log(`[BOT LOG] ${msg.type.toUpperCase()}: ${msg.message}`);
  });
  
  engine.on("stats", (stats) => {
    console.log(`[BOT STATS] InHunt: ${stats.inHunt}, Kills: ${stats.kills}, Captures: ${stats.captures}`);
  });
  
  engine.on("capture-log", (data) => {
    console.log(`[BOT CAPTURE] Capturou: ${JSON.stringify(data.pk?.speciesName || data.pk)}`);
  });

  console.log("Starting engine...");
  engine.start();

  // Test the startHunt manually after a few seconds
  setTimeout(() => {
     console.log("Forcing startHunt(hunt_abra) just to be sure...");
     engine.startHunt("hunt_abra");
  }, 5000);

  // Stop after 30 seconds
  setTimeout(() => {
     console.log("Test finished. Kills recorded:", engine.kills);
     process.exit(0);
  }, 30000);
})();
