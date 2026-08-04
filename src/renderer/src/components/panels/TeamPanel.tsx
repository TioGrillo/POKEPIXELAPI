import { useState, useEffect } from "react";
import { invoke } from "../../lib/ipc";
import { useBotStore } from "../../stores/botStore";
import { loadJSON } from "../../lib/dataLoader";
import { RARITY_COLORS, TIER_COLORS, RARITY_TIER, getRarity, getTier } from "../../lib/rarity";
import type { Rarity } from "../../lib/rarity";
import { getPokemonDisplayName } from "../../lib/pokemonUtils";
import { Star, Zap, Shield, Heart, Swords, Crown, Sparkles } from "lucide-react";

interface Props {
  accountName: string;
  onRefresh: () => void;
}

const TYPE_COLORS: Record<string, string> = {
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

function getSpriteUrl(slug: string): string {
  return `https://pokepixel.nietore.com/assets/imported/creatures/${slug}/front.png`;
}

function getPngFallback(speciesId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
}

function IvBar({ label, value, max = 192 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[9px] text-[rgb(var(--text-muted))] w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-[rgb(var(--text-faint))] w-8 text-right shrink-0">{value}</span>
    </div>
  );
}

function XpBar({ xp, xpForNext }: { xp: number; xpForNext: number }) {
  const pct = xpForNext > 0 ? Math.min((xp / xpForNext) * 100, 100) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-[9px] text-[rgb(var(--text-muted))] mb-0.5">
        <span>XP</span>
        <span>{xp.toLocaleString()} / {xpForNext.toLocaleString()}</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
        <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatPreview({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1">
      {icon}
      <span className="text-[9px] text-[rgb(var(--text-muted))]">{label}</span>
      <span className="text-[10px] text-[rgb(var(--text-primary))] font-medium">{value}</span>
    </div>
  );
}

export function TeamPanel({ accountName, onRefresh }: Props) {
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<"score" | "level" | "rarity">("score");
  const { stats } = useBotStore();
  const botStats = stats[accountName];
  const team = botStats?.team || [];
  const leaderId = team.find((p: any) => p.leader)?.id || team[0]?.id;

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
  }, []);

  const sortedTeam = [...team].sort((a, b) => {
    if (sortBy === "score") {
      return (b.score || 0) - (a.score || 0);
    }
    if (sortBy === "level") {
      return (b.level ?? b.lv ?? 0) - (a.level ?? a.lv ?? 0);
    }
    if (sortBy === "rarity") {
      return (RARITY_TIER[String(getRarity(b)).toLowerCase()] ?? 0) - (RARITY_TIER[String(getRarity(a)).toLowerCase()] ?? 0);
    }
    return 0;
  });

  const getSpeciesSlug = (pokemon: any): string => {
    const raw = (pokemon.species_id || pokemon.species || pokemon.name || pokemon.slug || "").toLowerCase();
    return raw.replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "").replace(/^milch-/, "").trim();
  };

  const getSpeciesId = (pokemon: any): number => {
    if (pokemon.dexId) return pokemon.dexId;
    if (pokemon.dex_id) return pokemon.dex_id;
    if (pokemon.pokemonId) return pokemon.pokemonId;
    if (pokemon.speciesId) return pokemon.speciesId;
    if (pokemon.species_id) return pokemon.species_id;
    if (pokemon.monster_id) return pokemon.monster_id;
    const name = (pokemon.species || pokemon.name || "").toLowerCase();
    const clean = name
      .replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "")
      .replace(/^milch-/, "")
      .trim();
    return dexMap[clean] || dexMap[name] || 0;
  };

  const getQualityMultiplier = (p: any): number => {
    if (typeof p.quality === 'number') return p.quality;
    if (p.quality_modifier !== undefined) return Number(p.quality_modifier);
    if (p.multiplier !== undefined) return Number(p.multiplier);
    const qStr = String(p.quality || p.rarity || "").toLowerCase();
    if (qStr.includes("divin")) return 2.5;
    if (qStr.includes("antig") || qStr.includes("ancient")) return 2.0;
    if (qStr.includes("mitic") || qStr.includes("mythic")) return 1.9;
    if (qStr.includes("lendar") || qStr.includes("legendary")) return 1.7;
    if (qStr.includes("epic")) return 1.5;
    if (qStr.includes("rar")) return 1.3;
    if (qStr.includes("incomum") || qStr.includes("uncommon")) return 1.1;
    return 1.0;
  };

  const extractTypes = (pokemon: any): string[] => {
    const t1 = (pokemon.type1 || "").toLowerCase();
    const t2 = (pokemon.type2 || "").toLowerCase();
    if (t1 && t2) return [t1, t2];
    if (t1) return [t1];
    if (Array.isArray(pokemon.types) && pokemon.types.length > 0) {
      return pokemon.types.map((t: string) => String(t).toLowerCase());
    }
    if (pokemon.type && typeof pokemon.type === "object") {
      const first = (pokemon.type.first || "").toLowerCase();
      const second = (pokemon.type.second || "").toLowerCase();
      if (first && second) return [first, second];
      if (first) return [first];
    }
    return [];
  };

  const handleSetLeader = (pokemonId: string) => {
    invoke("bot:set-leader", accountName, pokemonId).then(() => {
      onRefresh();
    });
  };

  const handleRemoveFromTeam = (pokemonId: string) => {
    invoke("bot:remove-team", accountName, pokemonId).then(() => {
      onRefresh();
    });
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]">
          <Crown size={18} /> Time
        </h1>
        <div className="flex items-center gap-3">
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] text-[12px] px-2 py-1 rounded focus:outline-none"
          >
            <option value="score">Maior Score</option>
            <option value="level">Maior Level</option>
            <option value="rarity">Maior Raridade</option>
          </select>
          <span className="text-[12px] text-[rgb(var(--text-muted))]">{accountName}</span>
        </div>
      </div>

      {sortedTeam.length === 0 ? (
        <div className="text-center py-12 text-[rgb(var(--text-faint))] text-[13px]">
          Nenhum pokemon no time. Acesse "Meus Pokemon" para adicionar Pokémons ao time.
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedTeam.map((pokemon) => {
            const speciesId = getSpeciesId(pokemon);
            const speciesSlug = getSpeciesSlug(pokemon);
            const isLeader = pokemon.id === leaderId || pokemon.leader === true;
            const ivTotal = pokemon.ivTotal ?? (pokemon.ivs ? Object.values(pokemon.ivs).reduce((a: any, b: any) => Number(a) + Number(b), 0) : 0);
            const ivs = pokemon.ivs || {};
            const types: string[] = extractTypes(pokemon);
            const statsData = pokemon.stats || {};

            return (
              <div
                key={pokemon.id}
                className={`bg-[rgb(var(--bg-base))] border rounded-lg p-3 space-y-2 transition-all ${
                  isLeader ? "border-yellow-500/50 shadow-[0_0_8px_rgba(234,179,8,0.15)]" : "border-[rgb(var(--border))]"
                }`}
              >
                {/* Header: Sprite + Name + Level */}
                <div className="flex items-start gap-2">
                  <div className="relative shrink-0">
                    {speciesSlug ? (
                      <img
                        src={getSpriteUrl(speciesSlug)}
                        alt={pokemon.species || pokemon.name}
                        className="w-14 h-14 object-contain"
                        onError={(e) => {
                          if (speciesId > 0) {
                            (e.target as HTMLImageElement).src = getPngFallback(speciesId);
                          } else {
                            (e.target as HTMLImageElement).style.display = "none";
                          }
                        }}
                      />
                    ) : speciesId > 0 ? (
                      <img
                        src={getPngFallback(speciesId)}
                        alt={pokemon.species || pokemon.name}
                        className="w-14 h-14 object-contain"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded bg-[rgb(var(--bg-surface))] flex items-center justify-center text-[rgb(var(--text-faint))] text-[10px]">?</div>
                    )}
                    {pokemon.shiny && (
                      <Star size={10} className="absolute -top-0.5 -right-0.5 text-yellow-400 fill-yellow-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))] capitalize truncate">
                        {getPokemonDisplayName(pokemon)}
                      </span>
                      {pokemon.shiny && <Sparkles size={10} className="text-yellow-400 shrink-0" />}
                    </div>
                    <div className="text-[10px] text-[rgb(var(--text-muted))]">
                      Lv. {pokemon.level ?? pokemon.lv ?? "?"}
                    </div>
                  </div>
                  {isLeader && (
                    <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-yellow-500/20 border border-yellow-500/30 text-[9px] font-medium text-yellow-400 shrink-0">
                      <Crown size={8} /> Líder
                    </span>
                  )}
                </div>

                {/* Type badges */}
                {types.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {types.map((t: string) => (
                      <span
                        key={t}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-medium border ${TYPE_COLORS[t.toLowerCase()] || "bg-gray-500/20 text-gray-300 border-gray-500/30"}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* XP Bar */}
                <XpBar xp={pokemon.xp ?? 0} xpForNext={pokemon.xpForNext ?? 1} />

                {/* Stats preview */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                  <StatPreview icon={<Heart size={8} className="text-green-400" />} label="HP" value={statsData.hp ?? pokemon.hp ?? 0} />
                  <StatPreview icon={<Swords size={8} className="text-red-400" />} label="ATK" value={statsData.atk ?? pokemon.atk ?? 0} />
                  <StatPreview icon={<Shield size={8} className="text-blue-400" />} label="DEF" value={statsData.def ?? pokemon.def ?? 0} />
                  <StatPreview icon={<Zap size={8} className="text-yellow-400" />} label="SPD" value={statsData.spd ?? pokemon.spe ?? 0} />
                </div>

                {/* IV bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-[rgb(var(--text-muted))]">IVs</span>
                    <span className="text-[9px] text-[rgb(var(--text-faint))]">{ivTotal} / 192</span>
                  </div>
                  {ivs.hp != null && <IvBar label="HP" value={ivs.hp} />}
                  {ivs.atk != null && <IvBar label="ATK" value={ivs.atk} />}
                  {ivs.def != null && <IvBar label="DEF" value={ivs.def} />}
                  {ivs.spd != null && <IvBar label="SPD" value={ivs.spd} />}
                </div>

                {/* Quality + Power + Rarity + Tier */}
                <div className="flex items-center gap-2 flex-wrap">
                  {getQualityMultiplier(pokemon) > 0 && (
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-[rgb(var(--text-muted))]">Q:</span>
                      <span className={`text-[10px] font-semibold ${getQualityMultiplier(pokemon) >= 2 ? "text-yellow-400" : getQualityMultiplier(pokemon) >= 1.5 ? "text-purple-400" : "text-[rgb(var(--text-primary))]"}`}>
                        {getQualityMultiplier(pokemon).toFixed(2)}x
                      </span>
                    </div>
                  )}
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${TIER_COLORS[getTier(pokemon)] || TIER_COLORS.D}`}>Tier {getTier(pokemon)}</span>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${RARITY_COLORS[getRarity(pokemon)]}`}>{getRarity(pokemon)}</span>
                </div>

                {/* Buttons: Set Leader & Remove from Team */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {isLeader ? (
                    <div className="flex items-center justify-center gap-1 py-1 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-medium">
                      <Crown size={10} /> Líder Atual
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSetLeader(pokemon.id)}
                      className="flex items-center justify-center gap-1 py-1 rounded bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-medium hover:bg-yellow-500/30 transition-colors"
                    >
                      <Crown size={10} /> Definir Líder
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveFromTeam(pokemon.id)}
                    className="flex items-center justify-center gap-1 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-medium hover:bg-red-500/20 transition-colors"
                  >
                    Remover do Time
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
