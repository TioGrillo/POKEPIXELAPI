import WebSocket from "ws";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ProxyAgent, fetch } from "undici";
import type { AccountConfig, SellConfig, BotStats, RouteRule } from "../shared/types";
import Store from "electron-store";

export type { AccountConfig, SellConfig, BotStats, RouteRule };

const globalStore = new Store();

const BASE_URL = "https://pokepixel.nietore.com";
const WS_BASE = "wss://pokepixel.nietore.com/api/v1/ws";

const BALL_NAMES: Record<number, string> = {
  1: "Poke Ball", 2: "Great Ball", 3: "Super Ball",
  4: "Ultra Ball", 5: "Master Ball", 6: "Idle Ball",
};

const RARITY_MAP: Record<string, string> = {
  weak: "fraca", common: "comum", uncommon: "incomum",
  rare: "rara", epic: "epica", legendary: "lendaria",
};

function djb2Hash(str: string): number {
  let r = 5381;
  for (let i = 0; i < str.length; i++) {
    r = ((r << 5) + r + str.charCodeAt(i)) | 0;
  }
  return r;
}

function getWsUrl(token: string): string {
  try {
    const parts = token.split(".");
    if (parts.length >= 2) {
      const payload = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
      const sub = String(data.sub || "");
      if (sub) {
        const shard = Math.abs(djb2Hash(sub)) % 40;
        return shard > 0 ? `${WS_BASE}?shard=${shard}` : WS_BASE;
      }
    }
  } catch {}
  return WS_BASE;
}

