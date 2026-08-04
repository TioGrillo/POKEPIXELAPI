export interface SellConfig {
  auto_catch: boolean;
  keep_shiny: boolean;
  best_shiny_ball: boolean;
  best_cball: boolean;
  max_cball_id: number;
  catch_ball_id: number;
  shiny_ball_id: number;
  sell_categories: string[];
  sell_pokemon: boolean;
  sell_pokemon_every_catches: number;
  min_score_keep: number;
  keep_lendaria: boolean;
  keep_epica: boolean;
  keep_rara: boolean;
  keep_incomum: boolean;
  keep_comum: boolean;
  use_safari_ball: boolean;
  min_iv_atk: number;
  min_iv_speed: number;
  auto_revive: boolean;
  keep_min_rarity: string;
}

export interface RouteRule {
  min_lv: number;
  max_lv: number;
  hunt: string;
  kills?: number;
  captures?: number;
}

export interface MountedRoute {
  name: string;
  pokemon: string;
  type: string;
  rules: RouteRule[];
}

export interface AccountConfig {
  refreshToken?: string;
  name: string;
  token: string;
  proxy?: string;
  hunt: string;
  enabled: boolean;
  sell_loot_every_kills: number;
  buy_balls: boolean;
  buy_balls_min_gold: number;
  auto_evolve: boolean;
  auto_sleep: boolean;
  sell_config: SellConfig;
  auto_tasks: boolean;
  auto_battlepass: boolean;
  ball_rules: any[];
  auto_buy_max: boolean;
  auto_buy_max_ball_id: number;
  route_enabled: boolean;
  route_continue_infinite: boolean;
  route_obey_always: boolean;
  route_rules: RouteRule[];
  auto_claim_battlepass: boolean;
  auto_potion: boolean;
  auto_potion_pct: number;
  auto_revive: boolean;
  auto_sell_loot: boolean;
  sell_pokemon: boolean;
  email?: string;
  password?: string;
  mounted_routes?: Record<string, MountedRoute>;
}

export interface BotStats {
  kills: number;
  captures: number;
  shiny: number;
  xp: number;
  gold: number;
  heroHp: number;
  heroMaxHp: number;
  heroLevel: number;
  heroXpPct: number;
  inHunt: boolean;
  huntSlug: string | null;
  uptime: number;
  kph: number;
  gph: number;
  xph: number;
  passiveXp?: number;
  lootGold: number;
  supplyGold: number;
  ballsUsed: number;
  lootDrops: Record<string, { qty: number, gold: number }>;
  ballCounts: Record<string, number>;
  team: any[];
  boosts: any[];
  connected: boolean;
  leaderSlug: string | null;
}

export interface LogEntry {
  account: string;
  level: string;
  msg: string;
  time: number;
}

export const DEFAULT_SELL_CONFIG: SellConfig = {
  auto_catch: true,
  keep_shiny: true,
  best_shiny_ball: false,
  best_cball: false,
  max_cball_id: 5,
  catch_ball_id: 4,
  shiny_ball_id: 5,
  sell_categories: ["loot"],
  sell_pokemon: false,
  sell_pokemon_every_catches: 100,
  min_score_keep: 50,
  keep_lendaria: true,
  keep_epica: true,
  keep_rara: true,
  keep_incomum: false,
  keep_comum: false,
  use_safari_ball: false,
  min_iv_atk: 0,
  min_iv_speed: 0,
  auto_revive: true,
  keep_min_rarity: "rare",
};

export function createDefaultAccount(name: string, token: string, hunt: string): AccountConfig {
  return {
    name,
    token,
    hunt,
    enabled: true,
    sell_loot_every_kills: 50,
    buy_balls: false,
    buy_balls_min_gold: 10000,
    auto_evolve: true,
    auto_sleep: true,
    sell_config: { ...DEFAULT_SELL_CONFIG },
    auto_tasks: false,
    auto_battlepass: false,
    ball_rules: [],
    auto_buy_max: false,
    auto_buy_max_ball_id: 4,
    route_enabled: false,
    route_continue_infinite: false,
    route_obey_always: true,
    route_rules: [],
    auto_claim_battlepass: false,
    auto_potion: false,
    auto_potion_pct: 30,
    auto_revive: true,
    auto_sell_loot: true,
    sell_pokemon: false,
  };
}
