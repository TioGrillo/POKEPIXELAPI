import axios from 'axios';
import type { Account } from '../types';

const BASE_URL = 'https://pokepixel.nietore.com';

export class PokePixelEngine {
  private email: string;
  private password: string;
  private token: string;
  private proxy?: string;
  private currentZone: string;
  private isHunting: boolean = false;

  private reactUpdateState: (state: Partial<Account>) => void;
  private externalPushLog: (msg: string) => void;
  private onAuthError: () => void;

  private pendingStateUpdates: Partial<Account> = {};
  private stateUpdateTimeout: any = null;

  public updateState(updates: Partial<Account>) {
    this.pendingStateUpdates = { ...this.pendingStateUpdates, ...updates };
    if (!this.stateUpdateTimeout) {
      this.stateUpdateTimeout = setTimeout(() => {
        this.reactUpdateState(this.pendingStateUpdates);
        this.pendingStateUpdates = {};
        this.stateUpdateTimeout = null;
      }, 500); // UI renders max 2 times per second
    }
  }

  private stats = { encounters: 0, captures: 0, shinies: 0, potionsUsed: 0 };
  private sessionStats = {
    startTime: Date.now(),
    expGained: 0,
    moneyGained: 0,
    lootValue: 0,
    pokeballsUsed: 0,
    potionsUsed: 0,
    encounters: 0,
    captures: 0,
    shinies: 0,
    shiniesCaught: 0
  };
  private sessionKills = 0;

  private globalShinyMode: boolean = false;
  private zoneList: string[] = [];
  private currentZoneIndex: number = 0;

  private autoPotionThreshold: number = 50;
  private _autoSellThreshold: number = 0;
  private autoHealEnabled: boolean = true;
  private autoNurseJoyEnabled: boolean = true;
  private autoSellLootKills: number = 0;
  private autoSellPokemonConfig = { enabled: false, common: true, rare: false, epic: false };
  private turboInstances: number = 3;
  private routesEnabled: boolean = false;
  private routes: any[] = [];
  public globalRoutes: any[] = [];

  public setGlobalRoutes(routes: any[]) {
    this.globalRoutes = routes;
  }

  private captureConfig: Record<string, boolean> = {
    shiny: true,
    common: false,
    rare: false,
    epic: true,
    legendary: true,
    mythic: true
  };
  

  private bestCapsule: string = 'capsule_ultra';
  private commonCapsule: string = 'capsule_ultra';
  private shinyCapsule: string = 'capsule_ultra';

  private radarLogs: any[] = [];
  private capturedLogsBuffer: any[] = [];
  private accountLogs: string[] = [];
  private consecutiveEmptyZones: Map<string, number> = new Map();
  private allZoneObjects: any[] = [];

  private serverKills = 0;
  private serverExp = 0;
  private serverMoney = 0;
  private serverCaptures = 0;
  private lastAutoSellKills = 0;
  private isFirstPoll = true;
  private lastEngageLogTime = 0;
  private knownPCIds = new Set<string>();

  private zoneAllocations = new Map<string, { mapId: string; speciesId: string; level: number; zoneId: string; trainerId: string }>();

  constructor(
    email: string,
    password: string,
    token: string, 
    zoneId: string, 
    captureConfig: Record<string, any>, 
    updateState: (state: Partial<Account>) => void, 
    pushLog: (msg: string) => void, 
    onAuthError: () => void,
    globalShinyMode: boolean = false,
    zoneList: string[] = [],
    autoPotionThreshold: number = 50,
    autoSellThreshold: number = 0,
    autoHealEnabled: boolean = true,
    autoNurseJoyEnabled: boolean = true,
    autoSellLootKills: number = 0,
    autoSellPokemonConfig: { enabled: boolean; common: boolean; rare: boolean; epic: boolean } = { enabled: false, common: true, rare: false, epic: false },
    turboInstances: number = 3,
    speciesWhitelist: string[] = [],
    proxy?: string,
    routesEnabled: boolean = false,
    routes: any[] = []
  ) {
    this.email = email;
    this.password = password;
    this.token = token;
    this.proxy = proxy;
    this.currentZone = zoneId;
    this.captureConfig = captureConfig;
    this.reactUpdateState = updateState;
    this.externalPushLog = pushLog;
    this.onAuthError = onAuthError;
    this.globalShinyMode = globalShinyMode;
    this.zoneList = zoneList;
    this.autoPotionThreshold = autoPotionThreshold;
    this._autoSellThreshold = autoSellThreshold;
    this.autoHealEnabled = autoHealEnabled;
    this.autoNurseJoyEnabled = autoNurseJoyEnabled;
    this.autoSellLootKills = autoSellLootKills;
    this.autoSellPokemonConfig = autoSellPokemonConfig;
    this.turboInstances = Math.min(25, Math.max(1, turboInstances));
    this.routesEnabled = routesEnabled;
    this.routes = routes;
    
  }

  private logUpdateTimeout: any = null;

  private pushLog(msg: string) {
    const timeStr = new Date().toLocaleTimeString();
    const formatted = `[${timeStr}] ${msg}`;
    
    // Maintain max 150 logs in memory for better performance
    this.accountLogs.unshift(formatted);
    if (this.accountLogs.length > 150) this.accountLogs.pop();
    
    if (this.externalPushLog) {
      this.externalPushLog(msg);
    }

    // Throttle React state updates to max 4 times per second
    if (this.logUpdateTimeout) return;
    this.logUpdateTimeout = setTimeout(() => {
      this.updateState({ logs: [...this.accountLogs] });
      this.logUpdateTimeout = null;
    }, 250);
  }