function ts(): string {
  return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function fakeHeaders(name: string) {
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = (min: number, max: number) => min + (seed * 9301 + 49297) % 233280 % (max - min + 1);
  const ip = `${rand(11, 250)}.${rand(11, 250)}.${rand(11, 250)}.${rand(11, 250)}`;
  const ua = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/${rand(110, 126)}.0.0.0 Safari/537.36`;
  return { ip, ua };
}

export class BotSession extends EventEmitter {
  public userStartedHunt: boolean = false;
  cfg: AccountConfig;
  name: string;
  token: string;
  proxy?: string;
  sellCfg: SellConfig;

  kills = 0;
  captures = 0;
  shiny = 0;
  xp = 0;
  gold = 0;
  heroHp = 1;
  heroMaxHp = 1;
  heroLevel = 1;
  private _evolutionCheckPending = false;
  private _lacksEvolutionStone = false;
  private _lastLeaderId: string | null = null;
  heroXpPct = 0;
  sessionStart = Date.now();
  ws: WebSocket | null = null;
  running = false;
  inHunt = false;
  huntSlug: string | null = null;
  pokeList: any[] = [];
  isVip = false;
  ballCounts: Record<string, number> = {};
  team: any[] = [];
  boosts: any[] = [];
  connected = false;
  lootGold = 0;
  supplyGold = 0;
  ballsUsed = 0;
  lootDrops: Record<string, { qty: number; gold: number }> = {};
  itemPrices: Record<string, number> = {
    Straw: 15, "Rubber Ball": 10, Feather: 20, "Colored Feather": 45,
    Rock: 15, "Hard Rock": 35, Magnet: 20, Leaves: 15, Seed: 10,
  };
  private _cachedHunts: any[] | null = null;
  private _lock = false;
  private _lastCatchTs = 0;
  private _lastDeltaPoke: any = null;
  private _lastCatchInfo: any = null;
  private _healingInProgress = false;
  private _evolutionInProgress = false;
  private _sellingLootInProgress = false;
  private _sessionXp = 0;
  private _startXp: number | null = null;
  private _startGold: number | null = null;
  private _pendingQueue: any[] = [];
  private _thrownPids = new Set<string | number>();
  private _catchWorkerRunning = false;
  private _routeIdx = 0;
  private _routeKills = 0;
  private _routeCaptures = 0;
  private _lastShinySpecies: string | null = null;
  private _lastShinyTime = 0;

  constructor(cfg: AccountConfig) {
    super();
    this.setMaxListeners(0);
    this.cfg = cfg;
    this.name = cfg.name;
    this.token = cfg.token;
    this.proxy = cfg.proxy;
    this.sellCfg = cfg.sell_config;
  }

  log(level: string, msg: string) {
    this.emit("log", { level, msg: `[${ts()}] [${this.name}] [${level}] ${msg}` });
  }

  info(msg: string) { this.log("INFO", msg); }
  ok(msg: string) { this.log("OK", msg); }
  warn(msg: string) { this.log("WARN", msg); }
  err(msg: string) { this.log("ERR", msg); }
  klog(msg: string) { this.log("KILL", msg); }
  clog(msg: string) { this.log("CATCH", msg); }
  lulog(msg: string) { this.log("LVLUP", msg); }

  stats(): BotStats {
    const uptime = Math.floor((Date.now() - this.sessionStart) / 1000);
    const hours = uptime / 3600 || 1;
    let passiveXp = 0;
    if (this._startXp !== null) {
      passiveXp = (this.xp - this._startXp) - this._sessionXp;
      if (passiveXp < 0) passiveXp = 0;
    }

    return {
      kills: this.kills, captures: this.captures, shiny: this.shiny,
      xp: this.xp, gold: this.gold,
      heroHp: this.heroHp, heroMaxHp: this.heroMaxHp,
      heroLevel: this.heroLevel, heroXpPct: this.heroXpPct,
      inHunt: this.inHunt, huntSlug: this.huntSlug,
      uptime, kph: Math.round(this.kills / hours),
      gph: Math.round(this.lootGold / hours),
      xph: Math.round((this._sessionXp + passiveXp) / hours),
      passiveXp,
      lootGold: this.lootGold, supplyGold: this.supplyGold,
      ballsUsed: this.ballsUsed, ballCounts: { ...this.ballCounts },
      lootDrops: { ...this.lootDrops },
      team: [...this.team], boosts: [...this.boosts],
      connected: this.connected,
      leaderSlug: (() => { const l = this.pokeList.find((p: any) => p.leader); return l ? (l.pokemon || l.species || l.name) : null; })() || null,
    };
  }

  private _cachedProxyStr?: string;
  private _cachedHttpsAgent?: HttpsProxyAgent<string>;

  private getProxyUrl(): string | undefined {
    if (!this.proxy || !this.proxy.trim()) return undefined;
    let raw = this.proxy.trim();
    if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("socks5://") || raw.startsWith("socks4://")) {
      return raw;
    }
    const parts = raw.split(":");
    if (parts.length === 4) {
      const isSecondPort = /^\d+$/.test(parts[1]);
      const isFourthPort = /^\d+$/.test(parts[3]);
      if (isSecondPort) {
        const [ip, port, user, pass] = parts;
        return `http://${user}:${pass}@${ip}:${port}`;
      } else if (isFourthPort) {
        const [user, pass, ip, port] = parts;
        return `http://${user}:${pass}@${ip}:${port}`;
      }
    } else if (parts.length === 2 && /^\d+$/.test(parts[1])) {
      return `http://${parts[0]}:${parts[1]}`;
    }
    return raw.includes("://") ? raw : `http://${raw}`;
  }

  private getHttpsProxyAgent(): HttpsProxyAgent<string> | undefined {
    const proxyUrl = this.getProxyUrl();
    if (!proxyUrl) {
      this._cachedHttpsAgent = undefined;
      this._cachedProxyStr = undefined;
      return undefined;
    }
    if (this._cachedProxyStr !== proxyUrl || !this._cachedHttpsAgent) {
      this._cachedProxyStr = proxyUrl;
      this._cachedHttpsAgent = new HttpsProxyAgent(proxyUrl);
      this.info(`[PROXY] Agente criado: ${proxyUrl.replace(/\/\/.*@/, "//***@")}`);
    }
    return this._cachedHttpsAgent;
  }

  private getUndiciProxyAgent(): ProxyAgent | undefined {
    const proxyUrl = this.getProxyUrl();
    if (!proxyUrl) return undefined;
    try {
      return new ProxyAgent(proxyUrl);
    } catch {
      return undefined;
    }
  }

  public async httpGet(path: string): Promise<any> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    const h = fakeHeaders(this.name);
    headers["User-Agent"] = h.ua;
    headers["X-Forwarded-For"] = h.ip;
    headers["Referer"] = `${BASE_URL}/play`;

    try {
      const url = `${BASE_URL}${path}`;
      const options: any = { headers };
      const agent = this.getUndiciProxyAgent();
      if (agent) {
        options.dispatcher = agent;
      }
      const res = await fetch(url, options);
      if (res.ok) {
        const txt = await res.text();
        try { return JSON.parse(txt); } catch { this.err(`HTTP GET ${path} resposta nao e JSON: ${txt.substring(0, 200)}`); return null; }
      }
      const body = await res.text().catch(() => "");
      const errBody = body.startsWith("<") ? body.substring(0, 80) + "..." : body.substring(0, 200);
      this.err(`HTTP GET ${path} falhou: ${res.status} ${res.statusText} | ${errBody}`);
    } catch (e) {
      this.err(`HTTP GET error: ${e}`);
    }
    return null;
  }

  private async httpPost(path: string, body: any): Promise<any> {
    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.token}`,
      "Content-Type": "application/json",
    };
    const h = fakeHeaders(this.name);
    headers["User-Agent"] = h.ua;
    headers["X-Forwarded-For"] = h.ip;
    headers["Referer"] = `${BASE_URL}/play`;

    try {
      const url = `${BASE_URL}${path}`;
      const options: any = { method: "POST", headers, body: JSON.stringify(body) };
      const agent = this.getUndiciProxyAgent();
      if (agent) {
        options.dispatcher = agent;
      }
      const res = await fetch(url, options);
      if (res.ok) return await res.json();
      const text = await res.text();
      const errText = text.startsWith("<") ? text.substring(0, 80) + "..." : text.substring(0, 200);
      this.err(`HTTP POST falhou em ${path}: ${res.status} - ${errText}`);
    } catch (e) {
      this.err(`HTTP POST error: ${e}`);
    }
    return null;
  }

  private async resolveHuntSlug(huntName: string): Promise<string> {
    const hl = huntName.toLowerCase().trim();
    if (!this._cachedHunts) {
      const data = await this.httpGet("/api/v1/map-markers");
      this._cachedHunts = data?.hunts || [];
    }
    if (this._cachedHunts) {
      for (const h of this._cachedHunts) {
        if (h.slug === hl || h.name?.toLowerCase() === hl) return h.slug;
      }
      for (const h of this._cachedHunts) {
        if (h.slug?.includes(hl) || h.name?.toLowerCase().includes(hl)) return h.slug;
      }
    }
    return hl;
  }

  private isTokenExpired(): boolean {
    try {
      const parts = this.token.split(".");
      if (parts.length < 2) return true;
      const payload = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
      const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
      const exp = data.exp;
      if (!exp) return true;
      return Date.now() >= (exp - 120) * 1000;
    } catch {
      return true;
    }
  }

  private async refreshToken(): Promise<boolean> {
    const email = this.cfg.email;
    const password = this.cfg.password;
    if (!email || !password) {
      this.err("Sem email/senha pra renovar token. Configure na aba de conta.");
      return false;
    }
    try {
      const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email, password }),
        signal: AbortSignal.timeout(15000),
      });
      const body: any = await res.json().catch(() => ({}));
      const newToken = body.access_token || body.token || "";
      if (!res.ok || !newToken) {
        this.err(`Refresh token falhou (${res.status}): ${JSON.stringify(body).substring(0, 200)}`);
        return false;
      }
      this.token = newToken;
      this.cfg.token = newToken;

      const accounts = globalStore.get("accounts", []) as any[];
      const idx = accounts.findIndex((a: any) => a.name === this.name);
      if (idx >= 0) {
        accounts[idx].token = newToken;
        globalStore.set("accounts", accounts);
      }

      this.ok("Token renovado com sucesso");
      return true;
    } catch (e: any) {
      this.err(`Refresh token erro: ${e.message}`);
      return false;
    }
  }

  async setup() {
    this.info(`Iniciando: ${this.name}`);

    if (this.isTokenExpired()) {
      this.warn("Token expirado ou invalido, renovando...");
      const ok = await this.refreshToken();
      if (!ok) {
        this.err("Nao foi possivel renovar o token. Bot nao ira funcionar.");
        return;
      }
    }

    const autoHelper = await this.httpGet("/api/v1/auto-helper");
    if (autoHelper) {
      this.isVip = autoHelper.isVip || false;
      for (const b of autoHelper.balls || []) {
        const id = b.id ?? b.itemId;
        if (id !== undefined && (b.quantity !== undefined || b.count !== undefined)) {
          this.ballCounts[String(id)] = b.quantity ?? b.count;
        }
      }
      this.ok(`${this.isVip ? "VIP" : "Free"} | AutoCatch: ${autoHelper.autoCatch ? "ON" : "OFF"}`);
    }

    const profile = await this.httpGet("/api/v1/profile");
    if (profile) {
      this.gold = profile.gold || 0;
      this.info(`Nivel: ${profile.level} | Rank: #${profile.rank} | Gold: ${this.gold}`);
    }

    const depot = await this.httpGet("/api/v1/depot");
    if (depot) {
      for (const item of depot.inventory || []) {
        const price = item.sellPrice || item.price || 0;
        if (price > 0) this.itemPrices[item.name] = price;
      }
    }

    this.emit("stats", this.stats());
  }

  private async syncConfig() {
    const payload: any = {
      autoPotionThreshold: this.cfg.auto_potion_pct || 80,
      autoPotionItemId: 0,
    };
    if (this.isVip) {
      const sCfg = this.cfg.sell_config || {};
      payload.autoCatch = sCfg.auto_catch !== false;
      payload.autoCatchShiny = sCfg.keep_shiny !== false;
      payload.autoCatchBallId = sCfg.catch_ball_id || 4;
      payload.autoCatchShinyBallId = sCfg.shiny_ball_id || 5;
      payload.autoCatchNames = "";
      payload.autoPotion = this.cfg.auto_potion !== false;
      payload.autoRevive = this.cfg.auto_revive !== false;
    } else {
      payload.autoCatch = false;
      payload.autoPotion = false;
      payload.autoRevive = false;
    }
    this.wsSend("set-config", payload);
  }

  async start() {
    this.running = true;
    await this.setup();
    this.emit("stats", this.stats());
    this.connect();
  }

  stop() {
    this.running = false;
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    if ((this as any)._ballsInterval) {
      clearInterval((this as any)._ballsInterval);
    }
    this.connected = false;
    this.emit("stats", this.stats());
    this.removeAllListeners();
  }

  private connect() {
    const baseWsUrl = getWsUrl(this.token);
    const cmid = randomUUID().replace(/-/g, "");
    const separator = baseWsUrl.includes("?") ? "&" : "?";
    const url = `${baseWsUrl}${separator}token=${this.token}&cmid=${cmid}`;
    this.info(`Conectando WS: ${baseWsUrl}`);

    const headers: Record<string, string> = {};
    const h = fakeHeaders(this.name);
    headers["User-Agent"] = h.ua;
    headers["Origin"] = BASE_URL;

    const wsAgent = this.getHttpsProxyAgent();
    const wsOptions: any = { headers };
    if (wsAgent) {
      wsOptions.agent = wsAgent;
    }

    this.ws = new WebSocket(url, wsOptions);

    this.ws.on("open", () => this.onOpen());
    this.ws.on("message", (data) => this.onMessage(data.toString()));
    this.ws.on("close", (code) => this.onClose(code));
    this.ws.on("error", (err) => {
      const msg = err.message || String(err);
      if (msg.includes("401")) {
        this.err(`WS Erro: Autenticacao falhou (401). Token pode estar expirado.`);
      } else {
        this.err(`WS Erro: ${msg}`);
      }
      if (wsAgent) {
        this.err(`Proxy: ${this.proxy}`);
      }
    });
  }

  private async onOpen() {
    this.connected = true;
    this.ok("WebSocket conectado!");
    this.wsSend("pokes-get");
    this.wsSend("history-get");
    this.wsSend("boosts-get");
    if (this.cfg.auto_sleep !== false) {
      this.wsSend("sleep-mode");
    }
    this.wsSend("inv-get");
    this.wsSend("boosts-refresh");
    await this.syncConfig();
    this.info("Conectado e aguardando inicio de hunt.");
    this.emit("stats", this.stats());

    if (!(this as any)._ballsInterval) {
      (this as any)._ballsInterval = setInterval(() => {
        if (this.connected && this.ws) {
          this.wsSend("balls-get");
        }
      }, 30000);
    }
  }

  private onMessage(raw: string) {
    try {
      const msg = JSON.parse(raw);
      const t = msg.type || "";
      this.handleMessage(t, msg);
    } catch {}
  }

  private onClose(code: number) {
    this.connected = false;
    this.inHunt = false;
    
    if (code === 4001 || code === 4003) {
      this.err(`Sessão expirada ou token inválido (Código ${code}). Parando bot para esta conta. Atualize o token!`);
      this.running = false;
      this.emit("stats", this.stats());
      return;
    }

    if (this.running) {
      this.warn(`WS fechado [${code}], reconectando em 5s...`);
      setTimeout(async () => {
        if (!this.running) return;
        if (this.isTokenExpired()) {
          this.warn("Token expirado, renovando antes de reconectar...");
          await this.refreshToken();
        }
        this.connect();
      }, 5000);
    }
  }

  private wsSend(type: string, data: Record<string, any> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type, ...data })); } catch {}
    }
  }

  private handleMessage(t: string, msg: any) {
    switch (t) {
      case "pokes":
        this.pokeList = msg.list || [];
        for (const p of this.pokeList) {
          p.score = Math.round((p.quality || 0) * (p.ivTotal || 0) * 10) / 10;
        }
        this.team = this.pokeList.filter((p: any) => p.leader || p.team);
        const leader = this.pokeList.find((p: any) => p.leader);
        if (leader) {
          if (this._lastLeaderId !== leader.id) {
            this._lastLeaderId = leader.id;
            this._lacksEvolutionStone = false;
          }
          this.heroHp = leader.hp || 0;
          this.heroMaxHp = leader.maxHp || 1;
          if (leader.level) this.heroLevel = leader.level;
          if (leader.xp !== undefined) {
            this.xp = leader.xp;
            if (this._startXp === null) {
              this._startXp = leader.xp;
            }
          }
        } else {
          this.equipBestPokemon();
        }

        if (!this.isVip && this.cfg.auto_potion !== false && this.running && this.heroHp > 0) {
            const pct = (this.heroHp / this.heroMaxHp) * 100;
            const threshold = this.cfg.auto_potion_pct || 80;
            if (pct <= threshold && !(this as any)._potionCooldown) {
                (this as any)._potionCooldown = true;
                setTimeout(() => { (this as any)._potionCooldown = false; }, 2500);
                const pId = (this.cfg as any).auto_potion_item_id || 201;
                this.wsSend("use-heal", { itemId: pId });
            }
        }

          if (this.heroHp <= 0 && this.running && !this._healingInProgress && !this._sellingLootInProgress) {
            this.healAndReturn();
          }
        this.checkRoutes();
        break;

      case "field-kill":
        this.kills++;
        this.xp += msg.xpGained || 0;
        this._sessionXp += msg.xpGained || 0;
        
        let lootStr = "";
        const lootArr = msg.loot || [];
        for (const loot of lootArr) {
          const name = loot.name || "?";
          const qty = loot.qty || 0;
          const gold = loot.totalGold || loot.gold || this.itemPrices[name] * qty || 0;
          if (!this.lootDrops[name]) this.lootDrops[name] = { qty: 0, gold: 0 };
          this.lootDrops[name].qty += qty;
          this.lootDrops[name].gold += gold;
          this.lootGold += gold;
        }
        
        if (msg.shiny) {
          this._lastShinySpecies = msg.speciesName;
          this._lastShinyTime = Date.now();
        }

        this.klog(`Kill #${this.kills} ${msg.shiny ? "[SHINY] " : ""}${msg.speciesName || "?"} | +${msg.xpGained || 0}xp`);
        if (msg.leveledUp) {
          this.heroLevel = msg.newLevel || this.heroLevel + 1;
          this.lulog(`Subiu para nivel ${this.heroLevel}!`);
          this.checkEvolution().then((evolving) => {
            if (!evolving) this.checkRoutes();
          });
        }
        if (this.kills % 300 === 0) this.wsSend("pokes-get");
        if (this.kills % (this.cfg.sell_loot_every_kills || 50) === 0) {
          this.doSellLoot();
        }
        break;

      case "pending":
        const pending = msg.list || [];
        if (pending.length > 0) this.processPending(pending);
        break;

      case "catch-result": {
        const success = msg.success || false;
        const pk = msg.poke || msg.pokemon || msg.entry || msg.data || msg;
        const species = msg.speciesName || pk.speciesName || pk.name || "?";
        let shiny = msg.shiny || pk.shiny || false;
        
        let bid = msg.ballId;
        
        // Compensate for server occasionally missing the shiny flag
        if (!shiny && this._lastShinySpecies && species === this._lastShinySpecies && Date.now() - this._lastShinyTime < 15000) {
          shiny = true;
        }

        if (!bid) {
          bid = shiny ? (this.sellCfg.shiny_ball_id || 5) : (this.sellCfg.catch_ball_id || 4);
        }
        
        const count = this.ballCounts[String(bid)] || 0;
        if (count > 0) {
          this.ballCounts[String(bid)] = count - 1;
        }
        this.ballsUsed++;

        if (success) {
          this.captures++;
          if (shiny) this.shiny++;
          this.clog(`Capturou ${shiny ? "[SHINY] " : ""}${species}`);
          this.emit("capture-log", { pk, escaped: false });
        } else {
          this.info(`${shiny ? "[SHINY] " : ""}${species} escapou`);
          if (shiny) {
            this.emit("capture-log", { pk, escaped: true });
          }
        }
        break;
      }

      case "poke-delta": {
        const pk = msg.poke || {};
        if (pk.id) {
          pk.score = Math.round((pk.quality || 0) * (pk.ivTotal || 0) * 10) / 10;
          const idx = this.pokeList.findIndex((p: any) => p.id === pk.id);
          if (idx >= 0) this.pokeList[idx] = pk;
          else this.pokeList.push(pk);
          if (pk.leader) {
            this.heroHp = pk.hp || this.heroHp;
            if (pk.maxHp) this.heroMaxHp = pk.maxHp;
            if (pk.level) this.heroLevel = pk.level;
          }
        }
        break;
      }

      case "balls": {
        const counts = msg.counts || msg.list || msg.balls;
        if (Array.isArray(counts)) {
          const newCounts: Record<string, number> = {};
          for (const b of counts) {
            const id = b.id ?? b.itemId;
            if (id !== undefined && (b.quantity !== undefined || b.count !== undefined)) {
              newCounts[String(id)] = b.quantity ?? b.count;
            }
          }
          this.ballCounts = newCounts;
        } else if (typeof counts === "object") {
          this.ballCounts = counts;
        }
        break;
      }

      case "field-teleport-city":
        this.warn("Heroi desmaiou! Teleportado para cidade.");
        this.heroHp = 0;
        this.inHunt = false;
        this.healAndReturn();
        break;

      case "error":
        if (msg.message?.includes("desmaiado")) {
          this.warn(`Erro: ${msg.message}`);
          this.heroHp = 0;
          this.healAndReturn();
        }
        break;

      case "field-init":
        this.ok(`Campo iniciado! ${msg.mobs?.length || 0} mobs.`);
        break;

      case "field-none":
        this.info(`Campo não encontrado: ${msg.slug}`);
        break;

      case "hunt-cooldown":
        this.info(`Cooldown: ${msg.ms}ms`);
        break;

      case "auto-heal":
        this.info(`Auto-heal: ${msg.kind} ${msg.name || ""}`);
        break;

        case "poke-xp": {
          const oldLevel = this.heroLevel;
          if (msg.poke) {
            const p = msg.poke;
            if (p.level) this.heroLevel = p.level;
          }
          if (msg.leveledUp || this.heroLevel > oldLevel) {
            this.lulog(`Subiu para nivel ${this.heroLevel}!`);
            this.checkEvolution().then((evolving) => {
              if (!evolving) this.checkRoutes();
            });
          } else {
            this.checkRoutes();
          }
          break;
        }

      case "boosts":
        this.boosts = msg.boosts || msg.list || [];
        break;

      case "shiny-global":
        this.clog(`[GLOBAL] ${msg.playerName || "?"} capturou SHINY ${msg.speciesName || "?"}!`);
        break;

      case "joy-healed":
        this.ok("Curado na Joy!");
        break;

      case "sleep-ok":
        if (this.cfg.auto_sleep !== false) {
           this.ok("Modo soneca ativado (Farm Offline ON + Hunt Simultanea)!");
        }
        break;
    }

    this.emit("stats", this.stats());
  }

  private processPending(pendingList: any[]) {
    if (!this.sellCfg.auto_catch) return;
    
    const currentIds = this._pendingQueue.map(p => p.pendingId || p.id);
    for (const p of pendingList) {
      const pid = p.pendingId || p.id;
      if (!currentIds.includes(pid)) {
        this._pendingQueue.push(p);
      }
    }
    
    if (!this._catchWorkerRunning) {
      this._catchWorkerRunning = true;
      this._startCatchWorker();
    }
  }

  private _bestShinyBall(): number {
    const priority = [5, 4, 3, 2, 1];
    for (const bid of priority) {
      if ((this.ballCounts[String(bid)] || 0) > 0) return bid;
    }
    for (const bid in this.ballCounts) {
      if (this.ballCounts[bid] > 0) return Number(bid);
    }
    return this.sellCfg.catch_ball_id || 4;
  }

  private _bestNormalBall(maxId: number): number {
    const order = [4, 3, 2, 1];
    for (const b of order) {
      if (b <= maxId && (this.ballCounts[String(b)] || 0) > 0) return b;
    }
    return this.sellCfg.catch_ball_id || 1;
  }

  private async _startCatchWorker() {
    while (this.running) {
      if (this.inHunt && this._pendingQueue.length > 0) {
        const p = this._pendingQueue.shift();
        const pid = p.pendingId || p.id;
        
        if (!this._thrownPids.has(pid)) {
          this._thrownPids.add(pid);
          let shiny = p.shiny || false;
          let species = p.speciesName || p.name || p.species || "";
          
          if (!shiny && this._lastShinySpecies && (species === this._lastShinySpecies || !species) && Date.now() - this._lastShinyTime < 15000) {
            shiny = true;
          }
          if (!species) species = shiny ? (this._lastShinySpecies || "pokemon") : "pokemon";
          
          let ballId = 4;
          if (shiny) {
            ballId = this._bestShinyBall();
          } else {
            if (this.sellCfg.best_cball) {
              ballId = this._bestNormalBall(this.sellCfg.max_cball_id || 4);
            } else {
              ballId = this.sellCfg.catch_ball_id || 4;
            }
          }
          
          const count = this.ballCounts[String(ballId)] || 0;
          if (count > 0) {
            if (shiny) {
              this.clog(`✨ [SHINY] Lançando bola ID ${ballId} no ${species}...`);
            } else {
              this.clog(`Lançando bola ID ${ballId} no ${species}...`);
            }
            this.wsSend("catch", { pendingId: pid, ballId });
            this.emit("stats", this.stats());
            await new Promise(r => setTimeout(r, 1200));
          } else {
            this.warn(`Sem pokebolas ID ${ballId} para capturar! Ignorando pokemon.`);
          }
          continue;
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }
    this._catchWorkerRunning = false;
  }

    private async doSellLoot() {
      if (!this.running || !this.userStartedHunt || this._healingInProgress || this._evolutionInProgress || this._sellingLootInProgress) return;
      this._sellingLootInProgress = true;
      this.info("Pausando a hunt para ir a cidade vender loot no Mark...");
      
      const wasInHunt = this.inHunt;
      if (wasInHunt) {
        this.wsSend("leave-hunt");
        this.inHunt = false;
      }
      
      await new Promise(r => setTimeout(r, 1500));
      
      try {
        const res = await this.httpPost("/api/v1/shop/sell", { categories: ["loot"] });
        if (res && res.gold !== undefined) {
          const gained = res.gold - this.gold;
          this.gold = res.gold;
          this.ok(`Loot vendido no Mark! Ganhou ${gained} de Gold. Novo saldo: ${this.gold}`);
          this.emit("stats", this.stats());
        }
      } catch (e: any) {
        this.err(`Erro ao vender loot: ${e.message}`);
      }
      
      if (wasInHunt && this.running && this.userStartedHunt) {
        if (this.cfg.route_enabled) {
          await this.checkRoutes();
        }
        if (!this.inHunt) {
          const slug = this.huntSlug || await this.resolveHuntSlug(this.cfg.hunt || "");
          if (slug) {
            this.wsSend("enter-hunt", { slug });
            this.inHunt = true;
            this.ok(`Voltando para a hunt: ${slug} apos vender loot.`);
          }
        }
      }
      this._sellingLootInProgress = false;
    }
  
    private healAndReturn() {
      if (this._healingInProgress || this._sellingLootInProgress || !this.running) return;
      this._healingInProgress = true;
    this.warn("Iniciando cura...");
    this.wsSend("leave-hunt");
    setTimeout(() => {
      this.wsSend("use-heal", { itemId: 205 });
      this.wsSend("use-heal", { itemId: 204 });
      setTimeout(async () => {
        this.wsSend("joy-heal");
      setTimeout(async () => {
        this.wsSend("pokes-get");
        setTimeout(async () => {
          if (this.running) {
            if (this.cfg.route_enabled) {
              await this.checkRoutes();
            }
            if (this.userStartedHunt) {
              const slug = this.huntSlug || await this.resolveHuntSlug(this.cfg.hunt || "");
              if (slug) {
                  this.wsSend("enter-hunt", { slug });
                  this.inHunt = true;
                  this.ok(`Curado! Voltando para a hunt: ${slug}`);
              }
            } else {
              this.ok(`Curado! (Aguardando comando para iniciar hunt)`);
            }
          }
          this._healingInProgress = false;
        }, 1000);
      }, 800);
    }, 300);
    }, 500);
  }

  private isEvolutionLevel(lvl: number): boolean {
    const thresholds = [40, 60, 80, 100, 120];
    for (const t of thresholds) {
      if (lvl >= t - 1 && lvl <= t + 2) return true;
    }
    return false;
  }

  private async checkEvolution(): Promise<boolean> {
      if (this.cfg.auto_evolve === false) return false;
      if (this._healingInProgress || this._evolutionInProgress || this._sellingLootInProgress || this.heroHp <= 0) return false;
      if (!this.isEvolutionLevel(this.heroLevel)) return false;
      
      const leader = this.pokeList.find((p: any) => p.leader);
      if (!leader || !leader.id) return false;
      
      this._evolutionCheckPending = true;
      this.info(`[EVOLUCAO] Checando se ${leader.species || leader.name || "?"} (Lv ${this.heroLevel}) pode evoluir...`);
      try {
        const res = await this.httpGet(`/api/v1/evolve?capturedId=${leader.id}`);
        if (res && res.canEvolve) {
          if (res.hasStones) {
            this._lacksEvolutionStone = false;
            this.info(`Condicoes de evolucao atingidas para ${leader.species || leader.name || "?"}. Saindo da hunt para evoluir...`);
            this._evolutionInProgress = true;
            const wasInHunt = this.inHunt;
            if (wasInHunt) {
              this.wsSend("leave-hunt");
              this.inHunt = false;
            }
            
            setTimeout(async () => {
              const evRes = await this.httpPost("/api/v1/evolve", { capturedId: leader.id, useStone: true });
              if (evRes && evRes.ok) {
                this.ok(`[OK] Evoluiu com sucesso para ${evRes.name || evRes.destName || "?"}!`);
                this._lacksEvolutionStone = false;
              } else {
                this.err(`Falha ao evoluir: ${evRes?.message || "Desconhecido"}`);
              }
              this.wsSend("pokes-get");
              setTimeout(async () => {
                this._evolutionInProgress = false;
                if (this.running && this.userStartedHunt) {
                  if (this.cfg.route_enabled) {
                    await this.checkRoutes();
                  }
                  if (wasInHunt && this.huntSlug) {
                    this.wsSend("enter-hunt", { slug: this.huntSlug });
                    this.inHunt = true;
                  }
                }
              }, 1500);
            }, 2000); 
            this._evolutionCheckPending = false;
            return true;
          } else {
             this._lacksEvolutionStone = true;
             this.warn(`[EVOLUCAO] O pokemon ${leader.species || leader.name || "?"} pode evoluir, porem faltam pedras/itens necessarios! Continuando na hunt atual...`);
             this._evolutionCheckPending = false;
             return true;
          }
        } else {
             this.warn(`[EVOLUCAO] ${leader.species || leader.name || "?"} (Lv ${this.heroLevel}) não possui evolução neste nível ou jogo.`);
        }
      } catch (e: any) {
        if (e.message && e.message.includes("não tem evolução")) {
           this.warn(`[EVOLUCAO] ${leader.species || leader.name || "?"} (Lv ${this.heroLevel}) não tem evolução no jogo.`);
        } else {
           this.err(`Erro na checagem de evolucao: ${e.message}`);
        }
      }
      
      this._evolutionCheckPending = false;
      return false;
    }

    async evolvePokemon(capturedId: string, useStone: boolean = true) {
      this.info(`Tentando evoluir manualmente o pokemon ID ${capturedId}...`);
      try {
        const evRes = await this.httpPost("/api/v1/evolve", { capturedId, useStone });
        if (evRes && evRes.ok) {
           this.ok(`[OK] Evoluiu com sucesso para ${evRes.name || evRes.destName || "?"}!`);
           this.wsSend("pokes-get");
           return { success: true, message: `Evoluiu para ${evRes.name || evRes.destName || "?"}` };
        } else {
           this.err(`Falha ao evoluir: ${evRes?.message || "Desconhecido"}`);
           return { success: false, message: evRes?.message || "Erro desconhecido" };
        }
      } catch (e: any) {
        this.err(`Erro ao evoluir: ${e.message}`);
        return { success: false, message: e.message };
      }
    }

    async evolvePokemonMass(pokeIds: string[], useStone: boolean = true) {
       this.info(`Tentando evoluir massivamente ${pokeIds.length} pokemons...`);
       let successCount = 0;
       for (const id of pokeIds) {
          try {
             const evRes = await this.httpPost("/api/v1/evolve", { capturedId: id, useStone });
             if (evRes && evRes.ok) successCount++;
             await new Promise(r => setTimeout(r, 600)); // Anti-spam delay
          } catch(e) {}
       }
       this.ok(`Evolução massiva concluída. Sucessos: ${successCount}/${pokeIds.length}`);
       this.wsSend("pokes-get");
       return { successCount };
    }

  private async checkRoutes() {
      if (!this.userStartedHunt) return;
      if (this._healingInProgress || this._evolutionInProgress || this._sellingLootInProgress || this._evolutionCheckPending || this.heroHp <= 0) return;
      if (!this.cfg.route_enabled) return;

    let rules = this.cfg.route_rules || [];
    
    const leader = this.pokeList.find((p: any) => p.leader);
    const leaderName = leader ? (leader.species?.toLowerCase() || leader.name?.toLowerCase()) : null;
    let targetRule: any = null;
    
    let foundMounted = false;
    let mountedName = "";
    const globalMountedRoutes = globalStore.get("mountedRoutes", {}) as Record<string, any>;
    
    if (leaderName && globalMountedRoutes) {
      for (const rid of Object.keys(globalMountedRoutes)) {
        const rdata = globalMountedRoutes[rid];
        if (rdata.pokemon?.toLowerCase() === leaderName.toLowerCase()) {
          rules = rdata.rules || rules;
          foundMounted = true;
          mountedName = rdata.name || rid;
          break;
        }
      }
    }

    if (!rules || !rules.length) return;
    
    const sortedRules = [...rules].sort((a: any, b: any) => (a.min_lv || 0) - (b.min_lv || 0));
    const lastRule = sortedRules[sortedRules.length - 1];
    const maxRouteLv = lastRule.max_lv || 999;
    
    if (this.heroLevel >= maxRouteLv) {
      if (!this.cfg.route_continue_infinite && this.inHunt && !this._lacksEvolutionStone) {
         this.warn(`[ROTA CONCLUIDA] Nivel do Pokemon (${this.heroLevel}) atingiu o limite da ultima rota (${maxRouteLv}). Parando hunt automaticamente!`);
         this.wsSend("leave-hunt");
         this.inHunt = false;
         return;
      } else {
        targetRule = lastRule;
      }
    } else {
      for (const r of sortedRules) {
        if (this.heroLevel >= (r.min_lv || 1) && this.heroLevel <= (r.max_lv || 99)) {
          targetRule = r;
          break;
        }
      }
      if (!targetRule) {
        for (const r of sortedRules) {
          if (this.heroLevel <= (r.max_lv || 99)) {
             targetRule = r;
             break;
          }
        }
      }
      if (!targetRule) targetRule = lastRule;
    }
    
    if (targetRule) {
      const targetHunt = targetRule.hunt || "geodude";
      const ruleHunt = await this.resolveHuntSlug(targetHunt);
      
      if (this.inHunt && this.ws) {
         if (!(this as any)._loggedRouteMatch || (this as any)._lastTargetSlug !== ruleHunt) {
             this.ok(`[ROTA] Nível ${this.heroLevel}: Obedecendo rota montada '${ruleHunt}'!`);
             (this as any)._loggedRouteMatch = true;
             (this as any)._lastTargetSlug = ruleHunt;
         }
      }
      
      if (this.huntSlug !== ruleHunt) {
        const obeyAlways = this.cfg.route_obey_always !== false; // default is true!
        if (!obeyAlways && this.huntSlug && this.huntSlug !== "") {
           return;
        }

        const oldHunt = this.huntSlug;
        this.huntSlug = ruleHunt;
        this.cfg.hunt = targetHunt;
        
        if (this.inHunt && this.ws) {
            this.ok(`[ROTA] Nível ${this.heroLevel}: Mudando hunt de '${oldHunt || "nenhuma"}' para '${ruleHunt}'!`);
            
            if (leaderName && ruleHunt.toLowerCase() !== leaderName.toLowerCase() && ruleHunt.toLowerCase() !== (oldHunt || "").toLowerCase()) {
                this.warn(`[ATENÇÃO] A rota requer a hunt '${ruleHunt}'. Se o jogo EXIGIR evolução do Pokemon para continuar, certifique-se de evoluí-lo na aba Equipe/Box!`);
            }
            
            this.wsSend("leave-hunt");
            this.inHunt = false;
            
            // Delay before entering new hunt to ensure server processes the leave
            setTimeout(() => {
                if (this.running && this.userStartedHunt) {
                    this.wsSend("enter-hunt", { slug: ruleHunt });
                    this.inHunt = true;
                }
            }, 1500);
        }
      }
    }
  }

  async startHunt(slug?: string) {
    this.userStartedHunt = true;
    let s = slug || "";
    
    if (!s && this.cfg.route_enabled) {
        await this.checkRoutes();
        if (this.inHunt) return;
    }
    
    if (!s) {
        s = this.cfg.hunt || this.huntSlug || "";
    }
    
    if (!s) {
        this.warn("Nenhuma hunt configurada para iniciar.");
        return;
    }

    s = await this.resolveHuntSlug(s);
    this.huntSlug = s;
    if (s) {
        this.wsSend("enter-hunt", { slug: s });
        this.inHunt = true;
        this.info(`Iniciando hunt: ${s}`);
    }
  }

  stopHunt() {
    this.userStartedHunt = false;
    this.wsSend("leave-hunt");
    this.inHunt = false;
    this.info("Hunt pausada.");
  }

  async sellLootFiltered(opts: { categories?: string[]; maxScore?: number; rarities?: string[] } = {}) {
    const cats = opts.categories || this.sellCfg.sell_categories || ["loot"];
    const body: any = { categories: cats };
    if (opts.maxScore !== undefined) body.maxScore = opts.maxScore;
    if (opts.rarities) body.rarities = opts.rarities;
    const res = await this.httpPost("/api/v1/shop/sell", body);
    if (res?.ok) {
      this.ok("Loot vendido com sucesso.");
      if (res.gold !== undefined) {
        this.gold = res.gold;
        this.emit("stats", this.stats());
      }
    } else {
      this.warn("Falha ao vender loot.");
    }
    return res;
  }

  async sellPokemonFiltered(opts: any) {
    const res = await this.httpPost("/api/v1/pokemon/sell", { ...opts });
    return res;
  }
  
  async buyMax(itemId: number) {
    let payload: any;
    if (itemId >= 10 || itemId >= 200) {
      payload = { itemId, quantity: 100 };
    } else {
      payload = { ballId: itemId, quantity: 100 };
    }
    return this.httpPost("/api/v1/shop/buy", payload);
  }

  async claimStreak() {
    const wasInHunt = this.inHunt;
    if (wasInHunt) {
      this.wsSend("leave-hunt");
      await new Promise(r => setTimeout(r, 1000));
    }
    const res = await this.httpPost("/api/v1/daily", {});
    if (res?.ok || (res && res.claimedToday)) this.ok("Resgatou bonus diario!");
    else this.warn("Falha ao resgatar bonus diario (pode ja ter sido coletado).");
    if (wasInHunt) this.wsSend("enter-hunt", { slug: this.huntSlug });
    return res;
  }

  async claimGifts() {
    const wasInHunt = this.inHunt;
    if (wasInHunt) {
      this.wsSend("leave-hunt");
      await new Promise(r => setTimeout(r, 1000));
    }
    try {
      const gRes = await this.httpGet("/api/v1/gifts");
      if (gRes && gRes.gifts && gRes.gifts.length > 0) {
        let count = 0;
        for (const gift of gRes.gifts) {
          const cRes = await this.httpPost(`/api/v1/gifts/${gift.id}/claim`, {});
          if (cRes?.ok || cRes?.success || cRes) count++;
        }
        this.ok(`Coletou ${count} gifts com sucesso!`);
      } else {
        this.info("Nenhum gift disponivel para coletar.");
      }
    } catch (e: any) {
      this.warn("Falha ao coletar gifts: " + e.message);
    }
    if (wasInHunt) this.wsSend("enter-hunt", { slug: this.huntSlug });
    return { ok: true };
  }

  async claimBattlepass() {
    const wasInHunt = this.inHunt;
    if (wasInHunt) {
      this.wsSend("leave-hunt");
      await new Promise(r => setTimeout(r, 1000));
    }
    const res = await this.httpPost("/api/v1/battlepass/claim", {});
    if (res?.ok) this.ok("Battlepass coletado!");
    else this.warn("Falha ao coletar battlepass (pode ja estar coletado ou sem nivel).");
    if (wasInHunt) this.wsSend("enter-hunt", { slug: this.huntSlug });
    return res;
  }

  async claimAll() {
    await this.claimStreak();
    await this.claimGifts();
    await this.claimBattlepass();
    this.ok("Fim da tentativa de resgate (Diario, Gifts, Battlepass).");
  }

  async casinoReroll(speciesId: number) {
    this.wsSend("pokes-get");
    const res = await this.httpPost("/api/v1/marlon/buy", { speciesId });
    if (res?.ok) this.ok(`Reroll ${speciesId} concluido.`);
    else this.warn(`Falha no reroll ${speciesId}.`);
    return res;
  }

  async setProfession(profession: string = 'prestige') {
    const res = await this.httpPost("/api/v1/professions/choose", { profession });
    if (res?.ok) this.ok(`Profissao "${profession}" definida.`);
    else this.warn(`Falha ao definir profissao.`);
    return res;
  }

  async rankupProfession() {
    const res = await this.httpPost("/api/v1/professions/rankup", {});
    if (res?.ok) this.ok("Profissao evoluida!");
    else this.warn("Falha ao evoluir profissao.");
    return res;
  }

  equipBestPokemon() {
    const leader = this.pokeList.find((p: any) => p.leader);
    const candidates = this.pokeList.filter((p: any) => !p.leader);
    candidates.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    const target = candidates[0];
    if (target) {
      if (leader) this.wsSend("poke-store", { pokeId: leader.id });
      this.wsSend("poke-withdraw", { pokeId: target.id });
      this.wsSend("poke-summon", { pokeId: target.id });
      this.ok(`Equipou melhor Pokemon: ${target.species || target.name} (score: ${target.score || 0}).`);
    }
  }

  equipPokemon(species: string, mode: string = "highest_score", minScore: number = 0) {
    const leader = this.pokeList.find((p: any) => p.leader);
    let target: any = null;
    const candidates = this.pokeList.filter((p: any) => {
      if (p.leader) return false;
      if (p.species?.toLowerCase() !== species.toLowerCase()) return false;
      if (mode === "min_score" && (p.score || 0) < minScore) return false;
      return true;
    });
    if (mode === "highest_score") {
      candidates.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    }
    target = candidates[0];
    if (!target) {
      this.warn(`Pokemon "${species}" nao encontrado no depot.`);
      return null;
    }
    if (leader) this.wsSend("poke-store", { pokeId: leader.id });
    this.wsSend("poke-withdraw", { pokeId: target.id });
    this.wsSend("poke-summon", { pokeId: target.id });
    this.ok(`Equipou ${species} (score: ${target.score || 0}).`);
    return { ok: true };
  }
  
  getPokemons() {
    return this.pokeList || [];
  }

  async sellItems(itemsOrCategories: {itemId: number; qty: number}[] | string[] = ['loot']) {
    let body: any;
    if (itemsOrCategories.length > 0 && typeof (itemsOrCategories as any)[0] === 'object') {
      body = { items: itemsOrCategories };
    } else {
      body = { categories: itemsOrCategories };
    }
    const res = await this.httpPost('/api/v1/shop/sell', body);
    if (res) {
      this.ok(`Itens vendidos: ${res.soldCount || 0} por ${res.goldGained || 0} gold.`);
      if (res.gold !== undefined) {
        this.gold = res.gold;
        this.emit("stats", this.stats());
      }
      return { ...res, ok: true };
    } else {
      this.warn('Falha ao vender itens.');
    }
    return res || { ok: false };
  }

  async storePokemon(pokeId: string) {
    this.wsSend("poke-store", { pokeId });
    this.ok("Pokemon guardado.");
    return { ok: true };
  }

  async equipPokemonId(pokeId: string) {
    const p = this.pokeList.find((x: any) => x.id === pokeId);
    if (!p) {
       this.warn("Pokemon nao encontrado no depot.");
       return null;
    }
    const leader = this.pokeList.find((x: any) => x.leader);
    if (leader) this.wsSend("poke-store", { pokeId: leader.id });
    this.wsSend("poke-withdraw", { pokeId: p.id });
    this.wsSend("poke-summon", { pokeId: p.id });
    this.ok(`Equipou ${p.species} (score: ${p.score || 0}).`);
    return { ok: true };
  }

  async sellPokemon(pokeIds: string[]) {
    const res = await this.httpPost("/api/v1/pokemon/sell", { pokeIds });
    if (res) {
      this.ok(`${pokeIds.length} Pokemon(s) vendidos.`);
      return { ...res, ok: true };
    }
    this.warn("Falha ao vender Pokemon(s).");
    return { ok: false };
  }
  
  async buyItem(itemId: number, qty: number = 1) {
    let payload: any;
    if (itemId >= 10 || itemId >= 200) {
      payload = { itemId, quantity: qty, amount: qty, count: qty, qty: qty };
    } else {
      payload = { ballId: itemId, quantity: qty, amount: qty, count: qty, qty: qty };
    }
    const res = await this.httpPost("/api/v1/shop/buy", payload);
    if (res?.ok) {
      this.ok(`Comprou ${qty}x do item ${itemId}.`);
      if (res.gold !== undefined) {
        this.gold = res.gold;
        this.emit("stats", this.stats());
      }
    } else {
      this.warn(`Falha ao comprar item ${itemId}.`);
    }
    return res;
  }

  async lockPokemon(capturedIdOrMinScore: string | number = 150, locked: boolean = true) {
    if (typeof capturedIdOrMinScore === 'string') {
      const res = await this.httpPost("/api/v1/pokemon/lock", { id: capturedIdOrMinScore, locked });
      if (res?.ok) this.ok(`Pokemon ${locked ? 'travado' : 'destravado'}.`);
      else this.warn('Falha ao travar/destravar Pokemon.');
      return res;
    }
    let count = 0;
    for (const p of this.pokeList) {
      if (p.leader) continue;
      if ((p.score || 0) >= capturedIdOrMinScore && !p.locked) {
        await this.httpPost("/api/v1/pokemon/lock", { id: p.id, locked: true });
        count++;
      }
    }
    if (count > 0) this.ok(`${count} Pokemon(s) travado(s).`);
    return { ok: true, count };
  }

  async getInventory() {
    const depot = await this.httpGet("/api/v1/depot");
    const items = depot?.inventory || [];
    const balls = await this.httpGet("/api/v1/auto-helper");
    const ballItems = (balls?.balls || []).map((b: any) => ({ ...b, category: "ball" }));
    return [...items, ...ballItems];
  }

  async getShopItems() {
    const profile = await this.httpGet("/api/v1/profile");
    if (profile && profile.gold !== undefined) {
      this.gold = profile.gold;
      this.emit("stats", this.stats());
    }
    let data = await this.httpGet("/api/v1/shop");
    if (!data && this.inHunt && this.connected) {
      this.info("Loja exige estar na Cidade. Saindo da hunt temporariamente...");
      const wasUserStarted = this.userStartedHunt;
      this.wsSend("leave-hunt");
      this.inHunt = false;
      await new Promise(r => setTimeout(r, 1500));
      data = await this.httpGet("/api/v1/shop");
      if (data && this.cfg.hunt) {
        this.info("Retornando a hunt...");
        this.wsSend("enter-hunt", { slug: this.cfg.hunt });
        this.inHunt = true;
        this.userStartedHunt = wasUserStarted;
      }
    }
    if (!data) {
        this.warn("Falha ao obter dados da loja (API retornou null).");
        return null;
    }
    return data;
  }

  async getListings(category: string = 'Pokemon') {
    const data = await this.httpGet(`/api/v1/market?category=${category}`);
    return data?.listings || [];
  }

  async marketListItem(refId: string, qty: number, price: number) {
    const res = await this.httpPost("/api/v1/market/action", {
      action: "sell", kind: "item", refId, quantity: qty, price, currency: "GOLD", offerOnly: true,
    });
    if (res?.ok) this.ok("Item anunciado no mercado.");
    else this.warn("Falha ao anunciar item.");
    return res;
  }

  async marketMakeOffer(listingId: string, money: number) {
    const res = await this.httpPost("/api/v1/market/action", {
      action: "offer-make", id: listingId, amount: 1, money, currency: "GOLD",
    });
    if (res?.ok) this.ok("Oferta realizada.");
    else this.warn("Falha ao fazer oferta.");
    return res;
  }

  async marketAcceptOffer(offerId: string) {
    const res = await this.httpPost("/api/v1/market/action", { action: "offer-accept", id: offerId });
    if (res?.ok) this.ok("Oferta aceita.");
    else this.warn("Falha ao aceitar oferta.");
    return res;
  }

  startFishing(tier: number = 0) {
    this.wsSend("start-fishing", { tier });
    this.info(`Pesca iniciada (tier ${tier}).`);
  }

  private _waitForPokes(timeoutMs: number = 5000): Promise<any[]> {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (list: any[]) => {
        if (!resolved) {
          resolved = true;
          resolve(list);
        }
      };
      const timer = setTimeout(() => done(this.pokeList || []), timeoutMs);
      const onStats = () => {
        clearTimeout(timer);
        this.removeListener("stats", onStats);
        done(this.pokeList || []);
      };
      this.once("stats", onStats);
      this.wsSend("pokes-get");
    });
  }

  async getTeam(): Promise<any[]> {
    const list = await this._waitForPokes();
    return list.filter((p: any) => p.team || p.leader);
  }

  async setLeader(capturedId: string) {
    this.info(`Definindo pokemon ${capturedId} como leader via websockets...`);
    return await this.equipPokemonId(capturedId);
  }

  async getAllPokemon(): Promise<any[]> {
    return await this._waitForPokes();
  }

  async getDepot() {
    let data = await this.httpGet("/api/v1/depot");
    if (!data && this.inHunt && this.connected) {
      this.info("Depot exige estar na Cidade. Saindo da hunt temporariamente...");
      const wasUserStarted = this.userStartedHunt;
      this.wsSend("leave-hunt");
      this.inHunt = false;
      await new Promise(r => setTimeout(r, 1500));
      data = await this.httpGet("/api/v1/depot");
      if (data && this.cfg.hunt) {
        this.info("Retornando a hunt...");
        this.wsSend("enter-hunt", { slug: this.cfg.hunt });
        this.inHunt = true;
        this.userStartedHunt = wasUserStarted;
      }
    }
    if (!data) return { inventory: [], depot: [], maxSlots: 200 };
    const items = (data.inventory || []).map((i: any) => ({
      id: String(i.id),
      name: i.name || `Item ${i.id}`,
      icon: i.icon || "",
      category: i.category || "",
      npcPrice: i.sellPrice || i.price || i.npcPrice || 0,
      quantity: i.quantity || 0,
    }));
    return { ...data, inventory: items };
  }

  async sellPokemonOnMarket(capturedId: string, price: number, currency: string = "GOLD") {
    const res = await this.httpPost("/api/v1/market/action", {
      action: "sell-pokemon", capturedId, price, currency, offerOnly: false,
    });
    if (res?.ok) this.ok(`Pokemon anunciado no mercado por ${price} ${currency}.`);
    else this.warn("Falha ao anunciar Pokemon no mercado.");
    return res;
  }
}
