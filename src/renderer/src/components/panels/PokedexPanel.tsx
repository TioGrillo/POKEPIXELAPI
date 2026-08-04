import { useState, useEffect, useMemo, useCallback } from "react";
import { invoke } from "../../lib/ipc";
import { loadJSON } from "../../lib/dataLoader";
import { RARITIES, RARITY_COLORS, getRarity } from "../../lib/rarity";
import type { Rarity } from "../../lib/rarity";
import {
  Search,
  X,
  Sparkles,
  Shield,
  Zap,
  Swords,
  Heart,
  Map,
  ChevronRight,
  RotateCw,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  LayoutGrid,
  List,
} from "lucide-react";
import type { AccountConfig } from "../../types";

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPES = [
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy",
];

const TYPE_COLORS: Record<string, string> = {
  normal: "#a8a878", fire: "#f08030", water: "#6890f0", electric: "#f8d030",
  grass: "#78c850", ice: "#98d8d8", fighting: "#c03028", poison: "#a040a0",
  ground: "#e0c068", flying: "#a890f0", psychic: "#f85888", bug: "#a8b820",
  rock: "#b8a038", ghost: "#705898", dragon: "#ef4444", dark: "#705848",
  steel: "#b8b8d0", fairy: "#ee99ac",
};

const TYPE_BG: Record<string, string> = {
  normal: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  fire: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  water: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  electric: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  grass: "bg-green-500/20 text-green-300 border-green-500/30",
  ice: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  fighting: "bg-red-600/20 text-red-300 border-red-600/30",
  poison: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  ground: "bg-amber-600/20 text-amber-300 border-amber-600/30",
  flying: "bg-indigo-400/20 text-indigo-300 border-indigo-400/30",
  psychic: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  bug: "bg-lime-500/20 text-lime-300 border-lime-500/30",
  rock: "bg-stone-500/20 text-stone-300 border-stone-500/30",
  ghost: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  dragon: "bg-indigo-600/20 text-indigo-300 border-indigo-600/30",
  dark: "bg-neutral-600/20 text-neutral-300 border-neutral-600/30",
  steel: "bg-slate-400/20 text-slate-300 border-slate-400/30",
  fairy: "bg-pink-400/20 text-pink-200 border-pink-400/30",
};

const TYPE_PT: Record<string, string> = {
  normal: "Normal", fire: "Fogo", water: "Agua", electric: "Eletrico",
  grass: "Planta", ice: "Gelo", fighting: "Lutador", poison: "Veneno",
  ground: "Terra", flying: "Voador", psychic: "Psiquico", bug: "Inseto",
  rock: "Pedra", ghost: "Fantasma", dragon: "Dragon", dark: "Sombrio",
  steel: "Aco", fairy: "Fada",
};