  private async api() {
    const instance = axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 8000,
      validateStatus: () => true
    });
    instance.interceptors.response.use(undefined, (err) => err);
    return instance;
  }

  private async apiCall(method: 'get' | 'post' | 'patch', url: string, data?: any): Promise<{ status: number; data?: any; headers?: any }> {
    try {
      const fullUrl = BASE_URL + url;
      if (this.proxy && typeof window !== 'undefined' && (window as any).electron) {
        const res = await (window as any).electron.invoke('net:request', {
          url: fullUrl,
          method: method.toUpperCase(),
          data,
          headers: { 'Authorization': `Bearer ${this.token}` },
          proxyUrl: this.proxy
        });
        return { status: res.status, data: res.data, headers: res.headers };
      } else {
        const client = await this.api();
        let res;
        if (method === 'get') res = await client.get(url);
        else if (method === 'post') res = await client.post(url, data);
        else res = await client.patch(url, data);
        return { status: res.status, data: res.data, headers: res.headers };
      }
    } catch (e: any) {
      return { status: e.response?.status || 500, data: e.response?.data, headers: e.response?.headers };
    }
  }

  public async autoRelogin(): Promise<boolean> {
    if (!this.email || !this.password) return false;
    try {
      const loginUrl = `${BASE_URL}/api/v1/auth/login`;
      const payload = { login: this.email, password: this.password };
      
      let res: any;
      if (this.proxy && typeof window !== 'undefined' && (window as any).electron) {
        res = await (window as any).electron.invoke('net:request', {
          url: loginUrl,
          method: 'POST',
          data: payload,
          proxyUrl: this.proxy
        });
      } else {
        res = await axios.post(loginUrl, payload, { validateStatus: () => true, timeout: 8000 });
      }

      if (res.status === 200 && res.data && (res.data.token || res.data.access_token)) {
        this.token = res.data.token || res.data.access_token;
        this.updateState({ token: this.token });
        return true;
      }
    } catch (e) {}
    return false;
  }

  public async fetchTeam(isRetry: boolean = false): Promise<any> {
    try {
      const teamMeta = await this.apiCall('get', '/api/v1/team');
      if (teamMeta.status === 401 && !isRetry) {
        const ok = await this.autoRelogin();
        if (ok) return await this.fetchTeam(true);
      }
      const leaderId = teamMeta?.data?.team?.leader_id;

      const res = await this.apiCall('get', '/api/v1/creatures?location=team');
      if (res.status === 401 && !isRetry) {
        const ok = await this.autoRelogin();
        if (ok) return await this.fetchTeam(true);
      }
      if (res.status === 200 && res.data?.data) {
        const team = res.data.data;
        if (leaderId) {
          team.forEach((p: any) => { p.is_active = (p.id === leaderId); });
        } else if (team.length > 0) {
          team[0].is_active = true;
        }

        this.updateState({ team });
        if (team.length > 0) {
          const leader = team.find((p: any) => p.is_active) || team[0];
          this.updateState({ 
             heroHp: leader.hp || 0, 
             heroMaxHp: leader.max_hp || 0, 
             heroLevel: leader.level || 0,
             heroExp: leader.exp || 0,
             heroExpNext: leader.exp_next || leader.next_level_exp || 0,
          });
        }
        return team;
      }
    } catch (e) {}
    return null;
  }

  public async fetchInventory(isRetry: boolean = false): Promise<any> {
    try {
      const res = await this.apiCall('get', '/api/v1/inventory');
      if (res.status === 401 && !isRetry) {
        const ok = await this.autoRelogin();
        if (ok) return await this.fetchInventory(true);
      }
      if (res.status === 200 && res.data?.data) {
        this.updateState({ inventory: res.data.data });
        return res.data.data;
      }
    } catch (e) {}
    return null;
  }

  public async fetchPC(isRetry: boolean = false): Promise<any> {
    try {
      const res = await this.apiCall('get', '/api/v1/creatures');
      if (res.status === 401 && !isRetry) {
        const ok = await this.autoRelogin();
        if (ok) return await this.fetchPC(true);
      }
      if (res.status === 200 && res.data?.data) {
        const allCreatures = Array.isArray(res.data.data) ? res.data.data : [];
        const pcData = allCreatures.filter((p: any) => p.location === 'storage').slice(0, 150);
        this.updateState({ pc: pcData });
        
        if (this.knownPCIds.size === 0) {
            allCreatures.forEach((c: any) => this.knownPCIds.add(c.id));
        }
        
        return allCreatures;
      }
    } catch (e) {}
    return null;
  }

  public async setLeader(creatureId: string): Promise<boolean> {
    const res = await this.apiCall('post', '/api/v1/team/leader', { creature_id: creatureId });
    if (res.status === 200 || res.status === 201) {
      this.pushLog(`[INFO] Pokémon definido como líder!`);
      await this.fetchTeam();
      return true;
    }
    return false;
  }

  public async toggleLock(creatureId: string, locked: boolean): Promise<boolean> {
    const res = await this.apiCall('patch', `/api/v1/creatures/${creatureId}`, { locked });
    if (res.status === 200 || res.status === 201) {
      this.pushLog(`[INFO] Pokémon ${locked ? 'lockado' : 'deslockado'} com sucesso!`);
      await this.fetchTeam();
      await this.fetchPC();
      return true;
    }
    return false;
  }

  public async moveCreature(creatureId: string, target: 'storage' | 'inventory'): Promise<boolean> {
    const res = await this.apiCall('post', `/api/v1/creatures/${creatureId}/storage`, { target });
    if (res.status === 200 || res.status === 201) {
      this.pushLog(`[INFO] Pokémon movido para ${target === 'storage' ? 'o PC' : 'o Time'}!`);
      await this.fetchTeam();
      await this.fetchPC();
      return true;
    }
    return false;
  }

  public async manualHeal(): Promise<boolean> {
    this.pushLog(`[INFO] Curando time no Centro Pokémon...`);
    const res = await this.apiCall('post', '/api/v1/team/heal');
    if (res.status === 200 || res.status === 201) {
      this.pushLog(`[SUCCESS] Time curado com sucesso!`);
      await this.fetchTeam();
      return true;
    }
    return false;
  }

  private async fetchTrainerInfo() {
    try {
      const res = await this.apiCall('get', '/api/v1/trainer/me');
      const data = res.data?.trainer || res.data?.data || res.data || {};
      const trainerName = data.nickname || data.name || this.email;
      const trainerExp = data.exp || 0;
      const trainerLevel = data.level || 1;
      
      const curveVersion = data.exp_curve_version || 1;
      
      const getBaseExp = (lvl: number, curve: number) => {
          if (curve === 1) return (4 * Math.pow(lvl, 3)) / 5;
          if (curve === 2) return Math.pow(lvl, 3);
          if (curve === 3) return (1.2 * Math.pow(lvl, 3)) - (15 * Math.pow(lvl, 2)) + (100 * lvl) - 140;
          if (curve === 4) return (5 * Math.pow(lvl, 3)) / 4;
          return Math.pow(lvl, 3);
      };
      
      const expCurrentLevel = Math.floor(getBaseExp(trainerLevel, curveVersion) * 65);
      const expNextLevel = Math.floor(getBaseExp(trainerLevel + 1, curveVersion) * 65);
      
      const expIntoLevel = Math.max(0, trainerExp - expCurrentLevel);
      const expRequired = Math.max(1, expNextLevel - expCurrentLevel);
      const trainerExpPercent = Math.min(100, Math.round((expIntoLevel / expRequired) * 100));

      this.updateState({ trainerName, trainerExp, trainerLevel, trainerExpPercent });
    } catch {}
  }

  public async connectOnline(): Promise<boolean> {
    this.pushLog('[ONLINE] Conectando conta...');
    if (this.email && this.password) {
      if (!this.token || this.token === 'token_expirado_falso') {
        await this.autoRelogin();
      }
    }

    let team = await this.fetchTeam();
    if (!team && this.email && this.password) {
      const reconnected = await this.autoRelogin();
      if (reconnected) {
        team = await this.fetchTeam(true);
      }
    }

    await this.fetchInventory();
    await this.fetchTrainerInfo();
    await this.fetchPC();
    
    if (team) {
      this.updateState({ status: 'online' });
      this.pushLog('[ONLINE] Conta pronta para caçar.');
      return true;
    } else {
      this.updateState({ status: 'error' });
      this.pushLog('[ERRO] Falha ao conectar conta. Verifique as credenciais/token.');
      return false;
    }
  }

  public async healAtNurseJoy(): Promise<boolean> {
    if (!this.autoNurseJoyEnabled) return false;
    this.pushLog('[NURSE JOY] Indo ao Centro Pokémon curar com a Enfermeira Joy...');
    try {
      await this.apiCall('post', '/api/v1/hunts/current/stop');
      const healRes = await this.apiCall('post', '/api/v1/team/heal', {});
      if (healRes.status === 200 || healRes.status === 201) {
        this.pushLog('[NURSE JOY] Seus Pokémons foram 100% curados e revividos!');
        await this.fetchTeam();
        return true;
      }
    } catch (e: any) {}
    return false;
  }

  public setZone(zoneId: string) {
    if (this.currentZone !== zoneId) {
      this.currentZone = zoneId;
      this.zoneAllocations.clear();
      this.pushLog(`🗺️ Mapa da conta alterado dinamicamente para: ${zoneId}`);
    }
  }

  public setAllZoneObjects(zones: any[]) {
    if (Array.isArray(zones) && zones.length > 0) {
      this.allZoneObjects = zones;
    }
  }

  private getTargetZones(): string[] {
    if (true) {
      return [this.currentZone];
    }

    const matchedZoneIds: string[] = [];

    for (const species of ([] as string[])) {
      const spLower = species.trim().toLowerCase();
      if (!spLower) continue;

      let found = this.allZoneObjects.find((z: any) => {
        const zId = (z.id || '').toLowerCase();
        const zName = (z.name || '').toLowerCase();
        if (Array.isArray(z.encounters)) {
          if (z.encounters.some((e: any) => (e.species_id || '').toLowerCase() === spLower)) {
            return true;
          }
        }
        if (zId === `hunt_${spLower}` || zId === `zone-${spLower}` || zId.includes(spLower) || zName.includes(spLower)) {
          return true;
        }
        return false;
      });

      if (found) {
        if (!matchedZoneIds.includes(found.id)) {
          matchedZoneIds.push(found.id);
        }
      } else {
        const fallbackId = `hunt_${spLower}`;
        if (!matchedZoneIds.includes(fallbackId)) {
          matchedZoneIds.push(fallbackId);
        }
      }
    }

    return matchedZoneIds.length > 0 ? matchedZoneIds : [this.currentZone];
  }

  public updateConfig(acc: any, zones?: any[]) {
    if (zones && Array.isArray(zones)) {
      this.allZoneObjects = zones;
    }
    if (acc.mapId && acc.mapId !== this.currentZone) {
      this.currentZone = acc.mapId;
      this.zoneAllocations.clear();
      this.pushLog(`🗺️ Mapa da conta alterado dinamicamente para: ${acc.mapId}`);
    }

    if (acc.turboInstances !== undefined) {
      this.turboInstances = Math.min(25, Math.max(1, acc.turboInstances));
    }
    if (acc.captureConfig) {
      this.captureConfig = acc.captureConfig;
    }
    if (acc.autoHealEnabled !== undefined) {
      this.autoHealEnabled = acc.autoHealEnabled;
    }
    if (acc.autoPotionThreshold !== undefined) {
      this.autoPotionThreshold = acc.autoPotionThreshold;
    }
    if (acc.autoNurseJoyEnabled !== undefined) {
      this.autoNurseJoyEnabled = acc.autoNurseJoyEnabled;
    }
    if (acc.autoSellLootKills !== undefined) {
      this.autoSellLootKills = acc.autoSellLootKills;
    }
    if (acc.autoSellPokemonConfig) {
      this.autoSellPokemonConfig = acc.autoSellPokemonConfig;
    }
    if (acc.routesEnabled !== undefined) {
      this.routesEnabled = acc.routesEnabled;
    }
    if (acc.routes) {
      this.routes = acc.routes;
    }
  }

  public async start(targetZoneId?: string) {
    if (this.isHunting) return;

    if (targetZoneId) {
      this.currentZone = targetZoneId;
    }

    this.isHunting = true;
    this.updateState({ status: 'hunting', sessionStats: this.sessionStats });
    this.pushLog(`[HUNT] Iniciando caça na zona: ${this.currentZone}...`);

    await this.fetchTeam();
    await this.fetchInventory();
    await this.fetchTrainerInfo();
    await this.prepareZone(this.currentZone);

    try {
        const inv = await this.fetchInventory();
        const capsules = (inv || []).filter((i: any) => (i.type === 'capsule' || i.item_id?.includes('capsule')) && (i.qty > 0 || i.quantity > 0 || i.market_sellable_qty > 0));
        if (capsules.length > 0) {
            capsules.sort((a: any, b: any) => (b.catch_multiplier || 0) - (a.catch_multiplier || 0));
            this.bestCapsule = capsules[0].item_id;
            
            const selectedCommonBall = (this.captureConfig as any).commonBall || this.captureConfig.ball || 'auto';
            const selectedShinyBall = (this.captureConfig as any).shinyBall || this.captureConfig.ball || 'auto';

            if (selectedCommonBall === 'auto') {
                const ultra = capsules.find((c: any) => c.item_id === 'capsule_ultra');
                this.commonCapsule = ultra ? ultra.item_id : capsules[0].item_id;
            } else {
                const requested = capsules.find((c: any) => c.item_id === selectedCommonBall);
                this.commonCapsule = requested ? requested.item_id : capsules[0].item_id;
            }
            
            if (selectedShinyBall === 'auto') {
                this.shinyCapsule = capsules[0].item_id;
            } else {
                const requested = capsules.find((c: any) => c.item_id === selectedShinyBall);
                this.shinyCapsule = requested ? requested.item_id : capsules[0].item_id;
            }
        }
    } catch(e) {}
    
    // Determine the lowest quality the user wants to capture
    // so we can set min_quality correctly
    const cfg = this.captureConfig;
    const captureCommon    = cfg.common    || false;
    const captureRare      = cfg.rare      || false;
    const captureEpic      = cfg.epic      || false;
    const captureLegendary = cfg.legendary || false;
    const captureShiny     = cfg.shiny     !== false; // default true

    let minQuality = 'mythic'; // default: only capture mythic
    if (captureCommon)    minQuality = 'common';
    else if (captureRare) minQuality = 'rare';
    else if (captureEpic) minQuality = 'epic';
    else if (captureLegendary) minQuality = 'legendary';

    // Server Auto-Capture config
    const captureSettingsRes = await this.apiCall('patch', '/api/v1/hunts/current/settings', {
       auto_capture: {
          enabled: captureCommon || captureRare || captureEpic || captureLegendary || captureShiny,
          common_enabled: captureCommon,
          rare_enabled: captureRare,
          epic_enabled: captureEpic,
          legendary_enabled: captureLegendary,
          shiny_enabled: captureShiny,
          common_capsule_item_id: this.commonCapsule,
          shiny_capsule_item_id: this.bestCapsule,
          species_filter: [],
          min_quality: minQuality,
          mode: 'split'
       }
    });
    this.pushLog(`[CONFIG] Captura configurada: comum=${captureCommon} raro=${captureRare} épico=${captureEpic} lendário=${captureLegendary} shiny=${captureShiny} | min_quality=${minQuality}`);

    this.serverKills = 0;
    this.serverExp = 0;
    this.serverMoney = 0;
    this.serverCaptures = 0;
    this.lastAutoSellKills = 0;
    this.isFirstPoll = true;
    this.engagedEvents.clear();
    this.captureAttemptedEvents.clear();
    this.wildCache = { targets: [], ts: 0, zoneId: '' };

    this.pushLog(`[INFO] Simulando ${this.turboInstances} instâncias independentes batendo no alvo...`);

    // Start the status poller
    this.pollHuntStatus();

    // Start side-effects loop (auto-heal, auto-sell) — runs every 10s, never blocks engage
    this.sideEffectRunning = false;
    this.startSideEffectLoop();

    // Start isolated loops for multiple instances — stagger by 200ms each
    for (let i = 0; i < this.turboInstances; i++) {
        setTimeout(() => this.huntLoopInstance(i), i * 200);
    }
  }

  public stopHunt() {
    this.isHunting = false;
    this.updateState({ status: 'online' });
    this.pushLog('[HUNT] Caça pausada (Conta permanece ONLINE).');
  }

  public stop() {
    this.isHunting = false;
    this.updateState({ status: 'idle' });
    this.pushLog('[OFFLINE] Conta desconectada.');
  }

  private async executeEngage(payload: any): Promise<{ status: number; data?: any; headers?: any }> {
    let res = await this.apiCall('post', '/api/v1/hunts/current/engage', payload);
    if (res.status === 404) {
      const startRes = await this.apiCall('post', '/api/v1/hunts', payload);
      if (startRes.status === 200 || startRes.status === 201 || startRes.status === 409) {
        res = await this.apiCall('post', '/api/v1/hunts/current/engage', payload);
      }
    }
    return res;
  }

  private async prepareZone(zoneId: string): Promise<boolean> {
    // STEP 1: Check if there's already an active hunt in this zone
    // This avoids calling /prepare which resets the spawn timer and causes 40s wait
    const snap = await this.apiCall('get', '/api/v1/hunts/current/snapshot');
    if (snap.status === 200 && snap.data?.snapshot) {
      const existing = snap.data.snapshot;
      const snapZone = existing.zone_id || '';
      if (snapZone === zoneId || snapZone.startsWith(zoneId.substring(0, 8))) {
        // Already hunting in the right zone — extract allocation from snapshot
        const trainerId = existing.trainer_id || existing.allocation?.trainer_id || '';
        const mapId = existing.map_id || existing.allocation?.map_id || null;
        // Find default species from zone encounters if API doesn't provide it
        let defaultSpecies = 'cubone';
        const zoneInfo = this.allZoneObjects.find(z => z.id === snapZone || z.id === zoneId);
        if (zoneInfo && zoneInfo.encounters && zoneInfo.encounters.length > 0) {
           defaultSpecies = zoneInfo.encounters[0].id || zoneInfo.encounters[0].species_id || defaultSpecies;
        }
        
        const speciesId = existing.species_id || existing.enemy?.species_id || defaultSpecies;
        const level = existing.level || existing.enemy?.level || 1;
        if (mapId) {
          const alloc = { mapId, speciesId, level, zoneId: snapZone, trainerId };
          this.zoneAllocations.set(zoneId, alloc);
          this.pushLog(`[HUNT] Aproveitando caça existente: map=${mapId}`);
          return true;
        }
      }
    }

    // STEP 2: No active hunt or wrong zone — call prepare
    let prep = await this.apiCall('post', '/api/v1/hunts/prepare', { zone_id: zoneId });
    if (prep.status === 401) {
      const reconnected = await this.autoRelogin();
      if (!reconnected) {
        this.stop();
        this.onAuthError();
        return false;
      }
      prep = await this.apiCall('post', '/api/v1/hunts/prepare', { zone_id: zoneId });
    }
    if (prep.status === 409) {
      // Hunt active but in wrong zone — stop it and prepare the correct one
      await this.apiCall('post', '/api/v1/hunts/current/stop', { return_to_city: true, cast_nonce: '' });
      await new Promise(r => setTimeout(r, 1500));
      prep = await this.apiCall('post', '/api/v1/hunts/prepare', { zone_id: zoneId });
    }
    if (prep.status === 400) {
      const reason = prep.data?.message || prep.data?.error || JSON.stringify(prep.data || {});
      this.pushLog(`[ERRO] Zona inválida ou bloqueada (400) para: ${zoneId} | ${reason}`);
      
      // Attempt Nurse Joy if enabled (likely K.O.)
      if (this.autoNurseJoyEnabled) {
          this.pushLog(`[ROTA] Possível K.O. detectado. Indo para a Nurse Joy...`);
          const healed = await this.healAtNurseJoy();
          if (healed) {
             this.pushLog(`[HUNT] Retornando à hunt após a cura...`);
             this.zoneBackoffUntil = Date.now() + 2000; // Only wait 2s after healing
             return false;
          }
      }

      this.pushLog(`[ROTA] Esta zona não é válida para esta conta. Verifique se a região está disponível.`);
      return false;
    }
    if (prep.status === 429) {
      const retryAfter = parseInt(prep.data?.retry_after || '60');
      this.pushLog(`[AVISO] Rate limit atingido ao preparar zona. Aguardando ${retryAfter}s...`);
      this.zoneBackoffUntil = Date.now() + (retryAfter * 1000);
      return false;
    }
    if (prep.status !== 200 && prep.status !== 201) {
      this.pushLog(`[ERRO] Falha ao preparar zona (Status ${prep.status}). Tentando novamente em breve...`);
      return false;
    }

    const rawAlloc = prep.data?.allocation || {};
    const trainerId = rawAlloc.trainer_id || rawAlloc.id?.split(':')[0] || rawAlloc.trainer?.id || '';
    
    let defaultSpecies = 'cubone';
    const zoneInfo = this.allZoneObjects.find(z => z.id === zoneId);
    if (zoneInfo && zoneInfo.encounters && zoneInfo.encounters.length > 0) {
       defaultSpecies = zoneInfo.encounters[0].id || zoneInfo.encounters[0].species_id || defaultSpecies;
    }
    
    const alloc = {
      mapId: rawAlloc.map_id || null,
      speciesId: rawAlloc.species_id || defaultSpecies,
      level: rawAlloc.level || 1,
      zoneId: rawAlloc.zone_id || zoneId,
      trainerId,
    };
    this.pushLog(`[HUNT] Zona preparada: map=${alloc.mapId} species=${alloc.speciesId}`);
    this.zoneAllocations.set(zoneId, alloc);
    return true;
  }


  private async pollHuntStatus() {
    if (!this.isHunting) return;
    try {
      const res = await this.apiCall('get', '/api/v1/hunts/analyzer');
      if (res.status === 200 && res.data?.summary) {
        const summary = res.data.summary;
        const newKills = summary.kills || 0;
        const newCaps  = summary.captures || 0;
        const newBalls = summary.balls_used || 0;
        const newShinies = summary.shinies_seen || 0;
        const newShinyCaptures = summary.shiny_captures || 0;

        if (this.isFirstPoll) {
          this.isFirstPoll = false;
          this.serverKills = newKills;
          this.serverExp   = summary.exp_gained || 0;
          this.serverMoney = summary.gold_gained || 0;
          this.serverCaptures = newCaps;
        }

        // Safety-net: if the engage loop missed kills (e.g. 409 race), log them here
        if (newKills > this.serverKills) {
          const diff    = newKills - this.serverKills;
          const diffExp = (summary.exp_gained || 0) - this.serverExp;
          this.stats.encounters        += diff;
          this.sessionStats.encounters += diff;
          this.sessionKills            += diff;
          this.sessionStats.expGained  += Math.max(0, diffExp);
          this.serverKills = newKills;
          this.serverExp   = summary.exp_gained || 0;
          this.pushLog(`[KILL] ${diff} derrotado(s)! (+${Math.max(0, diffExp)}xp) [via poller] | Total: ${newKills}`);
          this.updateState({ encounters: this.stats.encounters, sessionStats: this.sessionStats });
        }

        // Captures from server auto-capture
        if (newCaps > this.serverCaptures) {
          const diffCaps = newCaps - this.serverCaptures;
          this.stats.captures        += diffCaps;
          this.sessionStats.captures += diffCaps;
          
          // Pull full recent captures list from PC
          const allCreatures = await this.fetchPC();
          const capturedList: any[] = allCreatures 
            ? allCreatures.filter((c: any) => !this.knownPCIds.has(c.id))
            : [];
          
          if (capturedList.length > 0) {
            capturedList.forEach((c: any) => this.knownPCIds.add(c.id));
            const newEntries = capturedList.map((cap: any) => ({
              speciesId: cap.species_id || cap.species?.id || '?',
              name: cap.name || cap.species?.name || cap.species_id || '?',
              rarity: (cap.quality || cap.rarity || 'COMMON').toUpperCase(),
              level: cap.level || 1,
              isShiny: cap.is_shiny || false,
              ivs: {
                hp:  cap.ivs?.hp  ?? cap.iv_hp  ?? 0,
                atk: cap.ivs?.atk ?? cap.iv_atk ?? 0,
                def: cap.ivs?.def ?? cap.iv_def ?? 0,
                spa: cap.ivs?.spa ?? cap.iv_spa ?? 0,
                spd: cap.ivs?.spd ?? cap.iv_spd ?? 0,
                spe: cap.ivs?.spe ?? cap.iv_spe ?? 0,
              },
              timestamp: new Date().toLocaleTimeString(),
            }));
            this.capturedLogsBuffer = [...newEntries, ...this.capturedLogsBuffer].slice(0, 100);
            this.updateState({ capturedLogs: this.capturedLogsBuffer });
            
            const lastCapEntity = capturedList[0];
            const capName    = lastCapEntity?.species_id || lastCapEntity?.name || '?';
            const capQuality = (lastCapEntity?.quality || 'COMMON').toUpperCase();
            const capShiny   = (lastCapEntity?.is_shiny) ? '✨ SHINY ' : '';
            this.pushLog(`✅ [CATCH] ${diffCaps}x ${capShiny}${capName}${capQuality ? ` (${capQuality})` : ''} capturado(s)! Total capturas: ${newCaps}`);
          } else {
            this.pushLog(`✅ [CATCH] ${diffCaps}x Pokémon capturado(s)! Total capturas: ${newCaps}`);
          }
          
          this.serverCaptures = newCaps;
          this.updateState({ captures: this.stats.captures, sessionStats: this.sessionStats });
        }

        // Periodicamente puxar os dados do treinador para atualizar a barra de EXP em tempo real
        await this.fetchTrainerInfo();

        // Sync balls and shinies from server (source of truth)
        this.sessionStats.pokeballsUsed  = newBalls;
        this.sessionStats.shinies        = newShinies;
        this.sessionStats.shiniesCaught  = newShinyCaptures;
        this.updateState({ sessionStats: this.sessionStats });
      }
    } catch(e) {}

    if (this.isHunting) {
      setTimeout(() => this.pollHuntStatus(), 5000); // Every 5s — kills tracked via engage response
    }
  }

  private engagedEvents = new Set<string>();      // kept for compat, unused in direct engage mode
  private captureAttemptedEvents = new Set<string>(); // kept for compat
  private isWaitingRespawn = false;                // kept for compat
  private slotCursor = 0;
  private readonly MAX_SLOT = 45; // confirmed valid range from HAR analysis
  private zoneBackoffUntil = 0;  // timestamp ms — all instances wait until this before prepare

  private getNextSlot(): number {
    const s = (this.slotCursor % this.MAX_SLOT) + 1;
    this.slotCursor++;
    return s;
  }

  // wildCache kept as stub so existing references compile
  private wildCache: { targets: any[]; ts: number; zoneId: string } = { targets: [], ts: 0, zoneId: '' };

  private async huntLoopInstance(instanceId: number) {
    if (!this.isHunting) return;

    let nextDelay = 200;

    try {
      // The user requested only ONE hunt to be possible, but multi-instance
      const zoneId = this.currentZone; 
      
      let alloc = this.zoneAllocations.get(zoneId);
      if (!alloc || !alloc.mapId) {
        // If in backoff period, just wait
        if (Date.now() < this.zoneBackoffUntil) {
          nextDelay = this.zoneBackoffUntil - Date.now() + 100;
        } else if (instanceId === 0) {
          const ok = await this.prepareZone(zoneId);
          if (ok) {
            alloc = this.zoneAllocations.get(zoneId);
            this.zoneBackoffUntil = 0; // reset backoff on success
          } else {
            // Zone prepare failed
            if (this.zoneBackoffUntil > Date.now()) {
                // prepareZone set a specific backoff (e.g. rate limit or heal recovery)
                nextDelay = Math.max(0, this.zoneBackoffUntil - Date.now());
            } else {
                // default backoff
                this.zoneBackoffUntil = Date.now() + 30000;
                nextDelay = 30000;
            }
          }
        } else {
          nextDelay = 2000; // Other instances wait for instance 0 to prepare
        }
      }

      if (alloc && alloc.mapId) {
          // ── DIRECT ENGAGE (no wild-monsters polling) ──────────────────────────
          // Benchmark confirmed: slots 1-45 always valid, ~278ms avg, 12+ kills/s
          // Each call to engage picks the next slot in a shared round-robin counter
          const eventId = this.getNextSlot();
          const speciesId = alloc.speciesId;
          const engagePayload = {
              zone_id:         alloc.zoneId,
              wild_monster_id: speciesId,
              map_id:          alloc.mapId,
              event_id:        eventId,
              level:           alloc.level,
          };

          const atkRes = await this.executeEngage(engagePayload);

          if (atkRes.status === 200) {
              const engSummary = atkRes.data?.summary;
              const engKills   = engSummary?.kills || 0;
              const engExp     = engSummary?.exp_gained || 0;
              const engMoney   = engSummary?.gold_gained || 0;

              // Check rarity from response for catch logic
              const enemy    = atkRes.data?.enemy || atkRes.data?.wild_monster;
              const pRarity  = (enemy?.quality || 'common').toUpperCase();
              const tName    = enemy?.species_id || speciesId;
              const isShiny  = enemy?.is_shiny || false;

              const isLegendary = pRarity.includes('LEGENDARY') || pRarity.includes('MYTHIC');
              const isEpic      = pRarity.includes('EPIC');
              const isRare      = pRarity.includes('RARE') || pRarity.includes('UNCOMMON');
              const isCommon    = !isShiny && !isLegendary && !isEpic && !isRare;

              // Shiny detection
              if (isShiny) {
                  this.stats.shinies++;
                  this.sessionStats.shinies++;
                  this.pushLog(`✨ [SHINY] ${tName} Shiny encontrado! (Instância ${instanceId + 1})`);
                  this.updateState({ shinies: this.stats.shinies, sessionStats: this.sessionStats });
              }

              // Kill accounting via server summary delta
              if (engKills > this.serverKills) {
                  const diffKills = engKills - this.serverKills;
                  const diffExp   = engExp - this.serverExp;
                  const diffMoney = engMoney - this.serverMoney;
                  this.stats.encounters       += diffKills;
                  this.sessionStats.encounters += diffKills;
                  this.sessionStats.expGained  += Math.max(0, diffExp);
                  this.sessionStats.moneyGained += Math.max(0, diffMoney);
                  this.serverKills = engKills;
                  this.serverExp   = engExp;
                  this.serverMoney = engMoney;
                  this.pushLog(`[KILL] ${diffKills} ${tName} derrotado(s)! (+${diffExp}xp) | Total: ${engKills}`);
                  this.updateState({ encounters: this.stats.encounters, sessionStats: this.sessionStats });
              }

              // Capture detection from engage response
              const capResult    = atkRes.data?.capture || atkRes.data?.auto_capture;
              const capAttempted = capResult?.attempted ?? (atkRes.data?.capture_attempted);
              const capSuccess   = capResult?.success ?? (atkRes.data?.captured);
              const capFailed    = capResult?.failed ?? (atkRes.data?.capture_failed);
              const capSpecies   = capResult?.species_id || tName;
              const capRarity    = (capResult?.quality || pRarity || 'COMMON').toUpperCase();

              if (capSuccess === true) {
                this.stats.captures++;
                this.sessionStats.captures++;
                this.updateState({ captures: this.stats.captures, sessionStats: this.sessionStats });
              } else if (capFailed === true || capAttempted === true) {
                this.pushLog(`❌ [CATCH] Tentativa de captura de ${capSpecies} (${capRarity}) falhou.`);
              }

              nextDelay = 50; // no server-side cooldown
          } else if (atkRes.status === 409) {
              // Slot busy — skip to next immediately, no wait
              nextDelay = 0;
          } else if (atkRes.status === 401) {
              await this.autoRelogin();
              nextDelay = 500;
          } else if (atkRes.status === 404) {
              // Hunt session lost — only instance 0 recreates it
              if (instanceId === 0) {
                  await this.apiCall('post', '/api/v1/hunts/current/stop', { return_to_city: true, cast_nonce: '' });
                  this.zoneAllocations.delete(alloc.zoneId);
              }
              nextDelay = 500;
          } else if (atkRes.status === 429) {
              // Rate limited - back off exact time
              let waitTime = 5000 + (Math.random() * 3000);
              const headers = atkRes.headers || {};
              const retryAfter = headers['retry-after'] || headers['Retry-After'];
              const rateReset = headers['x-ratelimit-reset'] || headers['X-RateLimit-Reset'];
              if (retryAfter) {
                const secs = parseInt(retryAfter, 10);
                if (!isNaN(secs)) waitTime = (secs * 1000) + 500;
              } else if (rateReset) {
                const ts = parseInt(rateReset, 10);
                if (!isNaN(ts)) {
                  // Usually epoch seconds
                  const ms = ts > 2000000000 ? ts : ts * 1000;
                  waitTime = Math.max(1000, ms - Date.now() + 500);
                }
              }
              this.pushLog(`[AVISO] Limite de requisições atingido (429). Pausando instância ${instanceId + 1} por ${(waitTime / 1000).toFixed(1)}s...`);
              nextDelay = waitTime;
          } else if (atkRes.status >= 400 && atkRes.status < 500) {
              // Other client errors like 400 Bad Request
              nextDelay = 2000;
          } else {
              nextDelay = 500;
          }
      }
    } catch (err: any) {
      this.pushLog(`[ERRO-LOOP] ${err.message || 'Erro na caça'}`);
      nextDelay = 3000;
    }

    if (this.isHunting) {
      setTimeout(() => this.huntLoopInstance(instanceId), nextDelay);
    }
  }

  // ── Side-effects run on a slow timer (every 10s) to not block the engage loop ──
  private sideEffectRunning = false;
  private startSideEffectLoop() {
    if (this.sideEffectRunning) return;
    this.sideEffectRunning = true;
    const run = async () => {
      if (!this.isHunting) { this.sideEffectRunning = false; return; }
      try {
        // Auto-sell
        if (this.autoSellLootKills > 0 && this.serverKills > 0 && this.serverKills % this.autoSellLootKills === 0) {
          if (this.lastAutoSellKills !== this.serverKills) {
            this.lastAutoSellKills = this.serverKills;
            this.pushLog(`🛒 Auto-Venda: Vendendo itens no NPC após ${this.serverKills} kills globais...`);

            // Stop hunt session before selling (shop NPC requires not being in hunt)
            await this.apiCall('post', '/api/v1/hunts/current/stop', { return_to_city: true, cast_nonce: '' });

            const inv = await this.fetchInventory();
            if (inv) {
              const sellables = inv.filter((item: any) => item.sell_price > 0 && (item.qty > 0 || item.quantity > 0));
              if (sellables.length > 0) {
                let totalSellValue = 0;
                sellables.forEach((item: any) => totalSellValue += (item.sell_price * (item.qty || item.quantity)));
                await this.apiCall('post', '/api/v1/shop/sell/items', { items: sellables.map((item: any) => ({ item_id: item.item_id, qty: item.qty || item.quantity })) });
                this.pushLog(`✅ Auto-Venda concluída! Retomando caça...`);
                this.sessionStats.moneyGained += totalSellValue;
                this.sessionStats.lootValue += totalSellValue;
                this.updateState({ sessionStats: this.sessionStats });
              } else {
                this.pushLog(`✅ Auto-Venda: nenhum item para vender.`);
              }
            }

            // Re-prepare the zone so engage loop resumes immediately
            // Clear alloc so instance 0 will call prepareZone on next loop
            this.zoneAllocations.delete(this.currentZone);
            this.pushLog(`🔄 Retomando caça na zona...`);
            // Give instance 0 a moment to re-prepare before others try
            await new Promise(r => setTimeout(r, 500));
          }
        }

        // Fetch team once for both Potions and Routing
        const team = await this.fetchTeam();
        if (team && team.length > 0) {
          const leader = team.find((p: any) => p.is_active) || team[0];
          
          // --- AUTO-POTION CHECK ---
          const hp = leader.hp || 0;
          const maxHp = leader.max_hp || 1;
          const hpPct = (hp / maxHp) * 100;
          if (this.autoHealEnabled && hp > 0 && hpPct <= this.autoPotionThreshold) {
              this.pushLog(`❤️ HP do líder (${hpPct.toFixed(1)}%) atingiu o limite (${this.autoPotionThreshold}%). Curando no local...`);
              try {
                  const healRes = await this.apiCall('post', '/api/v1/team/heal', {});
                  if (healRes.status === 200 || healRes.status === 201) {
                      this.pushLog(`✅ [AUTO-POTION] Time curado com sucesso sem sair da hunt!`);
                      this.stats.potionsUsed++;
                      this.sessionStats.potionsUsed++;
                      this.updateState({ potionsUsed: this.stats.potionsUsed, sessionStats: this.sessionStats });
                      await this.fetchTeam(); // Update state again
                  }
              } catch(e) {}
          }

          // --- ROUTING CHECK ---
          if ((this.routesEnabled && this.routes && this.routes.length > 0) || (this.globalRoutes && this.globalRoutes.length > 0)) {
            const leaderLevel = leader.level || 1;
            const leaderSpecies = (leader.species_id || '').toLowerCase();
            
            // Check Global Routes first
            let matchedRoute = this.globalRoutes?.find(r => 
              r.speciesId === leaderSpecies && 
              leaderLevel >= r.minLevel && 
              leaderLevel <= r.maxLevel
            );

            // Fallback to individual routes if enabled and no global match
            if (!matchedRoute && this.routesEnabled) {
              matchedRoute = this.routes?.find(r => leaderLevel >= r.minLevel && leaderLevel <= r.maxLevel);
            }
            
            if (matchedRoute) {
              if (matchedRoute.zoneId !== this.currentZone) {
                this.pushLog(`🧭 [ROTAS] Líder Nv ${leaderLevel} ativado. Mudando para: ${matchedRoute.name}`);
                
                // Stop current hunt session before switching
                await this.apiCall('post', '/api/v1/hunts/current/stop', { return_to_city: true, cast_nonce: '' });
                
                // Change zone
                const oldZone = this.currentZone;
                this.currentZone = matchedRoute.zoneId;
                this.updateState({ mapId: this.currentZone });
                
                // Clear alloc for the new zone so it re-prepares
                this.zoneAllocations.delete(oldZone);
                this.zoneAllocations.delete(this.currentZone);
                
                this.pushLog(`🔄 Retomando caça na nova rota...`);
                await new Promise(r => setTimeout(r, 1000));
              }
            } else if (this.routesEnabled) {
               // log something occasionally? no
            }
          }
        }


        // Auto-heal
        if (this.autoHealEnabled && this.autoPotionThreshold > 0) {
          const team = await this.fetchTeam();
          if (team && team.length > 0) {
            const leader = team.find((p: any) => p.is_active) || team[0];
            const hpPercent = ((leader.hp || 0) / (leader.max_hp || 1)) * 100;
            if (hpPercent <= this.autoPotionThreshold && (leader.hp || 0) > 0) {
              const inv = await this.fetchInventory();
              const potionItem = (inv || []).find((i: any) => i.item_id?.includes('potion') && (i.qty > 0 || i.quantity > 0));
              if (potionItem) {
                const useRes = await this.apiCall('post', '/api/v1/items/use', { item_id: potionItem.item_id, target_id: leader.id });
                if (useRes.status === 200) {
                  this.stats.potionsUsed++;
                  this.sessionStats.potionsUsed++;
                  this.updateState({ potionsUsed: this.stats.potionsUsed, sessionStats: this.sessionStats });
                }
              } else if (this.autoNurseJoyEnabled) {
                await this.healAtNurseJoy();
              }
            }
          }
        }
      } catch {}
      if (this.isHunting) setTimeout(run, 10000);
      else this.sideEffectRunning = false;
    };
    setTimeout(run, 5000); // first run after 5s
  }
}

