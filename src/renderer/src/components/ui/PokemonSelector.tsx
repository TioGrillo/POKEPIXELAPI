import { useState, useMemo, useEffect } from "react";
import { X, Search } from "lucide-react";
import { loadJSON } from "../../lib/dataLoader";

interface Props { currentPokemon?: string; onSelect: (slug: string) => void; onClose: () => void; }

export function PokemonSelector({ currentPokemon, onSelect, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [huntMap, setHuntMap] = useState<Record<string, number>>({});

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
    loadJSON<{ hunts: any[] }>("hunts_data.json").then((d) => {
      const hm: Record<string, number> = {};
      if (d.hunts) {
        for (const h of d.hunts) {
          hm[h.slug.toLowerCase()] = h.level || 0;
        }
      }
      setHuntMap(hm);
    });
  }, []);

  const pokemonList = useMemo(() =>
    Object.entries(dexMap).filter(([_, dex]) => dex <= 251).map(([slug, dex]) => ({ slug, dex })).sort((a, b) => a.dex - b.dex),
  [dexMap]);

  const filtered = useMemo(() => {
    if (!search) return pokemonList;
    const q = search.toLowerCase();
    return pokemonList.filter((p) => p.slug.includes(q) || String(p.dex).includes(q));
  }, [pokemonList, search]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[600px] max-h-[70vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">Selecionar Pokemon</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"><X size={14} /></button>
        </div>
        <div className="px-5 pt-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou numero..."
              className="w-full pl-8 pr-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors" autoFocus />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-6 gap-2">
            {filtered.map((p) => (
              <button key={p.slug} onClick={() => { onSelect(p.slug); onClose(); }}
                className={`flex flex-col items-center p-2 rounded-lg border transition-all ${currentPokemon === p.slug ? "border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10" : "border-[rgb(var(--border))] hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/50"}`}>
                <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${p.dex}.gif`} alt={p.slug} className="w-10 h-10 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.dex}.png`; }} loading="lazy" />
                <span className="text-[9px] text-[rgb(var(--text-muted))]">#{p.dex}</span>
                <span className="text-[10px] text-[rgb(var(--text-primary))] capitalize truncate w-full text-center">{p.slug}</span>
                {huntMap[p.slug] !== undefined && huntMap[p.slug] > 0 && (
                  <span className="text-[9px] px-1 rounded bg-gray-500/20 text-gray-400 mt-0.5">Lv. {huntMap[p.slug]}</span>
                )}
              </button>
            ))}
          </div>
          {filtered.length === 0 && <div className="text-center text-[13px] text-[rgb(var(--text-muted))] py-8">Nenhum Pokemon encontrado</div>}
        </div>
      </div>
    </div>
  );
}