const TYPE_CHART: Record<string, Record<string, number>> = {
  normal:   { rock: 0.5, ghost: 0, steel: 0.5 },
  fire:     { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water:    { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass:    { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
  ice:      { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
  poison:   { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground:   { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying:   { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic:  { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug:      { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
  rock:     { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost:    { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon:   { dragon: 2, steel: 0.5, fairy: 0 },
  dark:     { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel:    { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy:    { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

const ROADMAPS: Record<string, [number, number | null, string][]> = {
  ghost:    [[1,10,"Paras"], [10,20,"Mankey / Abra"], [20,30,"Gastly / Smoochum"], [30,40,"Smoochum"], [40,50,"Haunter"], [50,60,"Haunter / Hypno"], [60,null,"Mr. Mime / Misdreavus"]],
  bug:      [[1,10,"Paras"], [10,16,"Exeggcute"], [16,38,"Smoochum"], [38,55,"Kadabra"], [55,null,"Jynx / Girafarig / Exeggutor"]],
  fighting: [[1,7,"Rattata"], [7,16,"Diglett / Meowth"], [16,25,"Meowth"], [25,40,"Rhyhorn / Larvitar"], [40,60,"Onix / Pupitar"], [60,null,"Tyranitar"]],
  normal:   [[1,4,"Rattata"], [4,15,"Abra"], [15,30,"Gastly"], [30,70,"Haunter"], [70,null,"Gengar"]],
  poison:   [[1,10,"Paras"], [10,16,"Magnemite / Pichu"], [16,25,"Chikorita"], [25,40,"Jigglypuff"], [40,60,"Parasect"], [60,null,"Granbull"]],
  dragon:   [[1,8,"Paras"], [8,13,"Diglett"], [13,18,"Pichu"], [18,50,"Dratini"], [50,null,"Dragonair / Dragonite"]],
  dark:     [[1,10,"Abra"], [10,20,"Gastly"], [20,40,"Smoochum"], [40,60,"Haunter"], [60,null,"Gengar / Alakazam"]],
  flying:   [[1,10,"Oddish"], [10,20,"Mankey"], [20,40,"Tyrogue"], [40,null,"Heracross"]],
  fire:     [[1,10,"Paras"], [10,26,"Pineco"], [26,40,"Smoochum / Parasect"], [40,null,"Forretress / Scizor"]],
  electric: [[1,10,"Poliwag"], [10,16,"Shellder / Krabby"], [16,30,"Psyduck"], [30,40,"Wartortle"], [40,60,"Kingler"], [60,null,"Gyarados"]],
  grass:    [[1,10,"Poliwag / Geodude"], [10,16,"Diglett / Kabuto"], [16,30,"Rhyhorn / Onix"], [30,50,"Onix"], [50,null,"Omastar / Pupitar / Tyranitar"]],
  rock:     [[1,10,"Rattata / Pidgey"], [10,16,"Slugma"], [16,40,"Smoochum"], [40,null,"Charizard / Scyther / Crobat"]],
  water:    [[1,10,"Geodude"], [10,16,"Diglett / Slugma"], [16,30,"Rhyhorn / Onix"], [30,70,"Onix"], [70,null,"Golem / Pupitar / Tyranitar"]],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSpeciesId(p: any, dexMap: Record<string, number>): number {
  if (p.dexId) return p.dexId;
  if (p.dex_id) return p.dex_id;
  if (p.pokemonId) return p.pokemonId;
  if (p.speciesId) return p.speciesId;
  const slug = (p.slug || p.species || p.name || "").toLowerCase()
    .replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "")
    .replace(/^milch-/, "")
    .trim();
  return dexMap[slug] || dexMap[p.slug?.toLowerCase()] || dexMap[p.species?.toLowerCase()] || dexMap[p.name?.toLowerCase()] || 0;
}

function extractTypes(p: any): string[] {
  const t1 = (p.type1 || "").toLowerCase();
  const t2 = (p.type2 || "").toLowerCase();
  if (t1 && t2) return [t1, t2];
  if (t1) return [t1];
  if (Array.isArray(p.types) && p.types.length > 0) {
    return p.types.map((t: string) => String(t).toLowerCase());
  }
  if (p.type && typeof p.type === "object") {
    const first = (p.type.first || "").toLowerCase();
    const second = (p.type.second || "").toLowerCase();
    if (first && second) return [first, second];
    if (first) return [first];
  }
  return [];
}

function getSpriteUrl(dexId: number): string {
  if (dexId <= 0) return "";
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dexId}.gif`;
}

function getPngFallback(dexId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexId}.png`;
}

function getOffensiveMatchups(types: string[]): { double: string[]; quad: string[] } {
  const offensive: Record<string, number> = {};
  for (const t of TYPES) offensive[t] = 1;
  for (const attackType of TYPES) {
    let mult = 1;
    for (const defType of types) {
      mult *= TYPE_CHART[attackType]?.[defType] ?? 1;
    }
    offensive[attackType] = mult;
  }
  return {
    double: TYPES.filter(t => offensive[t] === 2),
    quad: TYPES.filter(t => offensive[t] === 4),
  };
}

function getDefensiveMatchups(types: string[]): { weak: string[]; resist: string[]; immune: string[] } {
  const defensive: Record<string, number> = {};
  for (const t of TYPES) defensive[t] = 1;
  for (const attackType of TYPES) {
    let mult = 1;
    for (const defType of types) {
      mult *= TYPE_CHART[attackType]?.[defType] ?? 1;
    }
    defensive[attackType] = mult;
  }
  return {
    weak: TYPES.filter(t => defensive[t] >= 2),
    resist: TYPES.filter(t => defensive[t] > 0 && defensive[t] < 1),
    immune: TYPES.filter(t => defensive[t] === 0),
  };
}

function getPrimaryType(types: string[]): string {
  return types[0]?.toLowerCase() || "normal";
}

interface PokedexEntry {
  pokemon: any;
  accountName: string;
  dexId: number;
  types: string[];
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface Props {
  accounts: AccountConfig[];
}

export function PokedexPanel({ accounts }: Props) {
  const [allPokemon, setAllPokemon] = useState<PokedexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [baseStats, setBaseStats] = useState<Record<string, any>>({});

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<Set<Rarity>>(new Set());
  const [shinyOnly, setShinyOnly] = useState(false);
  const [selectedPokemon, setSelectedPokemon] = useState<PokedexEntry | null>(null);
  const [sortBy, setSortBy] = useState<"score" | "level" | "rarity" | "iv" | "quality">("score");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [visibleCount, setVisibleCount] = useState(100);

  useEffect(() => {
    setVisibleCount(100);
  }, [search, typeFilter, rarityFilter, shinyOnly, sortBy, viewMode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [dex, stats] = await Promise.all([
      loadJSON<Record<string, number>>("slug_to_dex.json"),
      loadJSON<Record<string, any>>("poke_base_stats.json"),
    ]);
    setDexMap(dex || {});
    setBaseStats(stats || {});

    const entries: PokedexEntry[] = [];
    for (const acc of accounts) {
      try {
        const pokemon = await invoke<any[]>("bot:get-all-pokemon", acc.name);
        if (pokemon) {
          for (const p of pokemon) {
            const dexId = getSpeciesId(p, dex || {});
            const types = extractTypes(p);
            entries.push({ pokemon: p, accountName: acc.name, dexId, types });
          }
        }
      } catch {
        // skip failed accounts
      }
    }
    setAllPokemon(entries);
    setLoading(false);
  }, [accounts]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    let result = allPokemon.filter((entry) => {
      const name = (entry.pokemon.name || entry.pokemon.slug || "").toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (typeFilter && !entry.types.includes(typeFilter)) return false;
      if (rarityFilter.size > 0 && !rarityFilter.has(getRarity(entry.pokemon))) return false;
      if (shinyOnly && !entry.pokemon.shiny) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "score") {
        const scoreA = a.pokemon.score ?? ((a.pokemon.quality || 0) * (a.pokemon.ivTotal || 0));
        const scoreB = b.pokemon.score ?? ((b.pokemon.quality || 0) * (b.pokemon.ivTotal || 0));
        return scoreB - scoreA;
      }
      if (sortBy === "level") return (b.pokemon.level ?? b.pokemon.lv ?? 0) - (a.pokemon.level ?? a.pokemon.lv ?? 0);
      if (sortBy === "rarity") return (b.pokemon.quality || 0) - (a.pokemon.quality || 0);
      if (sortBy === "quality") return (b.pokemon.quality || 0) - (a.pokemon.quality || 0);
      if (sortBy === "iv") return (b.pokemon.ivTotal || 0) - (a.pokemon.ivTotal || 0);
      return 0;
    });

    return result;
  }, [allPokemon, search, typeFilter, rarityFilter, shinyOnly, sortBy]);

  const stats = useMemo(() => {
    const byName: Record<string, number> = {};
    const byRarity: Record<string, number> = {};
    for (const r of RARITIES) byRarity[r] = 0;
    for (const entry of allPokemon) {
      const name = (entry.pokemon.name || entry.pokemon.slug || "unknown").toLowerCase();
      byName[name] = (byName[name] || 0) + 1;
      byRarity[getRarity(entry.pokemon)]++;
    }
    const uniqueCount = Object.keys(byName).length;
    return { uniqueCount, total: allPokemon.length, byRarity };
  }, [allPokemon]);

  const toggleRarity = (r: Rarity) => {
    setRarityFilter((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 200) {
      if (visibleCount < filtered.length) {
        setVisibleCount((prev) => prev + 100);
      }
    }
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto" onScroll={handleScroll}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[rgb(var(--text-primary))]">Pokedex</h1>
          <span className="text-[11px] text-[rgb(var(--text-muted))]">
            {stats.uniqueCount} especies | {stats.total} total
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-lg overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-primary))]" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"}`}
            >
              <List size={14} />
            </button>
          </div>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] text-[11px] px-2 py-1.5 rounded-lg focus:outline-none"
          >
            <option value="score">Maior Score</option>
            <option value="level">Maior Level</option>
            <option value="rarity">Maior Raridade</option>
            <option value="quality">Maior Quality</option>
            <option value="iv">Maior IV Total</option>
          </select>
          <button
            onClick={loadData}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] border border-[rgb(var(--border))] transition-colors"
          >
            <RotateCw size={12} /> Atualizar
          </button>
        </div>
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {RARITIES.map((r) => (
          <div
            key={r}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${RARITY_COLORS[r]}`}
          >
            {r}: {stats.byRarity[r]}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-1.5 text-[11px] text-[rgb(var(--text-muted))] font-semibold uppercase tracking-wider">
          <Search size={12} /> Filtros
        </div>

        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="space-y-1">
            <div className="text-[10px] text-[rgb(var(--text-faint))]">Nome</div>
            <div className="relative">
              <Search size={11} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-40 pl-6 pr-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-muted))]">
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Type filter */}
          <div className="space-y-1">
            <div className="text-[10px] text-[rgb(var(--text-faint))]">Tipo</div>
            <div className="flex gap-1 flex-wrap max-w-[400px]">
              <button
                onClick={() => setTypeFilter(null)}
                className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                  typeFilter === null
                    ? "text-white border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/20"
                    : "text-[rgb(var(--text-faint))] border-transparent hover:border-[rgb(var(--border))]"
                }`}
              >
                Todos
              </button>
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}
                  className="px-2 py-0.5 rounded text-[9px] font-medium border transition-colors"
                  style={{
                    color: typeFilter === t ? "#fff" : TYPE_COLORS[t],
                    borderColor: typeFilter === t ? TYPE_COLORS[t] : "transparent",
                    backgroundColor: typeFilter === t ? TYPE_COLORS[t] + "33" : "transparent",
                  }}
                >
                  {TYPE_PT[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity filter */}
          <div className="space-y-1">
            <div className="text-[10px] text-[rgb(var(--text-faint))]">Raridade</div>
            <div className="flex gap-1 flex-wrap">
              {RARITIES.map((r) => (
                <button
                  key={r}
                  onClick={() => toggleRarity(r)}
                  className={`px-2 py-0.5 rounded text-[9px] font-medium border transition-colors select-none ${
                    rarityFilter.has(r)
                      ? RARITY_COLORS[r]
                      : "text-[rgb(var(--text-faint))] border-transparent hover:border-[rgb(var(--border))]"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Shiny toggle */}
          <div className="space-y-1">
            <div className="text-[10px] text-[rgb(var(--text-faint))]">Shiny</div>
            <button
              onClick={() => setShinyOnly(!shinyOnly)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium border transition-colors ${
                shinyOnly
                  ? "text-yellow-400 border-yellow-400/40 bg-yellow-400/10"
                  : "text-[rgb(var(--text-faint))] border-transparent hover:border-[rgb(var(--border))]"
              }`}
            >
              <Sparkles size={10} /> Shiny
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-center py-12 text-[rgb(var(--text-muted))] text-[13px]">Carregando Pokedex...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[rgb(var(--text-faint))] text-[13px]">
          {allPokemon.length === 0 ? "Nenhum Pokemon encontrado." : "Nenhum Pokemon bate nos filtros."}
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2" : "flex flex-col gap-2"}>
          {filtered.slice(0, visibleCount).map((entry, idx) => {
            const p = entry.pokemon;
            const id = `${entry.accountName}-${p.id}-${idx}`;
            const rarity = getRarity(p);
            const sprite = getSpriteUrl(entry.dexId);
            const ivPct = Math.min(100, ((p.ivTotal ?? 0) / 192) * 100);

            return (
              <div
                key={id}
                className={`relative bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-2 cursor-pointer transition-all hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/30 ${viewMode === 'list' ? 'flex flex-row items-center gap-4' : ''}`}
                onClick={() => setSelectedPokemon(entry)}
              >
                <div className={`flex items-start gap-2 ${viewMode === 'list' ? 'w-48 shrink-0 items-center' : 'mb-1.5'}`}>
                  <div className="w-10 h-10 shrink-0 bg-[rgb(var(--bg-surface))]/50 rounded flex items-center justify-center overflow-hidden">
                    {sprite ? (
                      <img
                        src={sprite}
                        alt={p.name || p.slug}
                        className="w-9 h-9 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = getPngFallback(entry.dexId);
                        }}
                      />
                    ) : (
                      <span className="text-[14px] text-[rgb(var(--text-faint))]">?</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] font-semibold text-[rgb(var(--text-primary))] truncate capitalize">
                        {p.name || p.slug || `#${p.id}`}
                      </span>
                      {p.shiny && <Sparkles size={9} className="text-yellow-400 shrink-0" />}
                    </div>
                    <div className="text-[9px] text-[rgb(var(--text-faint))]">Lv.{p.level ?? "?"}</div>
                  </div>
                </div>

                {/* Types */}
                {entry.types.length > 0 && (
                  <div className={`flex gap-0.5 flex-wrap ${viewMode === 'list' ? 'w-24 shrink-0' : 'mb-1.5'}`}>
                    {entry.types.map((t) => (
                      <span
                        key={t}
                        className={`px-1 py-0.5 rounded text-[8px] font-medium border ${TYPE_BG[t] || TYPE_BG.normal}`}
                      >
                        {TYPE_PT[t] || t}
                      </span>
                    ))}
                  </div>
                )}
                {entry.types.length === 0 && viewMode === 'list' && <div className="w-24 shrink-0" />}

                {/* Rarity badge */}
                <div className={viewMode === 'list' ? 'w-16 shrink-0' : ''}>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${RARITY_COLORS[rarity]}`}>
                    {rarity}
                  </span>
                </div>

                {/* IV bar */}
                <div className={viewMode === 'list' ? 'flex-1 min-w-[100px]' : 'mt-1'}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-[rgb(var(--text-faint))]">IV</span>
                    <span className="text-[9px] text-[rgb(var(--text-muted))]">{p.ivTotal ?? 0}/192</span>
                  </div>
                  <div className="w-full h-1 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${ivPct}%`,
                        background: ivPct >= 80 ? "#facc15" : ivPct >= 50 ? "#60a5fa" : ivPct >= 30 ? "#a3a3a3" : "#525252",
                      }}
                    />
                  </div>
                </div>

                {/* Account tag */}
                <div className={`text-[8px] text-[rgb(var(--text-faint))] truncate ${viewMode === 'list' ? 'w-20 shrink-0 text-right' : 'mt-1'}`} title={entry.accountName}>
                  {entry.accountName}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPokemon && (
        <PokemonDetailModal
          entry={selectedPokemon}
          dexMap={dexMap}
          baseStats={baseStats}
          onClose={() => setSelectedPokemon(null)}
        />
      )}
    </div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function PokemonDetailModal({
  entry,
  dexMap,
  baseStats,
  onClose,
}: {
  entry: PokedexEntry;
  dexMap: Record<string, number>;
  baseStats: Record<string, any>;
  onClose: () => void;
}) {
  const p = entry.pokemon;
  const sprite = getSpriteUrl(entry.dexId);
  const rarity = getRarity(p);
  const types = entry.types;
  const offensive = getOffensiveMatchups(types);
  const defensive = getDefensiveMatchups(types);
  const primaryType = getPrimaryType(types);
  const roadmap = ROADMAPS[primaryType] || null;
  const base = baseStats[String(entry.dexId)] || null;

  const statLabels = [
    { key: "hp", label: "HP", icon: <Heart size={10} className="text-green-400" />, color: "#22c55e" },
    { key: "atk", label: "ATK", icon: <Swords size={10} className="text-red-400" />, color: "#ef4444" },
    { key: "def", label: "DEF", icon: <Shield size={10} className="text-blue-400" />, color: "#3b82f6" },
    { key: "spAtk", label: "SP.A", icon: <Zap size={10} className="text-purple-400" />, color: "#a855f7" },
    { key: "spDef", label: "SP.D", icon: <Shield size={10} className="text-indigo-400" />, color: "#6366f1" },
    { key: "speed", label: "SPD", icon: <Zap size={10} className="text-yellow-400" />, color: "#eab308" },
  ];

  const ivs = p.ivs || {};
  const statsData = p.stats || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[rgb(var(--text-primary))] capitalize">
              {p.name || p.slug || `Pokemon #${p.id}`}
            </span>
            {p.shiny && <Sparkles size={16} className="text-yellow-400" />}
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${RARITY_COLORS[rarity]}`}>
              {rarity}
            </span>
          </div>
          <button onClick={onClose} className="text-[rgb(var(--text-faint))] hover:text-[rgb(var(--text-primary))] transition-colors">
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Top section: sprite + basic info */}
          <div className="flex gap-4">
            {/* Sprite */}
            <div className="shrink-0">
              {sprite ? (
                <img
                  src={sprite}
                  alt={p.name || p.slug}
                  className="w-24 h-24 object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getPngFallback(entry.dexId);
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-lg bg-[rgb(var(--bg-surface))] flex items-center justify-center text-[rgb(var(--text-faint))] text-2xl">?</div>
              )}
            </div>

            <div className="flex-1 space-y-2">
              {/* Types */}
              <div className="flex gap-1 flex-wrap">
                {types.map((t) => (
                  <span
                    key={t}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium border ${TYPE_BG[t] || TYPE_BG.normal}`}
                  >
                    {TYPE_PT[t] || t}
                  </span>
                ))}
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="bg-[rgb(var(--bg-surface))] rounded-md p-1.5">
                  <div className="text-[9px] text-[rgb(var(--text-faint))]">Nivel</div>
                  <div className="text-[13px] font-bold text-[rgb(var(--text-primary))]">{p.level ?? "?"}</div>
                </div>
                <div className="bg-[rgb(var(--bg-surface))] rounded-md p-1.5">
                  <div className="text-[9px] text-[rgb(var(--text-faint))]">Quality</div>
                  <div className={`text-[13px] font-bold ${p.quality >= 1.5 ? "text-purple-400" : "text-[rgb(var(--text-primary))]"}`}>
                    {p.quality ?? "-"}x
                  </div>
                </div>
                <div className="bg-[rgb(var(--bg-surface))] rounded-md p-1.5">
                  <div className="text-[9px] text-[rgb(var(--text-faint))]">Score</div>
                  <div className="text-[13px] font-bold text-[rgb(var(--text-primary))]">{p.score ?? "-"}</div>
                </div>
              </div>

              {/* IVs */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[rgb(var(--text-muted))]">IV Total</span>
                  <span className="text-[10px] text-[rgb(var(--text-faint))]">{p.ivTotal ?? 0} / 192</span>
                </div>
                {ivs.hp != null && <IvBar label="HP" value={ivs.hp} />}
                {ivs.atk != null && <IvBar label="ATK" value={ivs.atk} />}
                {ivs.def != null && <IvBar label="DEF" value={ivs.def} />}
                {ivs.spd != null && <IvBar label="SPD" value={ivs.spd} />}
              </div>

              {/* Account */}
              <div className="text-[10px] text-[rgb(var(--text-faint))]">
                Conta: <span className="text-[rgb(var(--text-muted))]">{entry.accountName}</span>
              </div>
            </div>
          </div>

          {/* Base stats */}
          {base && (
            <Section title="Stats Base" icon={<TrendingUp size={13} />}>
              <div className="space-y-1.5">
                {statLabels.map(({ key, label, icon, color }) => {
                  const baseVal = base[key] ?? 0;
                  const actualVal = statsData[key] ?? statsData[key === "spAtk" ? "spatk" : key === "spDef" ? "spdef" : key] ?? null;
                  const pct = Math.min(100, (baseVal / 255) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <div className="flex items-center gap-1 w-10 shrink-0">
                        {icon}
                        <span className="text-[9px] text-[rgb(var(--text-muted))]">{label}</span>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[10px] text-[rgb(var(--text-primary))] font-medium w-8 text-right shrink-0">{baseVal}</span>
                      {actualVal != null && (
                        <span className="text-[9px] text-[rgb(var(--text-faint))] w-10 text-right shrink-0">
                          → {actualVal}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Matchups */}
          <div className="grid grid-cols-2 gap-3">
            {/* Offensive */}
            <Section title="Matchups Ofensivos" icon={<Swords size={13} />}>
              <div className="space-y-2">
                {offensive.quad.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[rgb(var(--text-faint))] mb-1 flex items-center gap-1">
                      <TrendingUp size={9} className="text-green-400" /> 4x Super Eficaz
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {offensive.quad.map((t) => (
                        <TypeChip key={t} type={t} />
                      ))}
                    </div>
                  </div>
                )}
                {offensive.double.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[rgb(var(--text-faint))] mb-1 flex items-center gap-1">
                      <TrendingUp size={9} className="text-green-400" /> 2x Super Eficaz
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {offensive.double.map((t) => (
                        <TypeChip key={t} type={t} />
                      ))}
                    </div>
                  </div>
                )}
                {offensive.double.length === 0 && offensive.quad.length === 0 && (
                  <div className="text-[10px] text-[rgb(var(--text-faint))]">Nenhum super eficaz</div>
                )}
              </div>
            </Section>

            {/* Defensive */}
            <Section title="Matchups Defensivos" icon={<Shield size={13} />}>
              <div className="space-y-2">
                {defensive.weak.length > 0 && (
                  <div>
                    <div className="text-[9px] text-red-400 mb-1 flex items-center gap-1">
                      <TrendingDown size={9} /> Fraqueza
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {defensive.weak.map((t) => (
                        <TypeChip key={t} type={t} />
                      ))}
                    </div>
                  </div>
                )}
                {defensive.resist.length > 0 && (
                  <div>
                    <div className="text-[9px] text-green-400 mb-1 flex items-center gap-1">
                      <TrendingUp size={9} /> Resistencia
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {defensive.resist.map((t) => (
                        <TypeChip key={t} type={t} />
                      ))}
                    </div>
                  </div>
                )}
                {defensive.immune.length > 0 && (
                  <div>
                    <div className="text-[9px] text-[rgb(var(--text-muted))] mb-1 flex items-center gap-1">
                      <Minus size={9} /> Imunidade
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {defensive.immune.map((t) => (
                        <TypeChip key={t} type={t} />
                      ))}
                    </div>
                  </div>
                )}
                {defensive.weak.length === 0 && defensive.resist.length === 0 && defensive.immune.length === 0 && (
                  <div className="text-[10px] text-[rgb(var(--text-faint))]">Nenhum matchup defensivo</div>
                )}
              </div>
            </Section>
          </div>

          {/* Roadmap */}
          {roadmap && (
            <Section title="Rota Recomendada" icon={<Map size={13} />}>
              <div className="space-y-1">
                {roadmap.map(([minLv, maxLv, pokemon], i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1 rounded bg-[rgb(var(--bg-surface))]/50 text-[11px]"
                  >
                    <span className="text-[rgb(var(--text-faint))] w-16 shrink-0">
                      Lv. {minLv} - {maxLv ?? "∞"}
                    </span>
                    <ChevronRight size={10} className="text-[rgb(var(--text-faint))]" />
                    <span className="text-[rgb(var(--text-primary))]">{pokemon}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function IvBar({ label, value, max = 48 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-[rgb(var(--text-muted))] w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[rgb(var(--text-faint))] w-6 text-right shrink-0">{value}</span>
    </div>
  );
}

function TypeChip({ type }: { type: string }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${TYPE_BG[type] || TYPE_BG.normal}`}
    >
      {TYPE_PT[type] || type}
    </span>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold mb-2">
        {icon}{title}
      </div>
      {children}
    </div>
  );
}
