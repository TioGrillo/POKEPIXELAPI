import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "../../lib/ipc";
import {
  Radar, Sparkles, Crown, Navigation, RefreshCw,
  Zap, Shield, Star, Eye, Settings, Bell, BellOff,
  Circle, Leaf, Droplets, Gem, Check, Timer, Volume2, VolumeX,
  Target, History, Crosshair, TrendingUp, Activity,
} from "lucide-react";
import { loadJSON } from "../../lib/dataLoader";

interface Props {
  accountName: string;
  onRefresh: () => void;
}

interface ShinyEntry {
  hunt_id: string;
  hunt_name: string;
  map_id: number;
  species_id: string;
  quality: string;
  is_shiny: boolean;
  iv_total: number;
  ivs: Record<string, number>;
  nature: string;
  gender: string;
  level: number;
  event_id: number;
  monster_id: string;
}

interface RadarHit {
  type: string;
  species_id: string;
  quality: string;
  is_shiny: boolean;
  level: number;
  hp: number;
  ivs: Record<string, number>;
  hunt_id: string;
  monster_id: string;
  ts: string;
}

const QUALITIES = [
  { key: "common",    label: "Comum",    color: "text-gray-400",   bg: "bg-gray-500/20",   border: "border-gray-500/30",   Icon: Circle   },
  { key: "uncommon", label: "Incomum",  color: "text-green-400",  bg: "bg-green-500/20",  border: "border-green-500/30",  Icon: Leaf     },
  { key: "rare",     label: "Rara",     color: "text-blue-400",   bg: "bg-blue-500/20",   border: "border-blue-500/30",   Icon: Droplets },
  { key: "epic",     label: "Épica",    color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", Icon: Gem      },
  { key: "legendary",label: "Lendária", color: "text-amber-400",  bg: "bg-amber-500/20",  border: "border-amber-500/30",  Icon: Crown    },
];

function getQualityStyle(q: string) {
  return QUALITIES.find((x) => x.key === q.toLowerCase()) || QUALITIES[0];
}

function getSpriteUrl(speciesId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${speciesId}.gif`;
}
function getPngFallback(speciesId: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`;
}

const shinyCache = new Map<string, { shinies: ShinyEntry[]; lastScan: string }>();
const scanningAccounts = new Set<string>();

// Persistent history key
const HISTORY_KEY = "pokepixel_radar_history";
function loadHistory(): RadarHit[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory(hits: RadarHit[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hits.slice(0, 200)));
}

export function ShinyRadarPanel({ accountName, onRefresh }: Props) {
  // ── Live Radar ──
  const [radarHits, setRadarHits] = useState<RadarHit[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("radar_sound") !== "off";
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Min Quality Combat Filter ──
  const [minQuality, setMinQuality] = useState<string>("common");
  const [savingQuality, setSavingQuality] = useState(false);
  const [qualitySaved, setQualitySaved] = useState(false);

  // ── Auto-Scan ── (persiste no localStorage para sobreviver à troca de aba)
  const [autoScan, setAutoScan] = useState(() => localStorage.getItem("radar_autoscan") === "on");
  const [autoScanMinutes, setAutoScanMinutes] = useState(() => {
    const v = parseInt(localStorage.getItem("radar_autoscan_minutes") || "5", 10);
    return isNaN(v) || v < 1 ? 5 : v;
  });
  const autoScanRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auto-Go (persiste no localStorage para sobreviver à troca de aba)
  const [autoGo, setAutoGo] = useState(() => localStorage.getItem("radar_autogo") === "on");

  // ── Session Counters ──
  const [sessionCounters, setSessionCounters] = useState({ shiny: 0, epic: 0, legendary: 0, rare: 0, total: 0 });

  // ── Persistent History ──
  const [history, setHistory] = useState<RadarHit[]>(loadHistory);

  // Restore cache logic on mount
  useEffect(() => {
    const cached = shinyCache.get(accountName);
    if (cached) {
      setShinies(cached.shinies || []);
      setLastScan(cached.lastScan);
    }
  }, [accountName]);

  // ── Server Scan ──
  const cached = shinyCache.get(accountName);
  const [shinies, setShinies] = useState<ShinyEntry[]>(cached?.shinies || []);
  const [loading, setLoading] = useState(scanningAccounts.has(accountName));
  const [error, setError] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(cached?.lastScan || null);
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [filterType, setFilterType] = useState<"all" | "shiny" | "legendary" | "epic" | "rare" | "uncommon">("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"live" | "scan" | "history">("live");

  // Load pokedex mapping
  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then((data) => {
      if (data && typeof data === "object") setDexMap(data);
    }).catch(() => {});
  }, []);

  // Load minQuality on mount
  useEffect(() => {
    invoke<any[]>("accounts:list").then(accounts => {
      const acc = accounts.find((a: any) => a.name === accountName);
      if (acc && acc.hunt_min_quality) {
        setMinQuality(acc.hunt_min_quality);
      }
    });
  }, [accountName]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.1);
      osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, [soundEnabled]);

  // Track previously seen hits to detect new ones
  const lastHitCountRef = useRef(0);

  // Poll live radar hits every 2s
  useEffect(() => {
    const fetchHits = async () => {
      try {
        const hits = await invoke<RadarHit[]>("bot:get-radar-hits", accountName);
        if (hits && hits.length > 0) {
          const sliced = hits.slice(0, 50);
          setRadarHits(sliced);

          // Check for new hits (compare count)
          if (sliced.length > lastHitCountRef.current) {
            const newHits = sliced.slice(0, sliced.length - lastHitCountRef.current);
            // Update counters
            setSessionCounters(prev => {
              const updated = { ...prev };
              for (const h of newHits) {
                updated.total++;
                if (h.is_shiny) updated.shiny++;
                else if (h.quality === "legendary") updated.legendary++;
                else if (h.quality === "epic") updated.epic++;
                else if (h.quality === "rare") updated.rare++;
              }
              return updated;
            });

            // Save to history
            setHistory(prev => {
              const updated = [...newHits, ...prev].slice(0, 200);
              saveHistory(updated);
              return updated;
            });

            // Play sound for shiny/legendary
            const hasImportant = newHits.some(h => h.is_shiny || h.quality === "legendary");
            if (hasImportant) {
              playNotificationSound();
            }

            // Auto-Go: if shiny detected and auto-go is on
            if (autoGo) {
              const shinyHit = newHits.find(h => h.is_shiny);
              if (shinyHit) {
                try {
                  await invoke("bot:stop-hunt", accountName);
                  await new Promise(r => setTimeout(r, 1000));
                  await invoke("bot:start-hunt", accountName, shinyHit.hunt_id, shinyHit.species_id);
                  onRefresh();
                } catch {}
              }
            }
          }
          lastHitCountRef.current = sliced.length;
        }
      } catch {}
    };
    fetchHits();
    pollRef.current = setInterval(fetchHits, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [accountName, autoGo, playNotificationSound]);

  // ─── Stable refs (atualizados a cada render, sem useEffect) ───────────────
  const loadingRef = useRef(false);
  loadingRef.current = loading; // Lido pelos callbacks de effects para evitar closure estale

  // Ref para a função handleScan — atualizado após cada render
  const handleScanCallbackRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // Auto-Scan timer — usa refs para evitar re-criação desnecessária de intervals
  useEffect(() => {
    if (!autoScan || autoScanMinutes <= 0) return;
    // Não dispara imediatamente se já há um scan em andamento
    if (!loadingRef.current) {
      handleScanCallbackRef.current?.();
    }
    autoScanRef.current = setInterval(() => {
      if (!loadingRef.current) {
        handleScanCallbackRef.current?.();
      }
    }, autoScanMinutes * 60 * 1000);
    return () => {
      if (autoScanRef.current) clearInterval(autoScanRef.current);
    };
  }, [autoScan, autoScanMinutes]);

  // Cleanup ao desmontar: limpa apenas o intervalo.
  // O scan em andamento NÃO é cancelado — ele termina em background e atualiza o cache,
  // de forma que os resultados apareçam ao retornar para esta aba.
  useEffect(() => {
    return () => {
      if (autoScanRef.current) clearInterval(autoScanRef.current);
    };
  }, [accountName]);

  // ── Handlers ──
  const handleSetMinQuality = async (q: string) => {
    setMinQuality(q);
    setSavingQuality(true);
    try {
      await invoke("bot:set-hunt-settings", accountName, { min_quality: q });
      const accounts = await invoke<any[]>("accounts:list");
      const acc = accounts.find((a: any) => a.name === accountName);
      if (acc) {
        acc.hunt_min_quality = q;
        await invoke("accounts:save", accounts);
      }
      setQualitySaved(true);
      setTimeout(() => setQualitySaved(false), 2000);
    } catch {}
    setSavingQuality(false);
  };

  // useCallback estabiliza a referência e evita closures estale no auto-scan effect
  const handleScan = useCallback(async () => {
    if (loadingRef.current) return; // Já está em andamento — não duplicar
    setLoading(true);
    scanningAccounts.add(accountName);
    setError(null);
    try {
      const res = await invoke<ShinyEntry[]>("bot:scan-shinies", accountName);
      const now = new Date().toLocaleTimeString("pt-BR");
      const list = res || [];
      setShinies(list);
      setLastScan(now);
      shinyCache.set(accountName, { shinies: list, lastScan: now });
    } catch (e: any) {
      setError(e?.message || "Erro ao varrer. Certifique-se de que o bot está rodando.");
    } finally {
      setLoading(false);
      scanningAccounts.delete(accountName);
    }
  }, [accountName]);

  // Mantém a ref sempre atualizada com a versão mais recente do callback
  handleScanCallbackRef.current = handleScan;

  const handleCancelScan = async () => {
    try { await invoke("bot:cancel-scan", accountName); } catch {}
    setLoading(false);
    scanningAccounts.delete(accountName);
  };

  const handleGoHunt = async (hit: RadarHit | ShinyEntry) => {
    const zoneId = (hit as any).hunt_id;
    const speciesId = hit.species_id;
    const label = (hit as any).is_shiny ? "SHINY" : (hit as any).quality?.toUpperCase();
    if (autoGo || window.confirm(`Mover para "${zoneId}" e tentar capturar ${speciesId} ${label}?`)) {
      try { await invoke("bot:stop-hunt", accountName); } catch {}
      await new Promise(r => setTimeout(r, 1000));
      await invoke("bot:start-hunt", accountName, zoneId, speciesId);
      onRefresh();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const getSpeciesDexId = (s: string) => dexMap[s.toLowerCase().trim()] || 0;

  const filtered = shinies.filter((s) => {
    if (filterType === "shiny" && !s.is_shiny) return false;
    if (filterType === "legendary" && s.quality?.toLowerCase() !== "legendary") return false;
    if (filterType === "epic" && s.quality?.toLowerCase() !== "epic") return false;
    if (filterType === "rare" && s.quality?.toLowerCase() !== "rare") return false;
    if (filterType === "uncommon" && s.quality?.toLowerCase() !== "uncommon") return false;
    if (search && !s.species_id.toLowerCase().includes(search.toLowerCase()) && !(s as any).hunt_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Toggle sound
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("radar_sound", next ? "on" : "off");
  };

  // Toggle autoScan com persistência
  const toggleAutoScan = () => {
    const next = !autoScan;
    setAutoScan(next);
    localStorage.setItem("radar_autoscan", next ? "on" : "off");
  };

  // Toggle autoGo com persistência
  const toggleAutoGo = () => {
    const next = !autoGo;
    setAutoGo(next);
    localStorage.setItem("radar_autogo", next ? "on" : "off");
  };

  // Persist autoScanMinutes
  const handleAutoScanMinutesChange = (v: number) => {
    setAutoScanMinutes(v);
    localStorage.setItem("radar_autoscan_minutes", String(v));
  };

  // ── Render helpers ──
  const renderIVs = (ivs: Record<string, number>) => (
    <div className="grid grid-cols-3 gap-1 text-[9px]">
      {[["HP","hp","text-green-400"],["ATK","atk","text-red-400"],["DEF","def","text-blue-400"],
        ["SpA","spa","text-purple-400"],["SpD","spd","text-cyan-400"],["SPE","spe","text-yellow-400"]].map(([label, key, color]) => (
        <div key={key} className="bg-[rgb(var(--bg-surface))] p-1 rounded text-center">
          <span className="text-[rgb(var(--text-muted))] block">{label}</span>
          <span className={`font-semibold ${color}`}>{ivs?.[key] ?? "?"}</span>
        </div>
      ))}
    </div>
  );

  const renderHitCard = (hit: RadarHit | ShinyEntry, idx: number, showGoButton = true) => {
    const dexId = getSpeciesDexId(hit.species_id);
    const qs = getQualityStyle((hit as any).quality || "common");
    const time = (hit as any).ts ? new Date((hit as any).ts).toLocaleTimeString("pt-BR") : "";
    const isShiny = (hit as any).is_shiny;
    return (
      <div
        key={`${hit.monster_id}_${idx}`}
        className={`rounded-xl border p-3 space-y-3 transition-all ${
          isShiny
            ? "border-yellow-500/60 bg-gradient-to-b from-yellow-500/10 to-transparent shadow-[0_0_16px_rgba(234,179,8,0.25)]"
            : (hit as any).quality === "legendary"
            ? "border-amber-500/50 bg-gradient-to-b from-amber-500/8 to-transparent shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            : (hit as any).quality === "epic"
            ? "border-purple-500/50 bg-gradient-to-b from-purple-500/8 to-transparent"
            : "border-blue-500/40 bg-gradient-to-b from-blue-500/5 to-transparent"
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 bg-[rgb(var(--bg-surface))] rounded-lg border border-[rgb(var(--border))] flex items-center justify-center shrink-0">
              {dexId > 0 ? (
                <img
                  src={getSpriteUrl(dexId)}
                  alt={hit.species_id}
                  className="w-12 h-12 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = getPngFallback(dexId); }}
                />
              ) : (
                <Radar size={24} className="text-[rgb(var(--text-faint))]" />
              )}
              {isShiny && <Sparkles size={13} className="absolute -top-1 -right-1 text-yellow-400 fill-yellow-400" />}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14px] font-bold text-[rgb(var(--text-primary))] capitalize">{hit.species_id}</span>
                {isShiny && (
                  <span className="flex items-center gap-1 px-1.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                    <Sparkles size={9} className="fill-yellow-400" /> SHINY
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">
                Lv. {hit.level} {(hit as any).hp !== undefined && `• HP: ${(hit as any).hp}`} {time && `• ${time}`}
              </div>
            </div>
          </div>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border shrink-0 capitalize ${qs.bg} ${qs.color} ${qs.border}`}>
            {qs.Icon && <qs.Icon size={9} />} {qs.label}
          </span>
        </div>

        {hit.ivs && Object.keys(hit.ivs).length > 0 && renderIVs(hit.ivs)}

        {/* Hunt info */}
        {(hit as any).hunt_name && (
          <div className="bg-[rgb(var(--bg-surface))] p-2 rounded-lg border border-[rgb(var(--border))] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[rgb(var(--text-primary))] font-medium">
              <Navigation size={12} className="text-[rgb(var(--accent))]" />
              <span>{(hit as any).hunt_name || (hit as any).hunt_id}</span>
            </div>
            {(hit as any).iv_total !== undefined && (
              <span className="text-[10px] text-[rgb(var(--text-muted))] font-mono">
                {(hit as any).iv_total}/186 IVs
              </span>
            )}
          </div>
        )}

        {showGoButton && (
          <button
            onClick={() => handleGoHunt(hit)}
            className={`w-full py-2 rounded-lg text-[12px] font-bold transition-all flex items-center justify-center gap-1.5 ${
              isShiny
                ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:brightness-110"
                : "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:brightness-110"
            }`}
          >
            <Navigation size={13} />
            {autoGo ? "Auto-Move Ativo" : "Ir para esta Hunt"}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-4">
      {/* ── Header ── */}
      <div className="bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
            <Radar size={22} />
          </div>
          <div>
            <h1 className="text-base font-bold text-[rgb(var(--text-primary))]">Radar de Shinies & Raros</h1>
            <p className="text-[12px] text-[rgb(var(--text-muted))]">
              Detecção ao vivo e varredura do servidor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              soundEnabled
                ? "bg-green-500/20 border-green-500/40 text-green-400"
                : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
            }`}
          >
            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            Som
          </button>
          {/* Auto-Go toggle */}
          <button
            onClick={toggleAutoGo}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              autoGo
                ? "bg-red-500/20 border-red-500/40 text-red-400 animate-pulse"
                : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
            }`}
          >
            <Crosshair size={13} />
            Auto-Go {autoGo ? "ON" : "OFF"}
          </button>
          {/* Alerts toggle */}
          <button
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
              alertsEnabled
                ? "bg-yellow-500/20 border-yellow-500/40 text-yellow-400"
                : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
            }`}
          >
            {alertsEnabled ? <Bell size={13} /> : <BellOff size={13} />}
            Alertas {alertsEnabled ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* ── Session Stats ── */}
      <div className="grid grid-cols-5 gap-2">
        {[
          { label: "Total", value: sessionCounters.total, color: "text-[rgb(var(--text-primary))]", bg: "bg-[rgb(var(--bg-surface))]" },
          { label: "Shinies", value: sessionCounters.shiny, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          { label: "Lendários", value: sessionCounters.legendary, color: "text-amber-400", bg: "bg-amber-500/10" },
          { label: "Épicos", value: sessionCounters.epic, color: "text-purple-400", bg: "bg-purple-500/10" },
          { label: "Raros", value: sessionCounters.rare, color: "text-blue-400", bg: "bg-blue-500/10" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border border-[rgb(var(--border))] rounded-lg p-2 text-center`}>
            <div className={`text-[16px] font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-[rgb(var(--text-muted))]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Min Quality Combat Filter ── */}
      <div className="bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-[rgb(var(--accent))]" />
          <span className="text-[13px] font-bold text-[rgb(var(--text-primary))]">Raridade Mínima de Combate</span>
          {qualitySaved && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-green-500/20 border border-green-500/30 text-green-400 font-semibold animate-pulse">
              <Check size={10} /> Salvo!
            </span>
          )}
        </div>
        <p className="text-[11px] text-[rgb(var(--text-muted))]">
          O servidor só capturará Pokémon com qualidade igual ou superior à selecionada.
          Raros, épicos e lendários sempre aparecem no radar independente do filtro.
        </p>
        <div className="flex flex-wrap gap-2">
          {QUALITIES.map((q) => (
            <button
              key={q.key}
              onClick={() => handleSetMinQuality(q.key)}
              disabled={savingQuality}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-all disabled:opacity-60 ${
                minQuality === q.key
                  ? `${q.bg} ${q.border} ${q.color} shadow-lg scale-105`
                  : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--accent))]/50"
              }`}
            >
              <q.Icon size={13} />
              {q.label}
              {minQuality === q.key && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[rgb(var(--text-faint))]">
          Ex: selecionar "Épica" faz o servidor capturar apenas épicos e acima (o bot ainda luta com todos para ganhar XP e ouro, mas o servidor só captura os acima do mínimo).
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 border-b border-[rgb(var(--border))] pb-0">
        <button
          onClick={() => setActiveTab("live")}
          className={`px-4 py-2 text-[12px] font-semibold border-b-2 transition-all ${
            activeTab === "live"
              ? "border-yellow-400 text-yellow-400"
              : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
          }`}
        >
          ⚡ Radar ao Vivo {radarHits.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] bg-yellow-500/20 text-yellow-400">{radarHits.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("scan")}
          className={`px-4 py-2 text-[12px] font-semibold border-b-2 transition-all ${
            activeTab === "scan"
              ? "border-[rgb(var(--accent))] text-[rgb(var(--accent))]"
              : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
          }`}
        >
          🔍 Varredura do Servidor
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 text-[12px] font-semibold border-b-2 transition-all ${
            activeTab === "history"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
          }`}
        >
          📜 Histórico ({history.length})
        </button>
      </div>

      {/* ── Tab: Live Radar ── */}
      {activeTab === "live" && (
        <div className="space-y-3">
          {radarHits.length === 0 ? (
            <div className="text-center py-16 bg-[rgb(var(--bg-base))] rounded-xl border border-[rgb(var(--border))] space-y-3">
              <div className="inline-block p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
                <Eye size={28} />
              </div>
              <p className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">Monitorando em tempo real...</p>
              <p className="text-[11px] text-[rgb(var(--text-muted))]">
                Quando um Shiny, Raro, Épico ou Lendário aparecer na sua hunt atual, ele aparecerá aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {radarHits.map((hit, idx) => renderHitCard(hit, idx))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Server Scan ── */}
      {activeTab === "scan" && (
        <div className="space-y-4">
          {/* Auto-Scan controls */}
          <div className="bg-[rgb(var(--bg-surface))] p-3 rounded-xl border border-[rgb(var(--border))] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Timer size={14} className="text-[rgb(var(--accent))]" />
              <span className="text-[12px] font-semibold text-[rgb(var(--text-primary))]">Auto-Scan</span>
              <button
                onClick={toggleAutoScan}
                className={`relative w-9 h-5 rounded-full transition-colors ${autoScan ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-elevated))]"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${autoScan ? "translate-x-4" : ""}`} />
              </button>
              {autoScan && (
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-[rgb(var(--text-muted))]">a cada</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={autoScanMinutes}
                    onChange={(e) => handleAutoScanMinutesChange(Math.max(1, Number(e.target.value)))}
                    className="w-12 px-1 py-0.5 rounded bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] text-center"
                  />
                  <span className="text-[rgb(var(--text-muted))]">min</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {loading ? (
                <button
                  onClick={handleCancelScan}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-[12px] font-semibold hover:bg-red-500/30 transition-all"
                >
                  <RefreshCw size={13} className="animate-spin" /> Cancelar
                </button>
              ) : (
                <button
                  onClick={handleScan}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgb(var(--accent))] text-white text-[12px] font-semibold hover:opacity-90 transition-all"
                >
                  <RefreshCw size={13} /> Varrer Servidor
                </button>
              )}
            </div>
          </div>

          {/* Scan filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {[
                { key: "all" as const, label: `Todos (${shinies.length})`, color: "" },
                { key: "shiny" as const, label: `Shinies (${shinies.filter(s => s.is_shiny).length})`, color: "yellow" },
                { key: "legendary" as const, label: `Lendários (${shinies.filter(s => s.quality?.toLowerCase() === "legendary").length})`, color: "amber" },
                { key: "epic" as const, label: `Épicos (${shinies.filter(s => s.quality?.toLowerCase() === "epic").length})`, color: "purple" },
                { key: "rare" as const, label: `Raros (${shinies.filter(s => s.quality?.toLowerCase() === "rare").length})`, color: "blue" },
                { key: "uncommon" as const, label: `Incomuns (${shinies.filter(s => s.quality?.toLowerCase() === "uncommon").length})`, color: "green" },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilterType(f.key)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                    filterType === f.key
                      ? f.color ? `bg-${f.color}-500/20 border-${f.color}-500 text-${f.color}-400` : "bg-[rgb(var(--accent))]/20 border-[rgb(var(--accent))] text-[rgb(var(--accent))]"
                      : "bg-[rgb(var(--bg-surface))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
                  }`}
                >{f.label}</button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Buscar espécie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] text-[12px] px-3 py-1.5 rounded-lg focus:outline-none w-44"
            />
          </div>

          {lastScan && (
            <p className="text-[11px] text-[rgb(var(--text-faint))]">Última varredura: {lastScan}</p>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-[12px] flex items-center gap-2">
              <Shield size={14} /> {error}
            </div>
          )}

          {/* Resultados: durante loading, mantém a lista anterior; só mostra spinner puro quando não há dados anteriores */}
          {loading && shinies.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="inline-block p-3 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 animate-bounce">
                <Sparkles size={28} />
              </div>
              <p className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">Varrendo covis do servidor...</p>
              <p className="text-[11px] text-[rgb(var(--text-muted))]">Isso pode levar alguns segundos.</p>
            </div>
          ) : !lastScan && !loading ? (
            <div className="text-center py-16 bg-[rgb(var(--bg-base))] rounded-xl border border-[rgb(var(--border))] space-y-2">
              <Radar size={32} className="mx-auto text-[rgb(var(--text-faint))]" />
              <p className="text-[13px] font-medium text-[rgb(var(--text-muted))]">Nenhuma varredura realizada.</p>
              <button onClick={handleScan} className="text-[12px] text-[rgb(var(--accent))] font-semibold hover:underline">
                Iniciar Varredura
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Badge de atualização — aparece durante scan com resultados anteriores visíveis */}
              {loading && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-semibold">
                  <RefreshCw size={12} className="animate-spin" />
                  Atualizando resultados... os dados abaixo são da varredura anterior.
                </div>
              )}
              {filtered.length === 0 ? (
                <div className="text-center py-12 bg-[rgb(var(--bg-base))] rounded-xl border border-[rgb(var(--border))] space-y-2">
                  <Radar size={28} className="mx-auto text-[rgb(var(--text-faint))]" />
                  <p className="text-[13px] text-[rgb(var(--text-muted))]">Nenhum resultado para este filtro.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((shiny, idx) => renderHitCard(shiny as any, idx))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: History ── */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-[rgb(var(--text-muted))]">{history.length} detecções registradas</span>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
              >
                Limpar Histórico
              </button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="text-center py-16 bg-[rgb(var(--bg-base))] rounded-xl border border-[rgb(var(--border))] space-y-2">
              <History size={28} className="mx-auto text-[rgb(var(--text-faint))]" />
              <p className="text-[13px] text-[rgb(var(--text-muted))]">Nenhuma detecção registrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {history.map((hit, idx) => renderHitCard(hit, idx, false))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
