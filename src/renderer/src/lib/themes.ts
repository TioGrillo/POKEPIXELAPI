export interface ThemeVars {
  accent: string;
  "accent-light": string;
  "accent-dark": string;
  "bg-deep": string;
  "bg-base": string;
  "bg-surface": string;
  "bg-elevated": string;
  "text-primary": string;
  "text-secondary": string;
  "text-muted": string;
  "text-faint": string;
  border: string;
  success: string;
  warning: string;
  danger: string;
}

export interface Theme {
  id: string;
  label: string;
  preview: string;
  category: "dark" | "tinted" | "light";
  vars: ThemeVars;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

function mixHex(hex1: string, hex2: string, ratio: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16), g1 = parseInt(hex1.slice(3, 5), 16), b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16), g2 = parseInt(hex2.slice(3, 5), 16), b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function tintedBg(tint: string): Pick<ThemeVars, "bg-deep" | "bg-base" | "bg-surface" | "bg-elevated" | "border"> {
  return {
    "bg-deep": hexToRgb(mixHex("#020617", tint, 0.06)),
    "bg-base": hexToRgb(mixHex("#0f172a", tint, 0.08)),
    "bg-surface": hexToRgb(mixHex("#1e293b", tint, 0.10)),
    "bg-elevated": hexToRgb(mixHex("#334155", tint, 0.12)),
    border: hexToRgb(mixHex("#334155", tint, 0.10)),
  };
}

function accentPalette(base: string, light: string, dark: string): Pick<ThemeVars, "accent" | "accent-light" | "accent-dark"> {
  return { accent: hexToRgb(base), "accent-light": hexToRgb(light), "accent-dark": hexToRgb(dark) };
}

const DEFAULT_TEXT = {
  "text-primary": "248 250 252",
  "text-secondary": "148 163 184",
  "text-muted": "100 116 139",
  "text-faint": "71 85 105",
};

const DEFAULT_SEMANTIC = {
  success: "34 197 94",
  warning: "234 179 8",
  danger: "239 68 68",
};

const DARK_SLATE = {
  "bg-deep": "2 6 23",
  "bg-base": "15 23 42",
  "bg-surface": "30 41 59",
  "bg-elevated": "51 65 85",
  border: "51 65 85",
};

const DEFAULT_LIGHT_TEXT = {
  "text-primary": "15 23 42",
  "text-secondary": "51 65 85",
  "text-muted": "71 85 105",
  "text-faint": "100 116 139",
};

const LIGHT_SLATE = {
  "bg-deep": "226 232 240",
  "bg-base": "248 250 252",
  "bg-surface": "255 255 255",
  "bg-elevated": "241 245 249",
  border: "226 232 240",
};

function lightBg(tint: string): Pick<ThemeVars, "bg-deep" | "bg-base" | "bg-surface" | "bg-elevated" | "border"> {
  return {
    "bg-deep": hexToRgb(mixHex("#e2e8f0", tint, 0.05)),
    "bg-base": hexToRgb(mixHex("#f8fafc", tint, 0.05)),
    "bg-surface": hexToRgb(mixHex("#ffffff", tint, 0.05)),
    "bg-elevated": hexToRgb(mixHex("#f1f5f9", tint, 0.08)),
    border: hexToRgb(mixHex("#cbd5e1", tint, 0.10)),
  };
}

