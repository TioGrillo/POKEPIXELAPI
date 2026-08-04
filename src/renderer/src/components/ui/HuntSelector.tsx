import { useState, useMemo, useEffect } from "react";
import { X, Search } from "lucide-react";
import { loadJSON } from "../../lib/dataLoader";

interface HuntEntry { id: string; name: string; area: string; minLevel: number; maxLevel: number; difficulty?: string; map_id?: number; }
interface Props { hunts: HuntEntry[]; currentHunt: string; onSelect: (slug: string) => void; onClose: () => void; }

const AREA_COLORS: Record<string, string> = {
  kanto: "bg-blue-600/20 text-blue-400", johto: "bg-green-600/20 text-green-400",
  outland: "bg-red-600/20 text-red-400", orre: "bg-purple-600/20 text-purple-400",
  nightmare: "bg-yellow-600/20 text-yellow-400",
};

export function HuntSelector({ hunts, currentHunt, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [area, setArea] = useState<string>("all");
  const [mapFilter, setMapFilter] = useState<number | null>(null);
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [huntsData, setHuntsData] = useState<any[]>([]);
  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
    loadJSON<{ hunts: any[] }>("hunts_data.json").then((d) => setHuntsData(d.hunts || []));
  }, []);

  // Enrich hunts with map_id from hunts_data
  const enriched = useMemo(() => (hunts || []).map(h => {
    const hd = huntsData.find((d: any) => d.id === h.id);
    return { ...h, map_id: hd?.map_id || 0 };
  }), [hunts, huntsData]);

  const areas = useMemo(() => ["all", ...Array.from(new Set(enriched.filter(h => h && h.area).map((h) => h.area)))], [enriched]);
  const mapIds = useMemo(() => {
    const maps = Array.from(new Set(enriched.filter(h => h.map_id > 0).map(h => h.map_id))).sort((a, b) => a - b);
    return [null, ...maps];
  }, [enriched]);

  const filtered = useMemo(() => enriched.filter((h) => h && h.name && (area === "all" || h.area === area) && (!mapFilter || h.map_id === mapFilter) && (!search || h.name.toLowerCase().includes(search.toLowerCase()) || String(h.minLevel || 0).includes(search) || String(h.maxLevel || 0).includes(search))), [enriched, search, area, mapFilter]);

  // Count per map for labels
  const mapCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const h of enriched) { if (h.map_id > 0) counts[h.map_id] = (counts[h.map_id] || 0) + 1; }
    return counts;
  }, [enriched]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[700px] max-h-[80vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">Selecionar Hunt</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"><X size={14} /></button>
        </div>
        <div className="px-5 pt-3 space-y-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar Pokemon..."
              className="w-full pl-8 pr-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {areas.map((a) => (
              <button key={a} onClick={() => setArea(a)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${area === a ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))]" : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"}`}>
                {a === "all" ? "Todos" : (a && a.charAt ? a.charAt(0).toUpperCase() + a.slice(1) : a)}
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-[10px] text-[rgb(var(--text-faint))]">Mapa:</span>
            {mapIds.map((m) => (
              <button key={String(m)} onClick={() => setMapFilter(m)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${mapFilter === m ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))]" : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"}`}>
                {m === null ? "Todos" : `Map ${m}${mapCounts[m] ? ` (${mapCounts[m]})` : ""}`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-4 gap-2">
            {filtered.map((h) => {
              const clean = h.name.toLowerCase().replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "").replace(/^milch-/, "").trim();
              const dex = dexMap[clean] || dexMap[h.name.toLowerCase()] || 0;
              return (
                <button key={h.id} onClick={() => { onSelect(h.id); onClose(); }}
                  className={`flex flex-col items-center p-2 rounded-lg border transition-all ${currentHunt === h.id ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10" : h.area === 'outland' ? "border-red-500/40 hover:border-red-400 hover:bg-red-500/10" : "border-[rgb(var(--border))] hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/50"}`}>
                  <img src={`https://pokepixel.nietore.com/assets/imported/creatures/${h.id.replace(/^hunt_/, '')}/front.png`} alt={h.name} className="w-12 h-12 object-contain object-bottom"
                    onError={(e) => { const t = e.target as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex || 1}.png`; } }} />
                  <span className="text-[11px] text-[rgb(var(--text-primary))] mt-1 capitalize">{h.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] px-1 rounded ${AREA_COLORS[h.area] || "bg-gray-600/20 text-gray-400"}`}>{h.area}</span>
                    {h.map_id > 0 && <span className="text-[9px] px-1 rounded bg-purple-600/20 text-purple-400">M{h.map_id}</span>}
                    <span className="text-[9px] px-1 rounded bg-gray-500/20 text-gray-400 whitespace-nowrap">Lv. {h.minLevel === h.maxLevel ? h.minLevel : `${h.minLevel} - ${h.maxLevel}`}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {filtered.length === 0 && <div className="text-center text-[13px] text-[rgb(var(--text-muted))] py-8">Nenhuma hunt encontrada</div>}
        </div>
      </div>
    </div>
  );
}
