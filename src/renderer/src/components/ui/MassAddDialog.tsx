import { useState, useEffect } from "react";
import type { AccountConfig } from "../../types";
import { createDefaultAccount } from "../../types";
import { HuntSelector } from "./HuntSelector";
import { loadJSON } from "../../lib/dataLoader";
import { X, ChevronRight } from "lucide-react";

interface MassAddDialogProps {
  onAddMass: (accounts: AccountConfig[]) => void;
  onClose: () => void;
}

function getSpriteUrl(slug: string, dexMap: Record<string, number>): string {
  const clean = slug.toLowerCase().replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "").replace(/^milch-/, "").trim();
  const dex = dexMap[clean] || dexMap[slug.toLowerCase()] || 0;
  if (dex > 0) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

export function MassAddDialog({ onAddMass, onClose }: MassAddDialogProps) {
  const [baseName, setBaseName] = useState("");
  const [tokens, setTokens] = useState("");
  const [proxies, setProxies] = useState("");
  const [proxyRatio, setProxyRatio] = useState(1);
  const [hunt, setHunt] = useState("pidgey");
  const [showHuntSelector, setShowHuntSelector] = useState(false);
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [huntsData, setHuntsData] = useState<any[]>([]);

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
    loadJSON<{ hunts: any[] }>("hunts_data.json").then((d) => setHuntsData(d.hunts || []));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokens.trim()) return;
    
    const tokenList = tokens.split("\n").map(t => t.trim()).filter(t => t);
    const proxyList = proxies.split("\n").map(p => p.trim()).filter(p => p);
    
    const newAccounts: AccountConfig[] = [];
    
    tokenList.forEach((token, index) => {
      const name = baseName ? `${baseName} ${index + 1}` : `Conta ${index + 1}`;
      const acc = createDefaultAccount(name, token, hunt);
      
      if (proxyList.length > 0) {
        const proxyIndex = Math.floor(index / proxyRatio) % proxyList.length;
        acc.proxy = proxyList[proxyIndex];
      }
      
      newAccounts.push(acc);
    });
    
    onAddMass(newAccounts);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[520px] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">Adição em Massa</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] transition-colors"><X size={14} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Nome Base (opcional)</label>
            <input type="text" value={baseName} onChange={(e) => setBaseName(e.target.value)} placeholder="Ex: damiao (Ficará damiao 1, damiao 2...)"
              className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors" />
          </div>
          <div>
            <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Tokens JWT (1 por linha)</label>
            <textarea value={tokens} onChange={(e) => setTokens(e.target.value)} placeholder="Cole os tokens JWT aqui..." rows={4}
              className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors font-mono text-[11px]" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Proxies (1 por linha, opcional)</label>
              <textarea value={proxies} onChange={(e) => setProxies(e.target.value)} placeholder="http://user:pass@ip:port" rows={2}
                className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors font-mono text-[11px]" />
            </div>
            <div>
              <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Ratio Proxy</label>
              <select value={proxyRatio} onChange={(e) => setProxyRatio(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors">
                <option value={1}>1:1 (1 por proxy)</option>
                <option value={2}>1:2 (2 por proxy)</option>
                <option value={3}>1:3 (3 por proxy)</option>
                <option value={4}>1:4 (4 por proxy)</option>
                <option value={5}>1:5 (5 por proxy)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Hunt Inicial</label>
            <div onClick={() => setShowHuntSelector(true)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
              <img src={getSpriteUrl(hunt, dexMap)} alt={hunt} className="w-10 h-10 object-contain"
                onError={(e) => { const dex = dexMap[hunt.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
              <div className="flex-1">
                <div className="text-[13px] text-[rgb(var(--text-primary))] capitalize">{hunt}</div>
                <div className="text-[11px] text-[rgb(var(--text-muted))]">Clique para selecionar</div>
              </div>
              <ChevronRight size={14} className="text-[rgb(var(--text-faint))]" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] transition-colors">Cancelar</button>
            <button type="submit" disabled={!tokens.trim()}
              className="px-4 py-1.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all">Adicionar Em Massa</button>
          </div>
        </form>
      </div>
      {showHuntSelector && <HuntSelector hunts={huntsData} currentHunt={hunt} onSelect={(s) => { setHunt(s); setShowHuntSelector(false); }} onClose={() => setShowHuntSelector(false)} />}
    </div>
  );
}
