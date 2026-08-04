const fs = require('fs');
let c = fs.readFileSync('dist/bot/engine.js', 'utf8');

const idx = c.indexOf('const BASE_URL');
if (idx === -1) {
  console.error("Could not find const BASE_URL");
  process.exit(1);
}

const header = `import WebSocket from "ws";
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import type { AccountConfig, SellConfig, BotStats, RouteRule } from "../shared/types";
import Store from "electron-store";

export type { AccountConfig, SellConfig, BotStats, RouteRule };

const globalStore = new Store();

`;

c = header + c.substring(idx);
c = c.replace(/class BotSession extends events_1\.EventEmitter/g, 'export class BotSession extends EventEmitter');
c = c.replace(/ws_1\.default/g, 'WebSocket');
c = c.replace(/crypto_1\.randomUUID/g, 'randomUUID');
c = c.replace(/undici_1\.fetch/g, 'undiciFetch');
c = c.replace(/undici_1\.ProxyAgent/g, 'ProxyAgent');
c = c.replace(/https_proxy_agent_1\.HttpsProxyAgent/g, 'HttpsProxyAgent');
c = c.replace(/exports\.BotSession = BotSession;/g, '');

// Adicionar as nossas propriedades novas à classe BotSession:
const classTarget = 'export class BotSession extends EventEmitter {';
const newProps = `export class BotSession extends EventEmitter {
  public userStartedHunt: boolean = false;
  private _radarHits: any[] = [];
  isPremium = false;
  private _sniperTimer: NodeJS.Timeout | null = null;
  private _sniperTargets: Array<{ item_id: string; max_price: number }> = [];
  private _wbMonitorTimer: NodeJS.Timeout | null = null;
  private _lastWbAlertTime = 0;`;

c = c.replace(classTarget, newProps);
c = c.replace('userStartedHunt = false;', '');

fs.writeFileSync('src/bot/engine.ts', c);
console.log('Successfully converted dist/bot/engine.js back to src/bot/engine.ts! Length:', c.length);
