import { create } from "zustand";

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
  lootDrops?: Record<string, { qty: number; gold: number }>;
  ballCounts: Record<string, number>;
  team: any[];
  boosts: any[];
  connected: boolean;
  leaderSlug: string | null;
}

export interface ParsedCapture {
  name: string;
  level: string;
  ivTotal: number;
  score?: number;
  quality: string;
  power: string;
  rarity: string;
  isShiny: boolean;
  isFailedShiny: boolean;
  timestamp: number;
  account: string;
  escaped?: boolean;
  raw?: string;
}

export interface LogEntry {
  account: string;
  level: string;
  msg: string;
  time: number;
}

interface BotStore {
  accounts: any[];
  activeAccount: string | null;
  stats: Record<string, BotStats>;
  logs: LogEntry[];
  captures: ParsedCapture[];
  significantCaptures: ParsedCapture[];
  maxLogs: number;

  setAccounts: (accounts: any[]) => void;
  setActiveAccount: (name: string | null) => void;
  updateStats: (account: string, stats: Partial<BotStats>) => void;
  addLog: (log: LogEntry) => void;
  addCapture: (cap: ParsedCapture) => void;
  applyBatch: (batch: { logs: LogEntry[], stats: Record<string, Partial<BotStats>>, captures: ParsedCapture[] }) => void;
  clearLogs: () => void;
}

export const useBotStore = create<BotStore>((set, get) => ({
  accounts: [],
  activeAccount: null,
  stats: {},
  logs: [],
  captures: [],
  significantCaptures: JSON.parse(localStorage.getItem('significantCaptures') || '[]'),
  maxLogs: 10000,

  setAccounts: (accounts) => set({ accounts }),
  setActiveAccount: (name) => set({ activeAccount: name }),
  updateStats: (account, stats) =>
    set((s) => ({
      stats: {
        ...s.stats,
        [account]: { ...(s.stats[account] || {}), ...stats } as BotStats,
      },
    })),
  addCapture: (cap) =>
    set((state) => {
      const isSignificant = cap.isFailedShiny || cap.isShiny || cap.ivTotal >= 120 || ["EPIC", "LEGENDARY", "MYTHIC"].includes(cap.rarity);
      const newCaps = [cap, ...state.captures].slice(0, 100);
      let newSigs = state.significantCaptures;
      if (isSignificant) {
        newSigs = [cap, ...state.significantCaptures].slice(0, 500);
        localStorage.setItem('significantCaptures', JSON.stringify(newSigs));
      }
      return { captures: newCaps, significantCaptures: newSigs };
    }),

  addLog: (log) =>
    set((s) => ({
      logs: [...s.logs.slice(-(s.maxLogs - 1)), log],
    })),

  applyBatch: (batch) =>
    set((state) => {
      let newLogs = state.logs;
      if (batch.logs.length > 0) {
        newLogs = [...state.logs, ...batch.logs].slice(-state.maxLogs);
      }

      let newStats = state.stats;
      if (Object.keys(batch.stats).length > 0) {
        newStats = { ...state.stats };
        for (const [acc, st] of Object.entries(batch.stats)) {
          newStats[acc] = { ...(newStats[acc] || {}), ...st } as BotStats;
        }
      }

      let newCaps = state.captures;
      let newSigs = state.significantCaptures;
      if (batch.captures.length > 0) {
        newCaps = [...batch.captures, ...state.captures].slice(0, 100);
        
        const significant = batch.captures.filter(cap => 
          cap.isFailedShiny || cap.isShiny || cap.ivTotal >= 120 || ["EPIC", "LEGENDARY", "MYTHIC"].includes(cap.rarity)
        );
        
        if (significant.length > 0) {
          newSigs = [...significant, ...state.significantCaptures].slice(0, 500);
          localStorage.setItem('significantCaptures', JSON.stringify(newSigs));
        }
      }

      return { logs: newLogs, stats: newStats, captures: newCaps, significantCaptures: newSigs };
    }),

  clearLogs: () => set({ logs: [] }),
}));
