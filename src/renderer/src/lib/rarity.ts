const RARITY_MAP: Record<string, string> = {
  fraca: "FRACA",
  weak: "FRACA",
  comum: "COMMON",
  common: "COMMON",
  incomum: "UNCOMMON",
  uncommon: "UNCOMMON",
  rara: "RARE",
  rare: "RARE",
  epica: "EPIC",
  epic: "EPIC",
  lendaria: "LEGENDARY",
  legendary: "LEGENDARY",
  mitica: "MYTHIC",
  mythic: "MYTHIC",
  antiga: "ANTIGA",
  ancient: "ANTIGA",
  divina: "DIVINA",
  divine: "DIVINA",
};

export const RARITIES = ["FRACA", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "ANTIGA", "DIVINA"] as const;
export type Rarity = (typeof RARITIES)[number];

export const RARITY_COLORS: Record<Rarity, string> = {
  FRACA:    "text-gray-500 border-gray-500/40 bg-gray-500/10",
  COMMON:   "text-gray-400 border-gray-400/40 bg-gray-400/10",
  UNCOMMON: "text-green-400 border-green-400/40 bg-green-400/10",
  RARE:     "text-blue-400 border-blue-400/40 bg-blue-400/10",
  EPIC:     "text-purple-400 border-purple-400/40 bg-purple-400/10",
  LEGENDARY:"text-amber-400 border-amber-400/40 bg-amber-400/10",
  MYTHIC:   "text-red-400 border-red-400/40 bg-red-400/10",
  ANTIGA:   "text-yellow-600 border-yellow-600/40 bg-yellow-600/10",
  DIVINA:   "text-white border-white/40 bg-white/10",
};

export const RARITY_TIER: Record<string, number> = {
  fraca: 0, comum: 1, incomum: 2, rara: 3, epica: 4, lendaria: 5, mitica: 6, antiga: 7, divina: 8,
};

export function getRarity(p: any): Rarity {
  if (!p) return "COMMON";
  const raw = (p.tier || p.rarity || (typeof p.quality === 'string' ? p.quality : "") || "").toLowerCase().trim();
  if (raw && RARITY_MAP[raw]) return RARITY_MAP[raw] as Rarity;
  const q = p.quality_multiplier ?? p.quality_modifier ?? (typeof p.quality === 'number' ? p.quality : 0);
  if (q >= 1.7) return "LEGENDARY";
  if (q >= 1.5) return "EPIC";
  if (q >= 1.3) return "RARE";
  if (q >= 1.1) return "UNCOMMON";
  if (q > 0 && q < 0.98) return "FRACA";
  return "COMMON";
}

export function getRarityLabel(r: Rarity): string {
  const labels: Record<string, string> = {
    FRACA: "Fraca", COMMON: "Comum", UNCOMMON: "Incomum", RARE: "Rara",
    EPIC: "Épica", LEGENDARY: "Lendária", MYTHIC: "Mítica", ANTIGA: "Antiga", DIVINA: "Divina",
  };
  return labels[r] || r;
}

export function getRarityColorHex(r: Rarity): string {
  const hex: Record<string, string> = {
    FRACA: "#808080", COMMON: "#2ECC71", UNCOMMON: "#3498db", RARE: "#9b59b6",
    EPIC: "#f1c40f", LEGENDARY: "#e67e22", MYTHIC: "#8e44ad", ANTIGA: "#d4af37", DIVINA: "#ffffff",
  };
  return hex[r] || "#6b7280";
}

export const TIER_COLORS: Record<string, string> = {
  S: "text-yellow-400 border-yellow-400/40 bg-yellow-400/10",
  A: "text-orange-400 border-orange-400/40 bg-orange-400/10",
  B: "text-blue-400 border-blue-400/40 bg-blue-400/10",
  C: "text-green-400 border-green-400/40 bg-green-400/10",
  D: "text-slate-400 border-slate-400/40 bg-slate-400/10",
  E: "text-stone-500 border-stone-500/40 bg-stone-500/10",
};

export function getTier(p: any): string {
  if (!p) return "E";
  let q = p.quality_modifier ?? p.quality_multiplier ?? (typeof p.quality === 'number' ? p.quality : 0);
  if (!q) {
    const qStr = String(p.quality || p.rarity || p.tier || "").toLowerCase();
    if (qStr.includes("divin") || qStr.includes("antig") || qStr.includes("ancient") || qStr.includes("mitic") || qStr.includes("mythic") || qStr.includes("lendar") || qStr.includes("legendary")) return "S";
    if (qStr.includes("epic")) return "A";
    if (qStr.includes("rar")) return "B";
    if (qStr.includes("incomum") || qStr.includes("uncommon")) return "C";
    if (qStr.includes("comum") || qStr.includes("common")) return "D";
    if (qStr.includes("fraca") || qStr.includes("weak")) return "E";
  }
  if (q >= 1.8) return "S";
  if (q >= 1.6) return "A";
  if (q >= 1.4) return "B";
  if (q >= 1.2) return "C";
  if (q >= 1.0) return "D";
  return "E";
}
