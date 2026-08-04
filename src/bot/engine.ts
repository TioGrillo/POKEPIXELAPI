import WebSocket from "ws";
import { EventEmitter } from "events";
import axios from "axios";
import type { AccountConfig, BotStats } from "../shared/types";

const BASE_URL = "https://pokepixel.nietore.com";

export type { AccountConfig } from "../shared/types";

export class BotSession extends EventEmitter {
  name: string;
  token: string = "";
  cfg: AccountConfig;
  ws?: WebSocket;
  connected: boolean = false;
  gold: number = 0;
  
  // Minimal stats for UI compatibility
  kills = 0; captures = 0; shiny = 0; heroHp = 100; heroMaxHp = 100; heroLevel = 1; heroXpPct = 0;
  inHunt = false; huntSlug: string | null = null; uptime = 0; kph = 0; gph = 0; xph = 0;
  lootGold = 0; supplyGold = 0; ballsUsed = 0; lootDrops: any = {}; ballCounts: any = {};
  team: any[] = []; boosts: any[] = []; leaderSlug: string | null = null;

  private _running = false;
  private _startTime = 0;

  constructor(cfg: AccountConfig) {
    super();
    this.cfg = cfg;
    this.name = cfg.name;
  }

  log(level: string, msg: string) {
    this.emit("log", { level, msg, time: Date.now() });
    console.log("[" + this.name + "] [" + level + "] " + msg);
  }
  info(msg: string) { this.log("INFO", msg); }
  warn(msg: string) { this.log("WARN", msg); }
  err(msg: string) { this.log("ERR", msg); }
  ok(msg: string) { this.log("OK", msg); }

  stats(): BotStats {
    return {
      kills: this.kills, captures: this.captures, shiny: this.shiny,
      xp: 0, gold: this.gold, heroHp: this.heroHp, heroMaxHp: this.heroMaxHp,
      heroLevel: this.heroLevel, heroXpPct: this.heroXpPct, inHunt: this.inHunt,
      huntSlug: this.huntSlug, uptime: this.uptime, kph: this.kph, gph: this.gph,
      xph: this.xph, lootGold: this.lootGold, supplyGold: this.supplyGold,
      ballsUsed: this.ballsUsed, lootDrops: this.lootDrops, ballCounts: this.ballCounts,
      team: this.team, boosts: this.boosts, connected: this.connected,
      leaderSlug: this.leaderSlug
    };
  }

  public async httpGet(path: string): Promise<any> {
    try {
      const url = BASE_URL + path;
      const res = await axios.get(url, {
        headers: { "Authorization": "Bearer " + this.token },
        validateStatus: () => true
      });
      if (res.status === 401 && !path.includes("/auth/")) {
        const ok = await this.relogin();
        if (ok) return await this.httpGet(path);
      }
      if (res.status >= 400) {
        this.err("GET " + path + " falhou: " + res.status);
        return null;
      }
      return res.data;
    } catch (e: any) {
      this.err("GET " + path + " erro: " + e.message);
      return null;
    }
  }

  public async httpPost(path: string, bodyObj: any): Promise<any> {
    try {
      const url = BASE_URL + path;
      const res = await axios.post(url, bodyObj, {
        headers: { "Authorization": "Bearer " + this.token },
        validateStatus: () => true
      });
      if (res.status === 401 && !path.includes("/auth/")) {
        const ok = await this.relogin();
        if (ok) return await this.httpPost(path, bodyObj);
      }
      if (res.status >= 400) {
        this.err("POST " + path + " falhou: " + res.status);
        return null;
      }
      return res.data;
    } catch (e: any) {
      this.err("POST " + path + " erro: " + e.message);
      return null;
    }
  }

