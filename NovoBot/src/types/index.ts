export interface Account {
  id: string;
  email: string;
  password?: string;
  token: string;
  name?: string;
  heroLevel?: number;
  sprite?: string;
  status: 'idle' | 'online' | 'hunting' | 'error';
  logs: string[];
  pc?: any[];
  
  // Account Specific Settings
  mapId: string;
  captureConfig: {
    shiny: boolean;
    common: boolean;
    rare: boolean;
    epic: boolean;
    legendary: boolean;
    mythic: boolean;
    ball?: string; // e.g. 'auto', 'capsule_basic', 'capsule_great', 'capsule_ultra'
  };
  globalShinyMode: boolean;

  // Advanced Battle & Health Settings
  proxy?: string;
  autoHealEnabled: boolean;
  autoPotionThreshold: number;
  autoNurseJoyEnabled: boolean;
  turboInstances?: number; // Instâncias / Trabalhadores simultâneos no mapa (1 a 25)

  // Route Settings
  routesEnabled?: boolean;
  routes?: Route[];
  
  // Auto-Sell & Cleanup Settings
  autoSellLootKills: number; // 0 = disabled, X = sell loot every X kills
  autoSellPokemonConfig: {
    enabled: boolean;
    common: boolean;
    rare: boolean;
    epic: boolean;
  };
  
  speciesWhitelist?: string[];
  login?: string;

  // Session Stats
  encounters: number;
  captures: number;
  shinies: number;
  potionsUsed: number;
  heroHp: number;
  heroMaxHp: number;
  heroExp?: number;
  heroExpNext?: number;
  trainerName?: string;
  trainerExp?: number;
  trainerLevel?: number;
  trainerExpPercent?: number;

  // Hunt Analyzer Stats
  sessionStats?: {
    startTime: number;
    expGained: number;
    moneyGained: number;
    lootValue: number;
    pokeballsUsed: number;
    potionsUsed: number;
    encounters: number;
    captures: number;
    shinies: number;
  };

  // Real-Time Data
  team?: any[];
  inventory?: any[];
  radarLogs?: any[];
  capturedLogs?: any[];
}

export interface Encounter {
  species_id: string;
  min_level: number;
  max_level: number;
  weight?: number;
}

export interface Zone {
  id: string;
  name: string;
  type?: string;
  map_id?: number;
  world?: string;
  min_level: number;
  max_level?: number;
  recommended_level?: number;
  difficulty?: string;
  elements?: string[];
  encounters?: Encounter[];
}

export interface Route {
  id: string;
  minLevel: number;
  maxLevel: number;
  zoneId: string;
  mapId: number | string;
  name: string;
}

export interface GlobalRoute {
  id: string;
  speciesId: string;
  minLevel: number;
  maxLevel: number;
  zoneId: string;
  mapId: number | string;
  name: string;
}

