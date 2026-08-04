// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useBotStore } from "../../stores/botStore";
import { loadJSON } from "../../lib/dataLoader";
import { getRarity, getRarityLabel, getRarityColorHex } from "../../lib/rarity";
import type { LogEntry, ParsedCapture } from "../../stores/botStore";
import { CircleDot, Star, Zap, Trophy, Sparkles, Filter } from "lucide-react";

function getSpriteUrl(slug: string, dexMap: Record<string, number>): string {
  if (!slug) return "";
  const clean = slug
    .toLowerCase()
    .replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "")
    .replace(/^milch-/, "")
    .trim();
  const dex = dexMap[clean] || dexMap[slug.toLowerCase()] || 0;
  if (dex > 0)
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}


function rarityColor(r: string): string {
  const rarity = getRarity({ tier: r }) || getRarity({ rarity: r });
  const colors: Record<string, string> = {
    FRACA:    "bg-gray-500/20 text-gray-500 border-gray-500/30",
    COMMON:   "bg-gray-400/20 text-gray-400 border-gray-400/30",
    UNCOMMON: "bg-green-400/20 text-green-400 border-green-400/30",
    RARE:     "bg-blue-400/20 text-blue-400 border-blue-400/30",
    EPIC:     "bg-purple-400/20 text-purple-400 border-purple-400/30",
    LEGENDARY:"bg-amber-400/20 text-amber-400 border-amber-400/30",
    MYTHIC:   "bg-red-400/20 text-red-400 border-red-400/30",
    ANTIGA:   "bg-yellow-600/20 text-yellow-600 border-yellow-600/30",
    DIVINA:   "bg-white/20 text-white border-white/30",
  };
  return colors[rarity] || "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] border-[rgb(var(--border))]";
}

function ivBarColor(iv: number): string {
  if (iv >= 150) return "bg-green-500";
  if (iv >= 100) return "bg-yellow-500";
  return "bg-red-500";
}

function formatTime(ts: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

interface Props {
  accountName?: string;
  ivThreshold?: number;
}

export function CaptureLogPanel({
  accountName,
  ivThreshold = 120,
}: Props) {
  const { captures, significantCaptures, logs } = useBotStore();
  const [dexMap, setDexMap] = useState<Record<string, number>>({});

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
  }, []);

  const combinedEvents = useMemo(() => {
    const acctCaptures = captures.filter((c) => !accountName || c.account === accountName).map(c => ({ kind: "capture" as const, data: c, time: c.timestamp }));
    const acctLogs = logs.filter((l) => (!accountName || l.account === accountName) && (l.type === "CATCH" || l.type === "capture")).map(l => ({ kind: "log" as const, data: l, time: l.time }));
    
    return [...acctCaptures, ...acctLogs]
      .sort((a, b) => b.time - a.time)
      .slice(0, 100);
  }, [captures, logs, accountName]);

  const filteredSignificant = useMemo(() => {
    return significantCaptures
      .filter((c) => !accountName || c.account === accountName)
      .filter((c) => c.isFailedShiny || c.isShiny || c.ivTotal >= ivThreshold || ["EPIC", "LEGENDARY", "MYTHIC", "ANTIGA", "DIVINA"].includes(c.rarity))
      .slice(0, 30);
  }, [significantCaptures, accountName, ivThreshold]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]">
        <CircleDot size={18} /> Painel de Capturas
      </h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1">
          <RecentCapturesSection events={combinedEvents} dexMap={dexMap} />
        </div>
        <div className="col-span-2">
          <SignificantCapturesSection
            captures={filteredSignificant}
            dexMap={dexMap}
          />
        </div>
      </div>
    </div>
  );
}