  private async relogin(): Promise<boolean> {
    if (!this.cfg.email || !this.cfg.password) return false;
    this.warn("Autenticando com Email/Senha...");
    try {
      const res = await axios.post(BASE_URL + "/api/v1/auth/login", {
        email: this.cfg.email,
        password: this.cfg.password
      }, { validateStatus: () => true });
      
      if (res.status === 200 && res.data) {
        if (res.data.token || res.data.access_token) {
          this.token = res.data.token || res.data.access_token;
          this.ok("Login realizado com sucesso!");
          return true;
        }
      } else {
         this.err("Falha no login: " + res.status + " " + JSON.stringify(res.data));
      }
    } catch (e: any) {
      this.err("Erro de rede no login: " + e.message);
    }
    return false;
  }

  private connectWs() {
    const url = "wss://pokepixel.nietore.com/api/v1/ws?token=" + this.token;
    this.info("Conectando WebSocket para presenca...");
    this.ws = new WebSocket(url);
    this.ws.on("open", () => {
      this.connected = true;
      this.ok("WebSocket conectado!");
      this.emit("stats", this.stats());
    });
    this.ws.on("close", () => {
      this.connected = false;
      this.warn("WebSocket fechado.");
      this.emit("stats", this.stats());
      if (this._running) setTimeout(() => this.connectWs(), 5000);
    });
    this.ws.on("error", (e: any) => this.err("WS Erro: " + e.message));
  }

  async start() {
    if (this._running) return;
    this._running = true;
    this._startTime = Date.now();
    this.info("Iniciando sessao...");
    
    // Login inicial obrigatorio
    const logged = await this.relogin();
    if (!logged) {
      this.err("Nao foi possivel logar. Verifique as credenciais.");
      this.stop();
      return;
    }

    this.connectWs();

    // Fetch Profile
    const profile = await this.httpGet("/api/v1/trainer/profile");
    if (profile && profile.data && profile.data.trainer) {
       this.gold = profile.data.trainer.gold || 0;
       this.heroLevel = profile.data.trainer.level || 1;
       this.info("Nivel: " + this.heroLevel + " | Ouro: " + this.gold);
    }

    this.emit("stats", this.stats());
  }

  stop() {
    this._running = false;
    if (this.ws) {
      this.ws.removeAllListeners();
      try { this.ws.close(); } catch {}
    }
    this.connected = false;
    this.info("Sessao parada.");
    this.emit("stats", this.stats());
  }

  // --- DUMMY METHODS PARA MANTER COMPATIBILIDADE COM index.ts ---
  async sellLootFiltered(opts: any) { return null; }
  async storePokemon(pokeId: any) { return null; }
  async equipPokemonId(pokeId: any) { return null; }
  async buyMax(itemId: any) { return null; }
  async buyItem(itemId: any, qty: any) { return null; }
  startHunt(slug: any) { this.info("Start Hunt Nao Implementado"); }
  stopHunt() { this.info("Stop Hunt Nao Implementado"); }
  async claimStreak() { return null; }
  async claimGifts() { return null; }
  async claimBattlepass() { return null; }
  claimAll() {}
  startFishing(tier: any) {}
  async casinoReroll(speciesId: any) { return null; }
  async setProfession(profession: any) { return null; }
  async rankupProfession() { return null; }
  async equipPokemon(species: any, mode: any, minScore: any) { return null; }
  async getPokemons() { return []; }
  async lockPokemon(id: any, locked: any = true) { return null; }
  async getInventory() { return []; }
  async getShopItems() { return null; }
  async getListings(category: any) { return []; }
  async marketListItem(refId: any, qty: any, price: any) { return null; }
  async marketMakeOffer(listingId: any, money: any) { return null; }
  async marketAcceptOffer(offerId: any) { return null; }
  async getTeam() { return []; }
  async getAllPokemon() { return []; }
  async setLeader(id: any) { return null; }
  async getDepot() { return { inventory: [], depot: [], maxSlots: 200 }; }
  async sellItems(items: any[]) { return null; }
  async sellPokemon(pokeIds: any) { return null; }
  async evolvePokemon(pokeId: any, useStone: any) { return null; }
  async evolvePokemonMass(pokeIds: any, useStone: any) { return null; }
  async scanShinies() { return []; }
}
