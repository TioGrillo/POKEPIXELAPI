import { useState, useEffect, useRef } from "react";
import { invoke } from "../../lib/ipc";
import { loadJSON } from "../../lib/dataLoader";
import { cn } from "../../lib/utils";
import { useBotStore } from "../../stores/botStore";
import type { AccountConfig } from "../../types";
import { Plus, Play, Square, X, Settings, Download, Upload, LogOut, Wifi, WifiOff, ArrowUp, Search } from "lucide-react";

type MainTab = "conta" | "global" | "log" | "control" | "pokedex";

interface SidebarProps {
  accounts: AccountConfig[];
  selectedAccount: string | null;
  mainTab: MainTab;
  onSelectAccount: (name: string) => void;
  onSelectTab: (tab: MainTab) => void;
  onAdd: () => void;
  onRemove: (name: string) => void;
  onOpenSettings: () => void;
  onImport: () => void;
  onExport: () => void;
  onLogout: () => void;
  connectedCount: number;
}

function getSpriteUrl(slug: string, dexMap: Record<string, number>): string {
  if (!slug) return "";
  const clean = slug.replace(/_/g, "-").toLowerCase();
  const dex = dexMap[clean] || dexMap[slug.toLowerCase()] || 0;
  if (dex > 0) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

export function Sidebar({ accounts, selectedAccount, mainTab, onSelectAccount, onAdd, onRemove, onOpenSettings, onImport, onExport, onLogout, connectedCount }: SidebarProps) {
  const { stats } = useBotStore();
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const prevLevels = useRef<Record<string, number>>({});
  const [levelUpMap, setLevelUpMap] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortAlpha, setSortAlpha] = useState(false);

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
  }, []);

  useEffect(() => {
    for (const [name, s] of Object.entries(stats)) {
      if (!s) continue;
      const prev = prevLevels.current[name];
      if (prev !== undefined && s.heroLevel > prev) {
        setLevelUpMap((m) => ({ ...m, [name]: true }));
        setTimeout(() => setLevelUpMap((m) => ({ ...m, [name]: false })), 2000);
      }
      prevLevels.current[name] = s.heroLevel;
    }
  }, [stats]);

  const handleStartAll = () => invoke("bot:start-all");
  const handleStopAll = () => invoke("bot:stop-all");

  return (
    <aside className="w-56 bg-[rgb(var(--bg-base))] border-r border-[rgb(var(--border))] flex flex-col shrink-0">
      <div className="p-2 border-b border-[rgb(var(--border))] flex gap-1">
        <button onClick={onAdd}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[12px] font-medium hover:brightness-110 transition-all"
        >
          <Plus size={13} /> Adicionar
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent("open-mass-add"))}
          className="flex-none flex items-center justify-center p-1.5 rounded-md bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))] transition-colors"
          title="Adição em Massa"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
        </button>
      </div>

      <div className="flex gap-1 p-2 border-b border-[rgb(var(--border))]">
        <button onClick={handleStartAll}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
        >
          <Play size={10} /> Iniciar Todas
        </button>
        <button onClick={handleStopAll}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
        >
          <Square size={10} /> Parar Todas
        </button>
      </div>

      <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold flex items-center justify-between">
        <span>CONTAS</span>
        <span className="text-green-400">{connectedCount} ativa(s)</span>
      </div>

      <div className="px-2 pb-2 flex gap-1">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
          <input
            type="text"
            placeholder="Filtrar contas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-6 pr-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
          />
        </div>
        <button
          onClick={() => setSortAlpha(!sortAlpha)}
          className={cn("p-1.5 rounded border transition-colors flex items-center justify-center shrink-0", sortAlpha ? "bg-[rgb(var(--accent))]/20 border-[rgb(var(--accent))]/50 text-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-surface))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface))]/80")}
          title="Ordenar A-Z"
        >
          <span className="text-[10px] font-bold">A-Z</span>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {accounts
          .filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
          .sort((a, b) => sortAlpha ? a.name.localeCompare(b.name) : 0)
          .map((acc) => {
          const s = stats[acc.name];
          const isConnected = s?.connected;
          const isSelected = mainTab === "conta" && selectedAccount === acc.name;
          const spriteUrl = s?.leaderSlug ? getSpriteUrl(s.leaderSlug, dexMap) : "";
          const showingLevelUp = levelUpMap[acc.name];

          return (
            <div key={acc.name}
              className={cn(
                "group flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-all border-l-2",
                isSelected
                  ? "border-l-[rgb(var(--accent))] bg-[rgb(var(--accent))]/8"
                  : "border-l-transparent hover:bg-[rgb(var(--bg-surface))]/40"
              )}
              onClick={() => onSelectAccount(acc.name)}
            >
              {isConnected ? <Wifi size={12} className="text-green-400 shrink-0" /> : <WifiOff size={12} className="text-[rgb(var(--text-faint))] shrink-0" />}

              <span className={cn(
                "flex-1 truncate text-[12px] font-medium transition-colors",
                isSelected ? "text-[rgb(var(--text-primary))]" : isConnected ? "text-green-400" : "text-[rgb(var(--text-secondary))]"
              )}>{acc.name}</span>

              {s && (
                <span className="flex items-center gap-1 shrink-0 relative">
                  {showingLevelUp && (
                    <span className="text-green-400 absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce">
                      <ArrowUp size={12} strokeWidth={3} />
                    </span>
                  )}
                  {spriteUrl && (
                    <img src={spriteUrl} alt="" className="w-6 h-6 object-contain shrink-0"
                      onError={(e) => {
                        const fallback = dexMap[s?.leaderSlug?.toLowerCase() || ""] || 0;
                        if (fallback > 0) (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${fallback}.png`;
                      }} />
                  )}
                  <span className={cn(
                    "text-[10px] tabular-nums transition-colors font-medium",
                    showingLevelUp ? "text-green-400" : "text-[rgb(var(--text-muted))]"
                  )}>Lv.{s.heroLevel || 1}</span>
                </span>
              )}

              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remover conta "${acc.name}"?`)) onRemove(acc.name); }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity shrink-0"
              >
                <X size={11} />
              </button>
            </div>
          );
        })}
        {accounts.length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[rgb(var(--text-faint))]">Nenhuma conta adicionada</div>
        ) : accounts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 ? (
          <div className="px-3 py-6 text-center text-[11px] text-[rgb(var(--text-faint))] italic">Nenhuma conta encontrada</div>
        ) : null}
      </nav>

      <div className="p-2 border-t border-[rgb(var(--border))] flex gap-1">
        <button onClick={onImport}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          title="Importar Contas">
          <Upload size={11} /> Importar
        </button>
        <button onClick={onExport}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          title="Exportar Contas">
          <Download size={11} /> Exportar
        </button>
        <button onClick={onOpenSettings}
          className="flex items-center justify-center px-2 py-1 rounded text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-surface))] hover:text-[rgb(var(--text-secondary))] transition-colors"
          title="Configuracoes Gerais">
          <Settings size={12} />
        </button>
        <button onClick={onLogout}
          className="flex items-center justify-center px-2 py-1 rounded text-[rgb(var(--text-muted))] hover:bg-red-500/10 hover:text-red-400 transition-colors"
          title="Sair">
          <LogOut size={12} />
        </button>
      </div>
      <div className="px-3 pb-2 text-center text-[10px] text-[rgb(var(--text-faint))]">PokeIdleBot v4.3.15</div>
    </aside>
  );
}