export function RecentCapturesSection({
  events,
  dexMap,
}: {
  events: Array<{ kind: "capture" | "log", data: any, time: number }>;
  dexMap: Record<string, number>;
}) {
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[rgb(var(--border))] shrink-0">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[rgb(var(--text-primary))]">
          <CircleDot size={13} /> Logs de Captura ({events.length})
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {events.length === 0 && (
          <div className="text-[11px] text-[rgb(var(--text-faint))] italic py-2">
            Nenhum evento ainda
          </div>
        )}
        {events.map((ev, i) => {
          if (ev.kind === "log") {
            const l = ev.data as LogEntry;
            return (
              <div key={`log-${i}`} className="flex items-start gap-2 text-[11px] py-1 px-2 rounded hover:bg-[rgb(var(--bg-surface))]/50 transition-colors">
                <span className="text-[rgb(var(--text-faint))] shrink-0">[{formatTime(l.time)}]</span>
                <span className="text-[rgb(var(--text-secondary))] break-words">{l.text}</span>
              </div>
            );
          } else {
            const c = ev.data as ParsedCapture;
            return (
              <div key={`cap-${i}`} className="flex items-center gap-2 text-[11px] py-1 px-2 rounded hover:bg-[rgb(var(--bg-surface))]/50 transition-colors bg-[rgb(var(--bg-surface))]/30">
                <img
                  src={getSpriteUrl(c.name, dexMap)}
                  alt={c.name}
                  className="w-6 h-6 object-contain shrink-0"
                  onError={(e) => {
                    const dex = dexMap[c.name.toLowerCase()] || 0;
                    (e.target as HTMLImageElement).src =
                      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
                  }}
                />
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`font-medium truncate ${
                        c.isShiny ? "text-yellow-400" : (c.escaped ? "text-red-400/80" : "text-[rgb(var(--text-primary))]")
                      }`}
                    >
                      {c.name}
                    </span>
                    {c.escaped && (
                      <span className="px-1 rounded text-[8px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">ESCAPOU</span>
                    )}
                    {c.isShiny && (
                      <Sparkles size={10} className="text-yellow-400 shrink-0" />
                    )}
                <span className="text-[10px] text-[rgb(var(--text-muted))] shrink-0">
                  Lv.{c.level || 1}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 mb-1 flex-wrap">
                <span className={`px-1 py-0.5 rounded text-[8px] font-semibold border ${rarityColor(c.rarity || "COMMON")}`}>
                  {c.rarity || "COMMON"}
                </span>
                {c.ivTotal > 0 && (
                  <span className="text-[9px] text-[rgb(var(--text-secondary))]">IV: {c.ivTotal}/192</span>
                )}
                {c.quality && parseFloat(c.quality) > 0 && (
                  <span className="text-[9px] text-purple-400">Q: {parseFloat(c.quality).toFixed(3)}</span>
                )}
                {c.score != null && c.score > 0 && (
                  <span className="text-[9px] text-[rgb(var(--text-secondary))]">Score: {c.score}</span>
                )}
              </div>
              <div className="text-[9px] text-[rgb(var(--text-faint))] truncate">
                {c.account} · {formatTime(c.timestamp)}
              </div>
            </div>
          </div>
        );
        }
        })}
      </div>
    </div>
  );
}

export function SignificantCapturesSection({
  captures,
  dexMap,
}: {
  captures: ParsedCapture[];
  dexMap: Record<string, number>;
}) {
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[rgb(var(--border))] shrink-0">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[rgb(var(--text-primary))]">
          <Star size={13} className="text-amber-400" /> Capturas Significativas ({captures.length})
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {captures.length === 0 && (
          <div className="text-[11px] text-[rgb(var(--text-faint))] italic py-2">
            Nenhuma captura significativa ainda
          </div>
        )}
        {captures.map((c, i) => (
          <SignificantCard key={i} capture={c} dexMap={dexMap} />
        ))}
      </div>
    </div>
  );
}

function SignificantCard({
  capture: c,
  dexMap,
}: {
  capture: ParsedCapture;
  dexMap: Record<string, number>;
}) {
  const ivPct = c.ivTotal > 0 ? Math.min((c.ivTotal / 192) * 100, 100) : 0;

  return (
    <div className="bg-[rgb(var(--bg-surface))]/60 border border-[rgb(var(--border))] rounded-lg p-3 hover:border-[rgb(var(--accent))]/40 transition-colors">
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <img
            src={getSpriteUrl(c.name, dexMap)}
            alt={c.name}
            className="w-10 h-10 object-contain"
            onError={(e) => {
              const dex = dexMap[c.name.toLowerCase()] || 0;
              (e.target as HTMLImageElement).src =
                `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
            }}
          />
          {c.isShiny && (
            <div className="absolute -top-1 -right-1">
              <Sparkles size={12} className="text-yellow-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-[13px] font-semibold ${
                c.isShiny ? "text-yellow-400" : "text-[rgb(var(--text-primary))]"
              }`}
            >
              {c.name}
            </span>
            {c.level && (
              <span className="text-[11px] text-[rgb(var(--text-muted))]">
                Lv.{c.level}
              </span>
            )}
            <span className="text-[10px] text-[rgb(var(--text-faint))]">
              {c.account}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {c.ivTotal > 0 && (
              <div className="flex items-center gap-1.5 min-w-[120px]">
                <div className="flex-1 h-2 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${ivBarColor(c.ivTotal)}`}
                    style={{ width: `${ivPct}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-[rgb(var(--text-secondary))] shrink-0">
                  {c.ivTotal}/192
                </span>
              </div>
            )}

            {c.quality && (
              <div className="flex items-center gap-1">
                <Zap size={10} className="text-purple-400" />
                <span className="text-[10px] text-purple-400 font-medium">
                  Q: {c.quality}
                </span>
              </div>
            )}

            {c.power && (
              <div className="flex items-center gap-1">
                <Trophy size={10} className="text-orange-400" />
                <span className="text-[10px] text-orange-400 font-medium">
                  {c.power}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {c.rarity && (
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${rarityColor(
                  c.rarity
                )}`}
              >
                {c.rarity}
              </span>
            )}
            {c.isShiny && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                <Sparkles size={8} /> SHINY
              </span>
            )}
            {c.isFailedShiny && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
                FALHA SHINY
              </span>
            )}
          </div>

          <div className="text-[9px] text-[rgb(var(--text-faint))]">
            {formatTime(c.timestamp)}
          </div>
        </div>
      </div>
    </div>
  );
}