export const THEMES: Theme[] = [
  // Novas Cores Mais Escuras Diferenciadas
  { id: "obsidian", label: "Obsidiana", preview: "#000000", category: "dark", vars: { ...accentPalette("#a3a3a3", "#d4d4d4", "#737373"), "bg-deep": "0 0 0", "bg-base": "9 9 11", "bg-surface": "24 24 27", "bg-elevated": "39 39 42", border: "39 39 42", ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "espresso", label: "Expresso", preview: "#451a03", category: "dark", vars: { ...accentPalette("#d97706", "#f59e0b", "#b45309"), "bg-deep": "28 10 0", "bg-base": "45 26 3", "bg-surface": "67 36 6", "bg-elevated": "95 55 14", border: "95 55 14", ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "deep_space", label: "Espaço Profundo", preview: "#172554", category: "dark", vars: { ...accentPalette("#60a5fa", "#93c5fd", "#3b82f6"), "bg-deep": "2 6 23", "bg-base": "10 15 36", "bg-surface": "23 37 84", "bg-elevated": "30 58 138", border: "30 58 138", ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "blood_moon", label: "Lua de Sangue", preview: "#7f1d1d", category: "dark", vars: { ...accentPalette("#ef4444", "#f87171", "#dc2626"), "bg-deep": "15 0 0", "bg-base": "30 5 5", "bg-surface": "69 10 10", "bg-elevated": "127 29 29", border: "127 29 29", ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "forest_night", label: "Noite na Floresta", preview: "#064e3b", category: "dark", vars: { ...accentPalette("#10b981", "#34d399", "#059669"), "bg-deep": "2 15 10", "bg-base": "2 44 34", "bg-surface": "6 78 59", "bg-elevated": "4 120 87", border: "4 120 87", ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },

  // Temas Claros / Pastéis / Acinzentados
  { id: "pearl", label: "Pérola (Claro)", preview: "#ffffff", category: "light", vars: { ...accentPalette("#64748b", "#94a3b8", "#475569"), ...LIGHT_SLATE, ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "pastel_mint", label: "Menta Pastel", preview: "#a7f3d0", category: "light", vars: { ...accentPalette("#059669", "#10b981", "#047857"), ...lightBg("#a7f3d0"), ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "pastel_peach", label: "Pêssego Pastel", preview: "#fed7aa", category: "light", vars: { ...accentPalette("#ea580c", "#f97316", "#c2410c"), ...lightBg("#fed7aa"), ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "pastel_lavender", label: "Lavanda Pastel", preview: "#e9d5ff", category: "light", vars: { ...accentPalette("#9333ea", "#a855f7", "#7e22ce"), ...lightBg("#e9d5ff"), ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "pastel_sky", label: "Céu Pastel", preview: "#bae6fd", category: "light", vars: { ...accentPalette("#0284c7", "#0ea5e9", "#0369a1"), ...lightBg("#bae6fd"), ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "silver_ash", label: "Cinza Prateado", preview: "#e5e7eb", category: "light", vars: { ...accentPalette("#4b5563", "#6b7280", "#374151"), ...lightBg("#e5e7eb"), ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "warm_sand", label: "Areia Quente", preview: "#fef08a", category: "light", vars: { ...accentPalette("#ca8a04", "#eab308", "#a16207"), ...lightBg("#fef08a"), ...DEFAULT_LIGHT_TEXT, ...DEFAULT_SEMANTIC } },

  // 10 Cities
  { id: 'pallet', label: 'Pallet Town', preview: '#f8fafc', category: 'dark', vars: { ...accentPalette("#f8fafc", "#f8fafc", "#f8fafc"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'cerulean', label: 'Cerulean City', preview: '#0ea5e9', category: 'tinted', vars: { ...accentPalette("#0ea5e9", "#0ea5e9", "#0ea5e9"), ...tintedBg("#0ea5e9"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'vermilion', label: 'Vermilion City', preview: '#f97316', category: 'tinted', vars: { ...accentPalette("#f97316", "#f97316", "#f97316"), ...tintedBg("#f97316"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'lavender_town', label: 'Lavender Town', preview: '#a78bfa', category: 'tinted', vars: { ...accentPalette("#a78bfa", "#a78bfa", "#a78bfa"), ...tintedBg("#a78bfa"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'celadon', label: 'Celadon City', preview: '#22c55e', category: 'tinted', vars: { ...accentPalette("#22c55e", "#22c55e", "#22c55e"), ...tintedBg("#22c55e"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'fuchsia_city', label: 'Fuchsia City', preview: '#ec4899', category: 'tinted', vars: { ...accentPalette("#ec4899", "#ec4899", "#ec4899"), ...tintedBg("#ec4899"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'saffron', label: 'Saffron City', preview: '#eab308', category: 'tinted', vars: { ...accentPalette("#eab308", "#eab308", "#eab308"), ...tintedBg("#eab308"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'cinnabar', label: 'Cinnabar Island', preview: '#ef4444', category: 'tinted', vars: { ...accentPalette("#ef4444", "#ef4444", "#ef4444"), ...tintedBg("#ef4444"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'viridian', label: 'Viridian City', preview: '#10b981', category: 'tinted', vars: { ...accentPalette("#10b981", "#10b981", "#10b981"), ...tintedBg("#10b981"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'goldenrod', label: 'Goldenrod City', preview: '#fbbf24', category: 'tinted', vars: { ...accentPalette("#fbbf24", "#fbbf24", "#fbbf24"), ...tintedBg("#fbbf24"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  // 10 Characters
  { id: 'ash', label: 'Ash Ketchum', preview: '#2563eb', category: 'tinted', vars: { ...accentPalette("#2563eb", "#2563eb", "#2563eb"), ...tintedBg("#2563eb"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'misty', label: 'Líder Misty', preview: '#f97316', category: 'tinted', vars: { ...accentPalette("#f97316", "#f97316", "#f97316"), ...tintedBg("#f97316"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'brock', label: 'Líder Brock', preview: '#b45309', category: 'dark', vars: { ...accentPalette("#b45309", "#b45309", "#b45309"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'jessie', label: 'Equipe Rocket Jessie', preview: '#be123c', category: 'tinted', vars: { ...accentPalette("#be123c", "#be123c", "#be123c"), ...tintedBg("#be123c"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'james', label: 'Equipe Rocket James', preview: '#4f46e5', category: 'tinted', vars: { ...accentPalette("#4f46e5", "#4f46e5", "#4f46e5"), ...tintedBg("#4f46e5"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'prof_oak', label: 'Prof. Carvalho', preview: '#94a3b8', category: 'dark', vars: { ...accentPalette("#94a3b8", "#94a3b8", "#94a3b8"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'giovanni', label: 'Chefe Giovanni', preview: '#1e293b', category: 'dark', vars: { ...accentPalette("#1e293b", "#1e293b", "#1e293b"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'cynthia', label: 'Campeã Cynthia', preview: '#fef08a', category: 'dark', vars: { ...accentPalette("#fef08a", "#fef08a", "#fef08a"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'leon', label: 'Campeão Leon', preview: '#ef4444', category: 'tinted', vars: { ...accentPalette("#ef4444", "#ef4444", "#ef4444"), ...tintedBg("#ef4444"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'red', label: 'Mestre Red', preview: '#dc2626', category: 'dark', vars: { ...accentPalette("#dc2626", "#dc2626", "#dc2626"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  // 30 Pokémons
  { id: 'pikachu', label: 'Pikachu', preview: '#facc15', category: 'tinted', vars: { ...accentPalette("#facc15", "#facc15", "#facc15"), ...tintedBg("#facc15"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'charizard', label: 'Charizard', preview: '#ea580c', category: 'tinted', vars: { ...accentPalette("#ea580c", "#ea580c", "#ea580c"), ...tintedBg("#ea580c"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'bulbasaur', label: 'Bulbasaur', preview: '#14b8a6', category: 'tinted', vars: { ...accentPalette("#14b8a6", "#14b8a6", "#14b8a6"), ...tintedBg("#14b8a6"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'squirtle', label: 'Squirtle', preview: '#38bdf8', category: 'tinted', vars: { ...accentPalette("#38bdf8", "#38bdf8", "#38bdf8"), ...tintedBg("#38bdf8"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'gengar', label: 'Gengar', preview: '#9333ea', category: 'dark', vars: { ...accentPalette("#9333ea", "#9333ea", "#9333ea"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'mewtwo', label: 'Mewtwo', preview: '#c084fc', category: 'tinted', vars: { ...accentPalette("#c084fc", "#c084fc", "#c084fc"), ...tintedBg("#c084fc"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'snorlax', label: 'Snorlax', preview: '#0f766e', category: 'dark', vars: { ...accentPalette("#0f766e", "#0f766e", "#0f766e"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'dragonite', label: 'Dragonite', preview: '#fbbf24', category: 'tinted', vars: { ...accentPalette("#fbbf24", "#fbbf24", "#fbbf24"), ...tintedBg("#fbbf24"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'lucario', label: 'Lucario', preview: '#3b82f6', category: 'dark', vars: { ...accentPalette("#3b82f6", "#3b82f6", "#3b82f6"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'rayquaza', label: 'Rayquaza', preview: '#10b981', category: 'dark', vars: { ...accentPalette("#10b981", "#10b981", "#10b981"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'umbreon', label: 'Umbreon', preview: '#fef08a', category: 'dark', vars: { ...accentPalette("#fef08a", "#fef08a", "#fef08a"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'espeon', label: 'Espeon', preview: '#d946ef', category: 'tinted', vars: { ...accentPalette("#d946ef", "#d946ef", "#d946ef"), ...tintedBg("#d946ef"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'sylveon', label: 'Sylveon', preview: '#f472b6', category: 'tinted', vars: { ...accentPalette("#f472b6", "#f472b6", "#f472b6"), ...tintedBg("#f472b6"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'gardevoir', label: 'Gardevoir', preview: '#34d399', category: 'tinted', vars: { ...accentPalette("#34d399", "#34d399", "#34d399"), ...tintedBg("#34d399"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'greninja', label: 'Greninja', preview: '#1e3a8a', category: 'dark', vars: { ...accentPalette("#1e3a8a", "#1e3a8a", "#1e3a8a"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'tyranitar', label: 'Tyranitar', preview: '#4d7c0f', category: 'dark', vars: { ...accentPalette("#4d7c0f", "#4d7c0f", "#4d7c0f"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'metagross', label: 'Metagross', preview: '#64748b', category: 'dark', vars: { ...accentPalette("#64748b", "#64748b", "#64748b"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'garchomp', label: 'Garchomp', preview: '#0284c7', category: 'dark', vars: { ...accentPalette("#0284c7", "#0284c7", "#0284c7"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'lugia', label: 'Lugia', preview: '#93c5fd', category: 'tinted', vars: { ...accentPalette("#93c5fd", "#93c5fd", "#93c5fd"), ...tintedBg("#93c5fd"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'ho_oh', label: 'Ho-Oh', preview: '#f59e0b', category: 'tinted', vars: { ...accentPalette("#f59e0b", "#f59e0b", "#f59e0b"), ...tintedBg("#f59e0b"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'suicune', label: 'Suicune', preview: '#22d3ee', category: 'tinted', vars: { ...accentPalette("#22d3ee", "#22d3ee", "#22d3ee"), ...tintedBg("#22d3ee"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'entei', label: 'Entei', preview: '#b45309', category: 'dark', vars: { ...accentPalette("#b45309", "#b45309", "#b45309"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'raikou', label: 'Raikou', preview: '#eab308', category: 'dark', vars: { ...accentPalette("#eab308", "#eab308", "#eab308"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'celebi', label: 'Celebi', preview: '#84cc16', category: 'tinted', vars: { ...accentPalette("#84cc16", "#84cc16", "#84cc16"), ...tintedBg("#84cc16"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'jirachi', label: 'Jirachi', preview: '#fde047', category: 'tinted', vars: { ...accentPalette("#fde047", "#fde047", "#fde047"), ...tintedBg("#fde047"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'deoxys', label: 'Deoxys', preview: '#f97316', category: 'tinted', vars: { ...accentPalette("#f97316", "#f97316", "#f97316"), ...tintedBg("#f97316"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'darkrai', label: 'Darkrai', preview: '#e11d48', category: 'dark', vars: { ...accentPalette("#e11d48", "#e11d48", "#e11d48"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'arceus', label: 'Arceus', preview: '#fef08a', category: 'tinted', vars: { ...accentPalette("#fef08a", "#fef08a", "#fef08a"), ...tintedBg("#fef08a"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'zekrom', label: 'Zekrom', preview: '#06b6d4', category: 'dark', vars: { ...accentPalette("#06b6d4", "#06b6d4", "#06b6d4"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: 'reshiram', label: 'Reshiram', preview: '#f8fafc', category: 'tinted', vars: { ...accentPalette("#f8fafc", "#f8fafc", "#f8fafc"), ...tintedBg("#f8fafc"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  
  // Original 25 Themes
  { id: "midnight", label: "Meia-Noite", preview: "#f59e0b", category: "dark", vars: { ...accentPalette("#f59e0b", "#fbbf24", "#d97706"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "ocean", label: "Oceano", preview: "#0ea5e9", category: "dark", vars: { ...accentPalette("#0ea5e9", "#38bdf8", "#0284c7"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "forest", label: "Floresta", preview: "#22c55e", category: "dark", vars: { ...accentPalette("#22c55e", "#4ade80", "#16a34a"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "violet", label: "Violeta", preview: "#8b5cf6", category: "tinted", vars: { ...accentPalette("#8b5cf6", "#a78bfa", "#7c3aed"), ...tintedBg("#8b5cf6"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "crimson", label: "Carmesim", preview: "#ef4444", category: "tinted", vars: { ...accentPalette("#ef4444", "#f87171", "#dc2626"), ...tintedBg("#ef4444"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "amber", label: "Ambra", preview: "#f59e0b", category: "tinted", vars: { ...accentPalette("#f59e0b", "#fbbf24", "#d97706"), ...tintedBg("#f59e0b"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "emerald", label: "Esmeralda", preview: "#10b981", category: "tinted", vars: { ...accentPalette("#10b981", "#34d399", "#059669"), ...tintedBg("#10b981"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "rose", label: "Rosa", preview: "#f43f5e", category: "tinted", vars: { ...accentPalette("#f43f5e", "#fb7185", "#e11d48"), ...tintedBg("#f43f5e"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "pink", label: "Pink", preview: "#ec4899", category: "dark", vars: { ...accentPalette("#ec4899", "#f472b6", "#db2777"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "fuchsia", label: "Fúcsia", preview: "#d946ef", category: "dark", vars: { ...accentPalette("#d946ef", "#e879f9", "#c026d3"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "purple", label: "Roxo", preview: "#a855f7", category: "dark", vars: { ...accentPalette("#a855f7", "#c084fc", "#9333ea"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "indigo", label: "Índigo", preview: "#6366f1", category: "dark", vars: { ...accentPalette("#6366f1", "#818cf8", "#4f46e5"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "blue", label: "Azul", preview: "#3b82f6", category: "dark", vars: { ...accentPalette("#3b82f6", "#60a5fa", "#2563eb"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "sky", label: "Céu", preview: "#0ea5e9", category: "dark", vars: { ...accentPalette("#0ea5e9", "#38bdf8", "#0284c7"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "cyan", label: "Ciano", preview: "#06b6d4", category: "dark", vars: { ...accentPalette("#06b6d4", "#22d3ee", "#0891b2"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "teal", label: "Verde-Azulado", preview: "#14b8a6", category: "dark", vars: { ...accentPalette("#14b8a6", "#2dd4bf", "#0d9488"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "green", label: "Verde", preview: "#22c55e", category: "dark", vars: { ...accentPalette("#22c55e", "#4ade80", "#16a34a"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "lime", label: "Limão", preview: "#84cc16", category: "dark", vars: { ...accentPalette("#84cc16", "#a3e635", "#65a30d"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "yellow", label: "Amarelo", preview: "#eab308", category: "dark", vars: { ...accentPalette("#eab308", "#facc15", "#ca8a04"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "orange", label: "Laranja", preview: "#f97316", category: "dark", vars: { ...accentPalette("#f97316", "#fb923c", "#ea580c"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "slate", label: "Ardósia", preview: "#64748b", category: "dark", vars: { ...accentPalette("#64748b", "#94a3b8", "#475569"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "zinc", label: "Zinco", preview: "#71717a", category: "dark", vars: { ...accentPalette("#71717a", "#a1a1aa", "#52525b"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "neutral", label: "Neutro", preview: "#737373", category: "dark", vars: { ...accentPalette("#737373", "#a3a3a3", "#525252"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "stone", label: "Pedra", preview: "#78716c", category: "dark", vars: { ...accentPalette("#78716c", "#a8a29e", "#57534e"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
  { id: "aurora", label: "Aurora", preview: "#10b981", category: "tinted", vars: { ...accentPalette("#10b981", "#34d399", "#059669"), ...tintedBg("#0ea5e9"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC } },
];

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
}

export function applyCustomAccent(hex: string) {
  const root = document.documentElement;
  const rgb = hexToRgb(hex);
  root.style.setProperty("--accent", rgb);
  root.style.setProperty("--accent-light", rgb);
  root.style.setProperty("--accent-dark", rgb);
}
