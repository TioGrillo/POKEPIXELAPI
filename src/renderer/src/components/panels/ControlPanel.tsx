import { useState, useEffect, useCallback, useRef } from "react";
import { useBotStore } from "../../stores/botStore";
import { MultiLogView } from "./MultiLogView";
import { invoke } from "../../lib/ipc";
import { loadJSON } from "../../lib/dataLoader";
import { getItemIcon } from "../../lib/itemUtils";
import type { AccountConfig } from "../../types";
import { Play, Square, Wifi, ShoppingCart, Coins, Gift, Trophy, Zap, Target, Settings, Route, Camera, RefreshCw, Package, Search, TreePine, Store, Lock, Unlock, Fish, CheckSquare, AlertTriangle, CircleDot, X } from "lucide-react";

function getSpriteUrl(slug: string, dexMap: Record<string, number>): string {
  if (!slug) return "";
  const clean = slug.toLowerCase().replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "").replace(/^milch-/, "").trim();
  const dex = dexMap[clean] || dexMap[slug.toLowerCase()] || 0;
  if (dex > 0) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

interface Props { accounts: AccountConfig[]; hunts: any[]; }

export function ControlPanel({ accounts, hunts }: Props) {
  const { stats } = useBotStore();
  const [sel, setSel] = useState<Set<string>>(new Set(accounts.map((a) => a.name)));
  const [massTab, setMassTab] = useState<"actions" | "reroll" | "routes" | "settings" | "professions" | "market" | "sell_pokemons">("actions");

  const toggle = (n: string) => setSel((p) => { const nx = new Set(p); nx.has(n) ? nx.delete(n) : nx.add(n); return nx; });
  const selAll = () => setSel(new Set(accounts.map((a) => a.name)));
  const selNone = () => setSel(new Set());
  const names = Array.from(sel);

  const bulk = useCallback(async (action: string, params?: Record<string, unknown>) => {
    for (const n of names) {
      await invoke(`bot:${action}`, n, ...(params ? [params] : []));
      await new Promise(r => setTimeout(r, 200));
    }
  }, [names]);

  const tabs: { id: typeof massTab; label: string; icon: React.ReactNode }[] = [
    { id: "actions", label: "Acoes Rapidas", icon: <Zap size={12} /> },
    { id: "sell_pokemons", label: "Vender Pokemons", icon: <Coins size={12} /> },
    { id: "reroll", label: "Reroll", icon: <RefreshCw size={12} /> },
    { id: "routes", label: "Rotas e Equipamentos", icon: <Route size={12} /> },
    { id: "settings", label: "Ajustes", icon: <Settings size={12} /> },
    { id: "professions", label: "Profissoes", icon: <Camera size={12} /> },
    { id: "market", label: "Mercado/Itens", icon: <Store size={12} /> },
  ];

  return (
    <div className="p-4 flex flex-col h-full flex-1 w-full min-h-0 gap-4 overflow-y-auto">
      <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))] shrink-0"><Settings size={18} /> Controle em Massa</h1>
      <div className="flex gap-4 shrink-0">
        <div className="w-52 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Contas</span>
            <span className="text-[10px] text-[rgb(var(--accent))]">{sel.size}/{accounts.length}</span>
          </div>
          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            {accounts.map((acc) => {
              const s = stats[acc.name];
              const isSelected = sel.has(acc.name);
              return (
                <div
                  key={acc.name}
                  onClick={() => toggle(acc.name)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 ${
                    isSelected
                      ? "border-l-[rgb(var(--accent))] bg-[rgb(var(--accent))]/8 text-[rgb(var(--text-primary))]"
                      : "border-l-transparent text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))]/50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${s?.connected ? "bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]" : "bg-[rgb(var(--text-faint))]"}`} />
                  <span className="flex-1 truncate text-[12px] font-medium">{acc.name}</span>
                  {s?.heroLevel ? <span className="text-[10px] text-[rgb(var(--text-muted))] tabular-nums">Lv.{s.heroLevel}</span> : null}
                </div>
              );
            })}
          </div>
          <div className="flex gap-1 mt-2">
            <button onClick={selAll} className="flex-1 py-1.5 rounded text-[10px] font-medium bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-elevated))] transition-colors">Todas</button>
            <button onClick={selNone} className="flex-1 py-1.5 rounded text-[10px] font-medium bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-elevated))] transition-colors">Nenhuma</button>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex gap-1 border-b border-[rgb(var(--border))]">
            {tabs.map((t) => (
              <button key={t.id} onClick={() => setMassTab(t.id)}
                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                  massTab === t.id ? "text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"
                }`}
              >{t.icon}{t.label}</button>
            ))}
          </div>
          <div className="min-h-[300px]">
            {massTab === "actions" && <ActionsTab bulk={bulk} count={names.length} />}
            {massTab === "reroll" && <RerollTab bulk={bulk} />}
            {massTab === "routes" && <RoutesTab />}
            {massTab === "settings" && <SettingsTab />}
            {massTab === "professions" && <ProfessionsTab bulk={bulk} />}
            {massTab === "market" && <MarketTab accounts={accounts} sel={sel} stats={stats} />}
            {massTab === "sell_pokemons" && <MassSellPokemonTab accounts={accounts} sel={sel} />}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <MultiLogView title="Log de Controle" />
      </div>
    </div>
  );
}

function ActionsTab({ bulk, count }: { bulk: (a: string, p?: any) => void; count: number }) {
  return (
    <div className="space-y-3">
      <div className="text-[11px] text-[rgb(var(--text-muted))]">Acoes aplicadas em {count} conta(s)</div>
      <div className="grid grid-cols-3 gap-2">
        <Btn icon={<Play size={13} />} label="Iniciar Hunt" color="bg-green-600 hover:bg-green-500" onClick={() => bulk("start-hunt")} />
        <Btn icon={<Square size={13} />} label="Pausar Hunt" color="bg-red-600 hover:bg-red-500" onClick={() => bulk("stop-hunt")} />
        <Btn icon={<Wifi size={13} />} label="Conectar" color="bg-blue-600 hover:bg-blue-500" onClick={() => bulk("connect")} />
        <Btn icon={<ShoppingCart size={13} />} label="Vender Loot" color="bg-amber-600 hover:bg-amber-500" onClick={() => bulk("sell-loot")} />
        <Btn icon={<Gift size={13} />} label="Bonus Diario" color="bg-purple-600 hover:bg-purple-500" onClick={() => bulk("claim-streak")} />
        <Btn icon={<Package size={13} />} label="Coletar Gifts" color="bg-cyan-600 hover:bg-cyan-500" onClick={() => bulk("claim-gifts")} />
        <Btn icon={<Trophy size={13} />} label="Battle Pass" color="bg-yellow-600 hover:bg-yellow-500" onClick={() => bulk("claim-bp")} />
        <Btn icon={<Gift size={13} />} label="Resgatar Tudo" color="bg-pink-600 hover:bg-pink-500" onClick={() => bulk("claim-all")} />
        <div className="flex gap-2 w-full">
          <select id="mass-fish-tier" className="w-14 text-[11px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded px-1 outline-none">
            <option value="0">T0</option>
            <option value="1">T1</option>
            <option value="2">T2</option>
            <option value="3">T3</option>
            <option value="4">T4</option>
            <option value="5">T5</option>
          </select>
          <div className="flex-1">
            <Btn icon={<Fish size={13} />} label="Pescar Massivo" color="bg-teal-600 hover:bg-teal-500 w-full" onClick={() => {
              const tier = parseInt((document.getElementById('mass-fish-tier') as HTMLSelectElement).value);
              bulk("start-fishing", tier);
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RerollTab({ bulk }: { bulk: (a: string, p?: any) => void }) {
  const [pokemon, setPokemon] = useState(133);
  const [attempts, setAttempts] = useState(50);
  const POKEMON = [{ id: 133, name: "Eevee" }, { id: 122, name: "Mr. Mime" }, { id: 137, name: "Porygon" }];

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))]"><RefreshCw size={14} /> Cassino Automatico (Marlon)</h3>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Pokemon">
          <select value={pokemon} onChange={(e) => setPokemon(Number(e.target.value))} className={inputCls}>
            {POKEMON.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Tentativas">
          <input type="number" value={attempts} min={1} max={1000} onChange={(e) => setAttempts(Number(e.target.value))} className={`${inputCls} w-24`} />
        </Field>
      </div>
      <button onClick={() => bulk("casino-reroll", pokemon)} className="flex items-center gap-1.5 px-6 py-2 rounded-lg bg-amber-600 text-white text-[13px] font-medium hover:bg-amber-500 transition-colors">
        <RefreshCw size={13} /> Iniciar Reroll em Massa
      </button>
    </div>
  );
}

function RoutesTab() {
  const [routes, setRoutes] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routeName, setRouteName] = useState("");
  const [routePokemon, setRoutePokemon] = useState("");
  const [routeType, setRouteType] = useState<"level" | "kill" | "capture">("level");
  const [rules, setRules] = useState<{ min_lv: number; max_lv: number; hunt: string }[]>([{ min_lv: 1, max_lv: 20, hunt: "pidgey" }]);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorRuleIdx, setSelectorRuleIdx] = useState<number | null>(null);
  const [dexMap, setDexMap] = useState<Record<string, number>>({});

  useEffect(() => { 
    invoke<Record<string, any>>("mounted-routes:list").then(setRoutes); 
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
  }, []);

  const save = () => {
    const id = editingId || "rt_" + Math.random().toString(36).slice(2, 10);
    const updated = { ...routes, [id]: { name: routeName, pokemon: routePokemon.toLowerCase(), type: routeType, rules } };
    setRoutes(updated);
    invoke("mounted-routes:save", updated);
    setEditingId(null); setRouteName(""); setRoutePokemon(""); setRules([{ min_lv: 1, max_lv: 20, hunt: "pidgey" }]);
  };

  const loadRoute = (id: string) => {
    const r = routes[id]; if (!r) return;
    setEditingId(id); setRouteName(r.name); setRoutePokemon(r.pokemon); setRouteType(r.type); setRules([...r.rules]);
  };

  const deleteRoute = (id: string) => {
    if (!confirm("Excluir rota?")) return;
    const updated = { ...routes }; delete updated[id];
    setRoutes(updated);
    invoke("mounted-routes:save", updated);
    if (editingId === id) { setEditingId(null); setRouteName(""); }
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))]"><Route size={14} /> Rotas Montadas</h3>

      <div className="space-y-3 mb-6">
        <div className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold border-b border-[rgb(var(--border))] pb-1">Rotas Cadastradas</div>
        {Object.keys(routes).length === 0 ? (
          <div className="text-[12px] text-[rgb(var(--text-faint))] italic">Nenhuma rota montada.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(routes).map(([id, r]) => (
              <div key={id} className="flex items-center justify-between p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))]">
                <div className="flex items-center gap-2">
                  {r.pokemon && <img src={getSpriteUrl(r.pokemon, dexMap)} alt={r.pokemon} className="w-6 h-6 object-contain" />}
                  <div>
                    <div className="text-[12px] font-medium text-[rgb(var(--text-primary))]">{r.name || id}</div>
                    <div className="text-[10px] text-[rgb(var(--text-muted))]">Líder: <span className="capitalize">{r.pokemon || "Qualquer"}</span> | Regras: {r.rules?.length || 0}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => loadRoute(id)} className="px-2 py-1 rounded bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] text-[10px] hover:bg-[rgb(var(--accent))]/20">Editar</button>
                  <button onClick={() => deleteRoute(id)} className="px-2 py-1 rounded bg-red-600/20 text-red-400 text-[10px] hover:bg-red-600/30">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-[rgb(var(--border))] rounded-lg p-3 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-[12px] font-medium text-[rgb(var(--text-primary))]">{editingId ? "Editar Rota" : "Nova Rota"}</h4>
          {editingId && <button onClick={() => { setEditingId(null); setRouteName(""); setRoutePokemon(""); setRules([{ min_lv: 1, max_lv: 20, hunt: "pidgey" }]); }} className="text-[11px] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">Cancelar Edição</button>}
        </div>

        <div className="grid grid-cols-3 gap-3">
        <Field label="Nome"><input value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Minha Rota" className={inputCls} /></Field>
        <Field label="Pokemon Lider">
          <div onClick={() => { setSelectorRuleIdx(-1); setShowSelector(true); }} className="flex-1 relative flex items-center px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors h-[26px]">
            {routePokemon && (
              <img src={getSpriteUrl(routePokemon, dexMap)} alt={routePokemon} className="w-5 h-5 object-contain mr-2"
                onError={(e) => { const dex = dexMap[routePokemon.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
            )}
            <span className="text-[12px] text-[rgb(var(--text-primary))] capitalize truncate flex-1">{routePokemon || "Selecionar..."}</span>
          </div>
        </Field>
        <Field label="Tipo">
          <select value={routeType} onChange={(e) => setRouteType(e.target.value as any)} className={inputCls}>
            <option value="level">Nivel</option><option value="kill">Kill</option><option value="capture">Captura</option>
          </select>
        </Field>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Regras</div>
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            {routeType === "level" && (
              <>
                <input type="number" value={r.min_lv} onChange={(e) => { const nr = [...rules]; nr[i] = { ...nr[i], min_lv: Number(e.target.value) }; setRules(nr); }} className={`${inputCls} w-16`} placeholder="Min" />
                <span className="text-[rgb(var(--text-faint))]">-</span>
              </>
            )}
            <input type="number" value={r.max_lv} onChange={(e) => { const nr = [...rules]; nr[i] = { ...nr[i], max_lv: Number(e.target.value) }; setRules(nr); }} className={`${inputCls} w-16`} placeholder={routeType === "level" ? "Max" : "Qtd"} />
            <div onClick={() => { setSelectorRuleIdx(i); setShowSelector(true); }} className="flex-1 relative flex items-center px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors h-[26px]">
              {r.hunt && (
                <img src={getSpriteUrl(r.hunt, dexMap)} alt={r.hunt} className="w-5 h-5 object-contain mr-2"
                  onError={(e) => { const dex = dexMap[r.hunt.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
              )}
              <span className="text-[12px] text-[rgb(var(--text-primary))] capitalize truncate flex-1">{r.hunt || "Selecionar..."}</span>
            </div>
            <button onClick={() => setRules(rules.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><span className="text-[14px]">×</span></button>
          </div>
        ))}
        <button onClick={() => setRules([...rules, { min_lv: 1, max_lv: 50, hunt: "pidgey" }])} className="text-[12px] text-[rgb(var(--accent))] hover:brightness-110">+ Adicionar Regra</button>
      </div>

      <button onClick={save} className="px-4 py-1.5 rounded-md text-[12px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 transition-all">Salvar Rota</button>
      </div>

      {showSelector && selectorRuleIdx !== null && (
        <HuntSelectorMini onSelect={(slug) => { 
          if (selectorRuleIdx === -1) {
            setRoutePokemon(slug);
          } else {
            const nr = [...rules]; nr[selectorRuleIdx] = { ...nr[selectorRuleIdx], hunt: slug }; setRules(nr);
          }
          setShowSelector(false); 
        }} onClose={() => setShowSelector(false)} />
      )}
    </div>
  );
}

function HuntSelectorMini({ onSelect, onClose }: { onSelect: (s: string) => void; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [huntsData, setHuntsData] = useState<any[]>([]);

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
    loadJSON<{ hunts: any[] }>("hunts_data.json").then((d) => setHuntsData(d.hunts || []));
  }, []);

  const filtered = huntsData.filter((h: any) => !search || h.name.toLowerCase().includes(search.toLowerCase()) || String(h.level).includes(search));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[500px] max-h-[60vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
          <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">Selecionar Hunt</span>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]">×</button>
        </div>
        <div className="px-4 pt-2">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..."
            className="w-full px-3 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))]" autoFocus />
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-5 gap-1.5">
          {filtered.map((h: any) => {
            const clean = h.name.toLowerCase().replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "").replace(/^milch-/, "").trim();
            const dex = dexMap[clean] || dexMap[h.name.toLowerCase()] || 0;
            return (
              <button key={h.name} onClick={() => onSelect(h.name)}
                className={`flex flex-col items-center p-1.5 rounded-lg border transition-all ${h.area === 'outland' ? "border-red-500/40 hover:border-red-400 hover:bg-red-500/10" : "border-[rgb(var(--border))] hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/50"}`}>
                {dex > 0 && <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`} alt={h.name} className="w-8 h-8 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />}
                <span className="text-[9px] text-[rgb(var(--text-primary))] capitalize truncate w-full text-center mt-1">{h.name}</span>
                {h.level && h.level > 0 ? (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[9px] px-1 rounded bg-gray-500/20 text-gray-400">Lv. {h.level}</span>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SettingsTab() {
  const [autoPotion, setAutoPotion] = useState(true);
  const [autoRevive, setAutoRevive] = useState(true);
  const [autoCatch, setAutoCatch] = useState(true);
  const [autoSell, setAutoSell] = useState(false);
  const [keepShiny, setKeepShiny] = useState(true);

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))]"><Settings size={14} /> Ajustes em Massa</h3>
      <div className="grid grid-cols-2 gap-3">
        <Toggle label="Auto-Potion" checked={autoPotion} onChange={setAutoPotion} />
        <Toggle label="Auto-Revive" checked={autoRevive} onChange={setAutoRevive} />
        <Toggle label="Auto-Captura" checked={autoCatch} onChange={setAutoCatch} />
        <Toggle label="Vender Loot" checked={autoSell} onChange={setAutoSell} />
        <Toggle label="Manter Shiny" checked={keepShiny} onChange={setKeepShiny} />
      </div>
    </div>
  );
}

function ProfessionsTab({ bulk }: { bulk: (a: string, p?: any) => void }) {
  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))]"><Camera size={14} /> Profissoes</h3>
      <div className="grid grid-cols-2 gap-2">
        <Btn icon={<Camera size={13} />} label="Adicionar Fotografo" color="bg-indigo-600 hover:bg-indigo-500" onClick={() => bulk("set-profession", "prestige")} />
        <Btn icon={<RefreshCw size={13} />} label="Evoluir Profissao" color="bg-violet-600 hover:bg-violet-500" onClick={() => bulk("rankup-profession")} />
      </div>
    </div>
  );
}

function MarketTab({ accounts, sel, stats }: { accounts: AccountConfig[], sel: Set<string>, stats: any }) {
  const [mTab, setMTab] = useState<"inventory" | "general" | "marketplace" | "shop">("inventory");
  const [invSearch, setInvSearch] = useState("");
  const [invResults, setInvResults] = useState<{ account: string; items: any[] }[]>([]);
  const [loading, setLoading] = useState(false);

  const searchInventory = async () => {
    setLoading(true);
    const results: { account: string; items: any[] }[] = [];
    for (const acc of accounts) {
      try {
        const data = await invoke<{ inventory: any[] }>("bot:get-depot", acc.name);
        const items = data.inventory || [];
        const filtered = invSearch ? items.filter((i: any) => (i.name || "").toLowerCase().includes(invSearch.toLowerCase()) || String(i.id) === invSearch) : items;
        if (filtered.length > 0) results.push({ account: acc.name, items: filtered });
      } catch {}
    }
    setInvResults(results);
    setLoading(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))]"><Store size={14} /> Mercado/Itens</h3>
      <div className="flex gap-1 border-b border-[rgb(var(--border))]">
        {([["inventory", "Inventario"], ["general", "Inventario Geral"], ["marketplace", "Mercado"], ["shop", "Loja"]] as const).map(([id, label]) => (
          <button key={id} onClick={() => setMTab(id)} className={`px-3 py-1 text-[11px] font-medium ${mTab === id ? "text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))]"}`}>
            {id === "inventory" ? <Package size={11} className="inline mr-1" /> : id === "general" ? <TreePine size={11} className="inline mr-1" /> : id === "shop" ? <ShoppingCart size={11} className="inline mr-1" /> : <Store size={11} className="inline mr-1" />}
            {label}
          </button>
        ))}
      </div>

      {mTab === "inventory" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
              <input type="text" value={invSearch} onChange={(e) => setInvSearch(e.target.value)} placeholder="Buscar item por nome ou ID..."
                className="w-full pl-6 pr-2 py-1.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))]" />
            </div>
            <button onClick={searchInventory} disabled={loading}
              className="px-3 py-1.5 rounded bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[12px] font-medium hover:brightness-110 disabled:opacity-40">
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {invResults.length > 0 && (
            <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden">
              <table className="w-full text-[11px]">
                <thead className="bg-[rgb(var(--bg-surface))]">
                  <tr className="text-left text-[rgb(var(--text-muted))]">
                    <th className="px-3 py-1.5 font-medium">Conta</th><th className="px-3 py-1.5 font-medium">Item</th><th className="px-3 py-1.5 font-medium">Categoria</th><th className="px-3 py-1.5 font-medium">Qtd</th><th className="px-3 py-1.5 font-medium">Preco NPC</th><th className="px-3 py-1.5 font-medium">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {invResults.map((r) => r.items.map((item: any, i: number) => (
                    <tr key={`${r.account}-${i}`} className="border-t border-[rgb(var(--border))]">
                      <td className="px-3 py-1.5 text-[rgb(var(--text-primary))]">{r.account}</td>
                      <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{item.name || item.id}</td>
                      <td className="px-3 py-1.5 text-[rgb(var(--text-muted))]">{item.category || "-"}</td>
                      <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{item.quantity || 0}</td>
                      <td className="px-3 py-1.5 text-amber-400">{item.npcPrice || "-"}g</td>
                      <td className="px-3 py-1.5">
                        <button onClick={async () => { await invoke("bot:sell-depot-item", r.account, item.id, item.quantity); searchInventory(); }}
                          className="px-2 py-0.5 rounded bg-amber-600/80 text-white text-[10px] font-medium hover:bg-amber-500 transition-colors">
                          Vender
                        </button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          )}
          {invResults.length === 0 && !loading && <div className="text-[12px] text-[rgb(var(--text-faint))] italic py-4 text-center">Use a busca acima para verificar itens</div>}
        </div>
      )}

      {mTab === "general" && (
        <GeneralInventoryView accounts={accounts} sel={sel} stats={stats} />
      )}

      {mTab === "shop" && (
        <MarketShopView accounts={accounts} sel={sel} stats={stats} />
      )}

      {mTab === "marketplace" && <MarketplaceView accounts={accounts} />}
    </div>
  );
}

function MarketplaceView({ accounts }: { accounts: AccountConfig[] }) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<"Pokemon" | "Item" | "All">("All");
  const [buying, setBuying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const all: any[] = [];
    for (const acc of accounts) {
      try {
        const data = await invoke<any[]>("bot:get-listings", acc.name, category);
        for (const l of data || []) {
          all.push({ ...l, _sourceAccount: acc.name });
        }
      } catch {}
    }
    setListings(all);
    setLoading(false);
  };

  const buy = async (listing: any) => {
    setBuying(listing.id);
    try {
      await invoke("bot:market-offer", listing._sourceAccount, listing.id);
    } catch {}
    setBuying(null);
    load();
  };

  const catTabs: { id: "Pokemon" | "Item" | "All"; label: string }[] = [
    { id: "All", label: "Todos" },
    { id: "Pokemon", label: "Pokemon" },
    { id: "Item", label: "Item" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex gap-1 border-b border-[rgb(var(--border))] flex-1">
          {catTabs.map((c) => (
            <button key={c.id} onClick={() => setCategory(c.id)}
              className={`px-3 py-1 text-[11px] font-medium ${category === c.id ? "text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))]"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="px-3 py-1 rounded bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[11px] font-medium hover:brightness-110 disabled:opacity-40">
          {loading ? "Carregando..." : "Carregar"}
        </button>
      </div>
      {listings.length > 0 && (
        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-[rgb(var(--bg-surface))] sticky top-0">
              <tr className="text-left text-[rgb(var(--text-muted))]">
                <th className="px-3 py-1.5 font-medium">Item</th>
                <th className="px-3 py-1.5 font-medium">Conta</th>
                <th className="px-3 py-1.5 font-medium">Vendedor</th>
                <th className="px-3 py-1.5 font-medium">Preco</th>
                <th className="px-3 py-1.5 font-medium">Status</th>
                <th className="px-3 py-1.5 font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l: any) => (
                <tr key={l.id} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-surface))]/30">
                  <td className="px-3 py-1.5 text-[rgb(var(--text-primary))] font-medium">{l.itemName || l.speciesName || "?"}</td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-muted))]">{l._sourceAccount}</td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{l.seller}</td>
                  <td className="px-3 py-1.5 text-amber-400 font-medium">{l.price}g</td>
                  <td className="px-3 py-1.5">{l.hasOffers ? <span className="text-green-400">Com ofertas</span> : <span className="text-[rgb(var(--text-faint))]">Sem ofertas</span>}</td>
                  <td className="px-3 py-1.5">
                    <button onClick={() => buy(l)} disabled={buying === l.id}
                      className="px-2 py-0.5 rounded bg-green-600/80 text-white text-[10px] font-medium hover:bg-green-500 disabled:opacity-40 transition-colors">
                      {buying === l.id ? "..." : "Comprar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {listings.length === 0 && !loading && <div className="text-[12px] text-[rgb(var(--text-faint))] italic py-4 text-center">Clique "Carregar" para ver anuncios</div>}
    </div>
  );
}

function Btn({ icon, label, color, onClick }: { icon: React.ReactNode; label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white transition-colors ${color}`}>
      {icon}{label}
    </button>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3 cursor-pointer hover:bg-[rgb(var(--bg-surface))]/50 transition-colors">
      <button onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-elevated))]"}`}>
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
      </button>
      <span className="text-[12px] text-[rgb(var(--text-primary))]">{label}</span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-[12px] text-[rgb(var(--text-muted))] shrink-0">{label}</label>
      <div className="flex items-center flex-1">{children}</div>
    </div>
  );
}

const inputCls = "px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors w-full";

function GeneralInventoryView({ accounts }: { accounts: AccountConfig[]; sel?: Set<string>; stats?: any }) {
  const [allItems, setAllItems] = useState<{ name: string; id: string; category: string; npcPrice: number; accounts: { name: string; qty: number; icon: string }[] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selling, setSelling] = useState<string | null>(null);
  
  // Novos estados para selecoes multiplas e confirmacao
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{ show: boolean; items: typeof allItems; totalValue: number; totalQty: number } | null>(null);
  
  // Modal de visualizacao de contas
  const [viewAccountsFor, setViewAccountsFor] = useState<typeof allItems[0] | null>(null);

  const loadAll = async () => {
    setLoading(true);
    const map = new Map<string, { name: string; id: string; category: string; npcPrice: number; accounts: { name: string; qty: number; icon: string }[] }>();
    for (const acc of accounts) {
      try {
        const data = await invoke<{ inventory: any[] }>("bot:get-depot", acc.name);
        for (const item of data.inventory || []) {
          const key = item.id || item.name;
          if (!map.has(key)) {
            map.set(key, { name: item.name, id: item.id, category: item.category || "-", npcPrice: item.npcPrice || 0, accounts: [] });
          }
          map.get(key)!.accounts.push({ name: acc.name, qty: item.quantity || 0, icon: item.icon || "" });
        }
      } catch {}
    }
    setAllItems(Array.from(map.values()).sort((a, b) => b.accounts.reduce((s, x) => s + x.qty, 0) - a.accounts.reduce((s, x) => s + x.qty, 0)));
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [accounts]);

  const filtered = search ? allItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase())) : allItems;
  const totalValue = filtered.reduce((sum, i) => sum + Number(i.npcPrice || 0) * i.accounts.reduce((s, x) => s + x.qty, 0), 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const executeSell = async (itemsToSell: typeof allItems) => {
    setSelling("processing");
    
    const tasks: (() => Promise<void>)[] = [];
    for (const item of itemsToSell) {
      for (const acc of item.accounts) {
        tasks.push(async () => {
          try {
            await invoke("bot:sell-items", acc.name, [{ itemId: Number(item.id), qty: acc.qty }]);
          } catch {}
        });
      }
    }

    for (let i = 0; i < tasks.length; i += 5) {
      const chunk = tasks.slice(i, i + 5);
      await Promise.all(chunk.map(t => t()));
    }

    setSelling(null);
    setSelectedIds(new Set());
    setConfirmDialog(null);
    
    // Dedução Otimista (Optimistic UI Update)
    const soldIds = new Set(itemsToSell.map(i => i.id));
    setAllItems(prev => prev.filter(item => !soldIds.has(item.id)));
  };

  const openSellConfirm = (itemsToSell: typeof allItems) => {
    const val = itemsToSell.reduce((sum, i) => sum + Number(i.npcPrice || 0) * i.accounts.reduce((s, x) => s + x.qty, 0), 0);
    const qty = itemsToSell.reduce((sum, i) => sum + i.accounts.reduce((s, x) => s + x.qty, 0), 0);
    setConfirmDialog({ show: true, items: itemsToSell, totalValue: val, totalQty: qty });
  };

  return (
    <div className="space-y-3 relative">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-[rgb(var(--text-muted))]">
          {loading ? "Carregando inventarios..." : `${allItems.length} tipos de itens em ${accounts.length} contas`}
        </div>
        <div className="text-[12px] font-medium text-amber-400">Valor Total: {totalValue.toLocaleString()}g</div>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar por nome..."
            className="w-full pl-6 pr-2 py-1.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))]" />
        </div>
        <button onClick={loadAll} disabled={loading} className="px-3 py-1.5 rounded bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[12px] font-medium hover:brightness-110 disabled:opacity-40">
          {loading ? "..." : "Atualizar"}
        </button>
      </div>
      {filtered.length > 0 && (
        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-[11px]">
            <thead className="bg-[rgb(var(--bg-surface))] sticky top-0 z-10">
              <tr className="text-left text-[rgb(var(--text-muted))]">
                <th className="px-3 py-1.5 font-medium w-8">
                  <button onClick={toggleSelectAll} className="text-[rgb(var(--text-faint))] hover:text-[rgb(var(--accent))] transition-colors">
                    {selectedIds.size === filtered.length && filtered.length > 0 ? <CheckSquare size={14} className="text-[rgb(var(--accent))]" /> : <Square size={14} />}
                  </button>
                </th>
                <th className="px-3 py-1.5 font-medium w-8">Img</th>
                <th className="px-3 py-1.5 font-medium">Item</th>
                <th className="px-3 py-1.5 font-medium">Categoria</th>
                <th className="px-3 py-1.5 font-medium">Qtd Total</th>
                <th className="px-3 py-1.5 font-medium">Preco NPC</th>
                <th className="px-3 py-1.5 font-medium">Contas</th>
                <th className="px-3 py-1.5 font-medium text-right">Acao</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const totalQty = item.accounts.reduce((s, a) => s + a.qty, 0);
                return (
                  <tr key={item.id} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-surface))]/30 transition-colors">
                    <td className="px-3 py-1.5 text-[rgb(var(--text-primary))] font-medium">
                      <button onClick={() => toggleSelect(item.id)} className="text-[rgb(var(--text-faint))] hover:text-[rgb(var(--accent))] transition-colors">
                        {selectedIds.has(item.id) ? <CheckSquare size={14} className="text-[rgb(var(--accent))]" /> : <Square size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-1.5">
                      <img src={getItemIcon(item.name)} alt={item.name} className="w-5 h-5 object-contain"
                           onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </td>
                    <td className="px-3 py-1.5 text-[rgb(var(--text-primary))] font-medium">{item.name}</td>
                    <td className="px-3 py-1.5 text-[rgb(var(--text-muted))]">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        item.category === "Loot" ? "bg-orange-500/20 text-orange-400" :
                        item.category === "Stone" ? "bg-purple-500/20 text-purple-400" :
                        item.category === "Heal" ? "bg-green-500/20 text-green-400" :
                        item.category === "Revive" ? "bg-blue-500/20 text-blue-400" :
                        "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))]"
                      }`}>
                        {item.category || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{totalQty}</td>
                    <td className="px-3 py-1.5 text-amber-400">{item.npcPrice}g</td>
                    <td className="px-3 py-1.5 text-[rgb(var(--text-muted))]">
                      <button onClick={() => setViewAccountsFor(item)} className="px-2 py-0.5 rounded-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] hover:bg-[rgb(var(--accent))]/10 hover:text-[rgb(var(--accent))] hover:border-[rgb(var(--accent))]/30 transition-colors text-[10px] whitespace-nowrap">
                        Ver {item.accounts.length} contas
                      </button>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button onClick={() => openSellConfirm([item])} disabled={selling === "processing"}
                        className="px-2 py-0.5 rounded bg-amber-600/20 text-amber-400 border border-amber-600/30 text-[10px] font-medium hover:bg-amber-600 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap">
                        Vender Tudo
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {filtered.length === 0 && !loading && <div className="text-[12px] text-[rgb(var(--text-faint))] italic py-4 text-center">Nenhum item encontrado</div>}
      
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between border border-amber-500/30 bg-amber-500/5 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="text-[12px] text-amber-400 font-medium">
            {selectedIds.size} itens diferentes selecionados
          </div>
          <button
            onClick={() => {
              const selectedItems = allItems.filter(i => selectedIds.has(i.id));
              openSellConfirm(selectedItems);
            }}
            disabled={selling === "processing"}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 text-white text-[12px] font-medium hover:bg-amber-500 disabled:opacity-40 transition-colors"
          >
            <ShoppingCart size={13} />
            Vender Selecionados
          </button>
        </div>
      )}

      {/* Confirmation Modal overlay */}
      {confirmDialog && confirmDialog.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[400px] shadow-2xl overflow-hidden flex flex-col scale-in-95 animate-in">
            <div className="flex items-center gap-2 px-4 py-3 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border))]">
              <AlertTriangle size={16} className="text-amber-500" />
              <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">Confirmar Venda em Massa</span>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-[12px] text-[rgb(var(--text-secondary))]">
                Você tem certeza que deseja vender <strong>{confirmDialog.items.length}</strong> tipo(s) de item?
              </p>
              
              <div className="bg-[rgb(var(--bg-surface))]/50 rounded-lg p-3 space-y-2 border border-[rgb(var(--border))]">
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[rgb(var(--text-muted))]">Tipos de itens:</span>
                  <span className="font-medium text-[rgb(var(--text-primary))]">{confirmDialog.items.length}</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[rgb(var(--text-muted))]">Soma Total de Quantidade:</span>
                  <span className="font-medium text-[rgb(var(--text-primary))]">{confirmDialog.totalQty} unidades</span>
                </div>
                <div className="flex justify-between items-center text-[12px]">
                  <span className="text-[rgb(var(--text-muted))]">Soma Total de Retorno:</span>
                  <span className="font-medium text-amber-400">{confirmDialog.totalValue.toLocaleString()}g</span>
                </div>
              </div>
              
              <p className="text-[11px] text-red-400/80 bg-red-400/10 p-2 rounded border border-red-400/20 italic">
                Atenção: Esta ação é irreversível e os itens serão vendidos ao NPC em todas as contas envolvidas.
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[rgb(var(--bg-surface))] border-t border-[rgb(var(--border))]">
              <button 
                onClick={() => setConfirmDialog(null)}
                disabled={selling === "processing"}
                className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-[rgb(var(--bg-base))] text-[rgb(var(--text-primary))] border border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-elevated))] transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button 
                onClick={() => executeSell(confirmDialog.items)}
                disabled={selling === "processing"}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-medium bg-amber-600 text-white hover:bg-amber-500 transition-colors disabled:opacity-40 shadow-[0_0_10px_rgba(217,119,6,0.3)]"
              >
                {selling === "processing" ? <RefreshCw size={13} className="animate-spin" /> : <ShoppingCart size={13} />}
                {selling === "processing" ? "Vendendo..." : "Confirmar Venda"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List Modal */}
      {viewAccountsFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setViewAccountsFor(null)}>
          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[350px] shadow-2xl overflow-hidden flex flex-col scale-in-95 animate-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border))]">
              <div className="flex items-center gap-2">
                <img src={getItemIcon(viewAccountsFor.name)} alt="" className="w-5 h-5 object-contain" />
                <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))] truncate max-w-[200px]">Contas com {viewAccountsFor.name}</span>
              </div>
              <button onClick={() => setViewAccountsFor(null)} className="text-[rgb(var(--text-faint))] hover:text-red-400 transition-colors">
                <Square size={14} className="opacity-0" /> {/* Spacer */}
                <span className="absolute top-3.5 right-4"><AlertTriangle size={0} />✕</span>
              </button>
            </div>
            
            <div className="max-h-[300px] overflow-y-auto p-2">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[rgb(var(--text-muted))] border-b border-[rgb(var(--border))]">
                    <th className="px-3 py-1.5 font-medium">Nome da Conta</th>
                    <th className="px-3 py-1.5 font-medium text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {viewAccountsFor.accounts.sort((a,b) => b.qty - a.qty).map((acc, i) => (
                    <tr key={i} className="border-b border-[rgb(var(--border))]/50 hover:bg-[rgb(var(--bg-surface))]/30 transition-colors">
                      <td className="px-3 py-1.5 text-[rgb(var(--text-primary))]">{acc.name}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-[rgb(var(--text-secondary))]">{acc.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function MarketShopView({ accounts, sel, stats }: { accounts: AccountConfig[], sel: Set<string>, stats: any }) {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [targetGold, setTargetGold] = useState<number>(0);
  const [buying, setBuying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [massModal, setMassModal] = useState<{
    title: string;
    logs: { acc: string; type: "success" | "warn" | "error"; msg: string }[];
    current: number;
    total: number;
    finished: boolean;
  } | null>(null);

  const massLogRef = useRef<HTMLDivElement>(null);
  const [autoScrollMass, setAutoScrollMass] = useState(true);

  useEffect(() => {
    if (autoScrollMass && massLogRef.current) {
      massLogRef.current.scrollTop = massLogRef.current.scrollHeight;
    }
  }, [massModal?.logs, autoScrollMass]);

  const handleMassLogScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom = Math.abs(target.scrollHeight - target.scrollTop - target.clientHeight) < 10;
    setAutoScrollMass(isAtBottom);
  };

  const addMassLog = (acc: string, type: "success" | "warn" | "error", msg: string) => {
    setMassModal((prev) => {
      if (!prev) return prev;
      return { ...prev, logs: [...prev.logs, { acc, type, msg }] };
    });
  };

  const fetchShop = useCallback(async () => {
    if (accounts.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let data = null;
      // Try to get data from a selected account first
      const selectedNames = Array.from(sel);
      for (const name of selectedNames) {
         data = await invoke<any>("bot:get-shop", name);
         if (data) break;
      }
      // If still no data, try any account
      if (!data) {
        for (const acc of accounts) {
           if (selectedNames.includes(acc.name)) continue;
           data = await invoke<any>("bot:get-shop", acc.name);
           if (data) break;
        }
      }

      if (!data) {
        setShop(null);
        setErrorMsg("Bot parado ou erro ao obter loja (nenhuma das contas conectadas retornou dados).");
      } else {
        const normalized = {
          balls: (Array.isArray(data.balls) ? data.balls : []).map((b: any) => ({
            id: String(b.id), name: b.name || `Ball ${b.id}`, priceGold: b.priceGold ?? 0, catchRate: b.catchRate ?? 0
          })),
          items: (Array.isArray(data.items) ? data.items : []).map((i: any) => ({
            id: String(i.id), name: i.name || `Item ${i.id}`, priceGold: i.priceGold ?? i.price ?? 0, category: i.category || "item"
          })),
        };
        setShop(normalized);
        const initialQty: Record<string, number> = {};
        normalized.balls.forEach((b: any) => { initialQty[b.id] = 1; });
        normalized.items.forEach((i: any) => { initialQty[i.id] = 1; });
        setBuyQuantities(initialQty);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro: ${err.message || String(err)}`);
    }
    setLoading(false);
  }, [accounts, sel]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleMassBuy = async (itemId: string, basePrice: number, mode: "fixed" | "max" | "upToTarget") => {
    if (!shop || sel.size === 0 || basePrice <= 0) return;
    setBuying(true);
    const names = Array.from(sel);

    setMassModal({
      title: `Compra em Massa (ID: ${itemId})`,
      logs: [],
      current: 0,
      total: names.length,
      finished: false,
    });

    let anyBought = false;
    const tasks = names.map(accName => async () => {
      const s = stats[accName];
      const accGold = s?.gold || 0;
      let currentGold = accGold;

      let qtyToBuy = 0;

      if (mode === "fixed") {
        const reqQty = buyQuantities[itemId] || 1;
        qtyToBuy = currentGold > 0 ? Math.min(reqQty, Math.floor(currentGold / basePrice)) : reqQty;
      } else if (mode === "max") {
        qtyToBuy = Math.floor(currentGold / basePrice);
      } else if (mode === "upToTarget") {
        if (targetGold > 0) {
          const spendAmount = Math.min(currentGold, targetGold);
          qtyToBuy = Math.floor(spendAmount / basePrice);
        }
      }

      if (qtyToBuy > 0) {
        anyBought = true;
        try {
          const res = await invoke<any>("bot:buy-item", accName, Number(itemId), qtyToBuy);
          if (res && res.ok) {
            addMassLog(accName, "success", `Comprou ${qtyToBuy}x (-${qtyToBuy * basePrice}g)`);
          } else {
            addMassLog(accName, "error", `Falha ao comprar (API rejeitou)`);
          }
        } catch (e: any) {
          addMassLog(accName, "error", `Erro: ${e.message || "Falha na comunicação"}`);
        }
      } else {
        addMassLog(accName, "warn", `Saldo insuficiente (${currentGold}g)`);
      }

      setMassModal((prev) => prev ? { ...prev, current: prev.current + 1 } : prev);
    });

    for (let i = 0; i < tasks.length; i += 5) {
      const chunk = tasks.slice(i, i + 5);
      await Promise.all(chunk.map(t => t()));
    }

    if (!anyBought) {
      setErrorMsg(`Nenhuma conta selecionada possuía ouro suficiente para realizar esta compra.`);
      setTimeout(() => setErrorMsg(null), 4000);
    }

    setMassModal((prev) => prev ? { ...prev, finished: true } : prev);
    setBuying(false);
  };

  const allItems = [
    ...(shop?.balls || []).map((b: any) => ({ ...b, type: "ball" as const })),
    ...(shop?.items || []).map((i: any) => ({ ...i, type: "item" as const })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-[rgb(var(--text-primary))]">Comprar para {sel.size} conta(s) selecionada(s)</h4>
        <button onClick={fetchShop} disabled={loading} className="p-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] disabled:opacity-40">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {shop && (
        <div className="bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))] rounded-lg p-3 flex items-center gap-4">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[rgb(var(--text-muted))]">Comprar ate:</span>
            <input type="number" min={0} value={targetGold} onChange={(e) => setTargetGold(Math.max(0, Number(e.target.value)))} className="w-20 px-2 py-1 rounded bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]" />
            <span className="text-[11px] text-[rgb(var(--text-muted))]">g de gasto</span>
          </div>
        </div>
      )}

      {shop && shop.balls && shop.balls.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[rgb(var(--text-primary))] mb-2"><CircleDot size={12} /> Pokebolas</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {shop.balls.map((ball: any) => {
              const qty = buyQuantities[ball.id] || 1;
              const totalCost = ball.priceGold * qty;
              return (
                <div key={ball.id} className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={getItemIcon(ball.name)} alt="" className="w-5 h-5 object-contain" />
                      <span className="text-[11px] font-medium text-[rgb(var(--text-primary))]">{ball.name}</span>
                    </div>
                    <span className="text-[10px] text-amber-400">{ball.priceGold}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={qty} onChange={(e) => setBuyQuantities((prev) => ({ ...prev, [ball.id]: Math.max(1, Number(e.target.value)) }))} className="w-12 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]" />
                    <span className="text-[9px] text-[rgb(var(--text-muted))] w-14 text-right">{totalCost.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleMassBuy(ball.id, ball.priceGold, "fixed")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-green-600/20 text-green-400 text-[9px] font-medium hover:bg-green-600/30 disabled:opacity-40"><ShoppingCart size={9} /> Comprar</button>
                    <button onClick={() => handleMassBuy(ball.id, ball.priceGold, "max")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 text-blue-400 text-[9px] font-medium hover:bg-blue-600/30 disabled:opacity-40"><Zap size={9} /> Max</button>
                  </div>
                  {targetGold > 0 && (
                    <button onClick={() => handleMassBuy(ball.id, ball.priceGold, "upToTarget")} disabled={buying} className="w-full flex items-center justify-center gap-1 py-1 rounded bg-purple-600/20 text-purple-400 text-[9px] font-medium hover:bg-purple-600/30 disabled:opacity-40">Ate {targetGold.toLocaleString()}g</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shop && shop.items && shop.items.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[rgb(var(--text-primary))] mb-2"><Package size={12} /> Itens</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {shop.items.map((item: any) => {
              const qty = buyQuantities[item.id] || 1;
              const totalCost = item.priceGold * qty;
              return (
                <div key={item.id} className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={getItemIcon(item.name)} alt="" className="w-5 h-5 object-contain shrink-0" />
                      <span className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 shrink-0">{item.priceGold}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={qty} onChange={(e) => setBuyQuantities((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value)) }))} className="w-12 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]" />
                    <span className="text-[9px] text-[rgb(var(--text-muted))] w-14 text-right">{totalCost.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleMassBuy(item.id, item.priceGold, "fixed")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-green-600/20 text-green-400 text-[9px] font-medium hover:bg-green-600/30 disabled:opacity-40"><ShoppingCart size={9} /> Comprar</button>
                    <button onClick={() => handleMassBuy(item.id, item.priceGold, "max")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 text-blue-400 text-[9px] font-medium hover:bg-blue-600/30 disabled:opacity-40"><Zap size={9} /> Max</button>
                  </div>
                  {targetGold > 0 && (
                    <button onClick={() => handleMassBuy(item.id, item.priceGold, "upToTarget")} disabled={buying} className="w-full flex items-center justify-center gap-1 py-1 rounded bg-purple-600/20 text-purple-400 text-[9px] font-medium hover:bg-purple-600/30 disabled:opacity-40">Ate {targetGold.toLocaleString()}g</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shop && allItems.length === 0 && !loading && (
        <div className="text-center py-6 text-[11px] text-[rgb(var(--text-muted))] italic">Nenhum item disponivel</div>
      )}

      {massModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
              <h3 className="font-semibold text-sm text-[rgb(var(--text-primary))]">{massModal.title}</h3>
              {massModal.finished && (
                <button onClick={() => setMassModal(null)} className="p-1 rounded text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-hover))] transition-colors"><X size={16} /></button>
              )}
            </div>

            <div className="p-4 flex flex-col gap-3 overflow-hidden flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[rgb(var(--text-muted))]">Progresso:</span>
                <span className="font-medium text-[rgb(var(--text-primary))]">{massModal.current} / {massModal.total}</span>
              </div>
              
              <div className="w-full h-2 bg-[rgb(var(--bg-hover))] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${massModal.finished ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${(massModal.current / massModal.total) * 100}%` }}
                />
              </div>

              <div 
                ref={massLogRef}
                onScroll={handleMassLogScroll}
                className="flex-1 overflow-y-auto bg-black/20 rounded border border-[rgb(var(--border))] p-2 space-y-1 mt-2"
              >
                {massModal.logs.map((log, i) => (
                  <div key={i} className="flex text-[11px] items-start gap-2 py-1 border-b border-[rgb(var(--border))]/50 last:border-0">
                    <span className="font-semibold shrink-0 w-24 truncate text-[rgb(var(--text-primary))]" title={log.acc}>{log.acc}</span>
                    <span className={`flex-1 break-words ${log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                      {log.msg}
                    </span>
                  </div>
                ))}
                {massModal.logs.length === 0 && !massModal.finished && (
                  <div className="text-center py-4 text-[11px] text-[rgb(var(--text-muted))] italic">Iniciando compras...</div>
                )}
              </div>
            </div>

            {massModal.finished && (
              <div className="p-4 border-t border-[rgb(var(--border))]">
                <button 
                  onClick={() => setMassModal(null)}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {loading && <div className="text-center py-6 text-[11px] text-[rgb(var(--text-muted))]"><RefreshCw size={14} className="animate-spin mx-auto mb-1" /> Carregando loja...</div>}
      {!shop && !loading && (
        <div className="text-center py-6 text-[11px] text-[rgb(var(--text-muted))] italic">
          Falha ao carregar itens da loja.
          {errorMsg && <div className="text-red-400 mt-1">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
}

const TYPES = [
  "normal","fire","water","electric","grass","ice","fighting","poison",
  "ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy",
];

const TYPE_PT: Record<string, string> = {
  normal: "Normal", fire: "Fogo", water: "Agua", electric: "Eletrico",
  grass: "Planta", ice: "Gelo", fighting: "Lutador", poison: "Veneno",
  ground: "Terra", flying: "Voador", psychic: "Psiquico", bug: "Inseto",
  rock: "Pedra", ghost: "Fantasma", dragon: "Dragon", dark: "Sombrio",
  steel: "Aco", fairy: "Fada",
};

function MassSellPokemonTab({ accounts, sel }: { accounts: AccountConfig[], sel: Set<string> }) {
  const [types, setTypes] = useState<string[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);
  const [useMaxIv, setUseMaxIv] = useState(false);
  const [useMaxQuality, setUseMaxQuality] = useState(false);
  const [useMaxScore, setUseMaxScore] = useState(false);
  const [maxIv, setMaxIv] = useState<number>(100);
  const [maxQuality, setMaxQuality] = useState<number>(1.4);
  const [maxScore, setMaxScore] = useState<number>(150);
  const [keepShiny, setKeepShiny] = useState(true);
  const [keepLegendary, setKeepLegendary] = useState(true);

  const [massModal, setMassModal] = useState<{
    title: string;
    logs: { acc: string; type: "success" | "warn" | "error"; msg: string }[];
    current: number;
    total: number;
    finished: boolean;
  } | null>(null);

  const massLogRef = useRef<HTMLDivElement>(null);
  const [autoScrollLog, setAutoScrollLog] = useState(true);

  const handleMassLogScroll = () => {
    if (!massLogRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = massLogRef.current;
    setAutoScrollLog(scrollHeight - scrollTop - clientHeight < 20);
  };

  useEffect(() => {
    if (autoScrollLog && massLogRef.current) {
      massLogRef.current.scrollTop = massLogRef.current.scrollHeight;
    }
  }, [massModal?.logs.length, autoScrollLog]);

  const toggleType = (t: string) => setTypes(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const toggleRarity = (r: string) => setRarities(p => p.includes(r) ? p.filter(x => x !== r) : [...p, r]);

  const startMassSell = async () => {
    const names = Array.from(sel);
    if (names.length === 0) return;

    setMassModal({
      title: "Venda Massiva de Pokemons",
      logs: [],
      current: 0,
      total: names.length,
      finished: false,
    });

    const tasks: (() => Promise<void>)[] = [];

    for (const accName of names) {
      tasks.push(async () => {
        try {
          const pokemonList = await invoke<any[]>("bot:get-all-pokemon", accName);
          if (!pokemonList) {
            setMassModal((prev: any) => prev ? { ...prev, current: prev.current + 1, logs: [...prev.logs, { acc: accName, type: "error", msg: "Falha ao obter pokedex" }] } : prev);
            return;
          }

          const toSell: string[] = [];
          for (const p of pokemonList) {
            if (p.locked || p.leader || p.team) continue;

            // Extrai rarity
            const rawR = (p.tier || p.rarity || "").toLowerCase().trim();
            let rarity = "COMMON";
            if (rawR === "fraca" || rawR === "weak") rarity = "FRACA";
            else if (rawR === "incomum" || rawR === "uncommon") rarity = "UNCOMMON";
            else if (rawR === "rara" || rawR === "rare") rarity = "RARE";
            else if (rawR === "epica" || rawR === "epic") rarity = "EPIC";
            else if (rawR === "lendaria" || rawR === "legendary") rarity = "LEGENDARY";
            else if (rawR === "mitica" || rawR === "mythic") rarity = "MYTHIC";
            else if (rawR === "antiga" || rawR === "ancient") rarity = "ANTIGA";
            else if (rawR === "divina" || rawR === "divine") rarity = "DIVINA";
            else {
              const q = p.quality ?? 0;
              if (q >= 1.7) rarity = "LEGENDARY";
              else if (q >= 1.5) rarity = "EPIC";
              else if (q >= 1.3) rarity = "RARE";
              else if (q >= 1.1) rarity = "UNCOMMON";
            }

            // Extrai types
            const t1 = (p.type1 || "").toLowerCase();
            const t2 = (p.type2 || "").toLowerCase();
            const pTypes: string[] = [];
            if (t1) pTypes.push(t1);
            if (t2) pTypes.push(t2);
            if (p.types) pTypes.push(...p.types.map((x: any) => String(x).toLowerCase()));
            
            if (keepShiny && p.shiny) continue;
            if (keepLegendary && (rarity === "LEGENDARY" || rarity === "MYTHIC" || rarity === "DIVINA" || rarity === "ANTIGA")) continue;

            if (types.length > 0) {
              if (!pTypes.some(t => types.includes(t))) continue;
            }

            if (rarities.length > 0) {
              if (!rarities.includes(rarity)) continue;
            }

            const pIv = p.ivTotal ?? 0;
            if (useMaxIv && pIv > maxIv) continue;

            const pQ = p.quality ?? 0;
            if (useMaxQuality && pQ > maxQuality) continue;

            const pScore = p.score ?? 0;
            if (useMaxScore && pScore > maxScore) continue;

            toSell.push(p.id);
          }

          if (toSell.length > 0) {
            const res = await invoke<any>("bot:sell-pokemon", accName, toSell);
            if (res?.ok) {
              setMassModal((prev: any) => prev ? { ...prev, current: prev.current + 1, logs: [...prev.logs, { acc: accName, type: "success", msg: `Vendeu ${toSell.length} pokemons.` }] } : prev);
            } else {
              setMassModal((prev: any) => prev ? { ...prev, current: prev.current + 1, logs: [...prev.logs, { acc: accName, type: "warn", msg: `Tentou vender ${toSell.length}, mas falhou.` }] } : prev);
            }
          } else {
              setMassModal((prev: any) => prev ? { ...prev, current: prev.current + 1, logs: [...prev.logs, { acc: accName, type: "success", msg: "Nenhum pokemon atendeu os filtros." }] } : prev);
          }

        } catch (e: any) {
           setMassModal((prev: any) => prev ? { ...prev, current: prev.current + 1, logs: [...prev.logs, { acc: accName, type: "error", msg: `Erro: ${e.message}` }] } : prev);
        }
      });
    }

    for (let i = 0; i < tasks.length; i += 5) {
      const chunk = tasks.slice(i, i + 5);
      await Promise.all(chunk.map(t => t()));
    }

    setMassModal((prev: any) => prev ? { ...prev, finished: true } : prev);
  };

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))]"><Coins size={14} /> Venda Massiva de Pokemons</h3>
      <div className="bg-[rgb(var(--bg-surface))]/30 border border-[rgb(var(--border))] rounded-lg p-3 space-y-3">
        <p className="text-[11px] text-[rgb(var(--text-muted))]">Selecione os filtros abaixo. Apenas Pokemons que atenderem a <strong className="text-[rgb(var(--text-primary))]">TODOS</strong> os criterios (Raridade E Tipo E Limites) serao vendidos.</p>
        
        <div className="space-y-1">
          <div className="text-[11px] font-medium text-[rgb(var(--text-primary))]">Raridades Permitidas para Venda (vazio = todas)</div>
          <div className="flex flex-wrap gap-1.5">
            {["FRACA", "COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY", "MYTHIC", "ANTIGA", "DIVINA"].map(r => (
              <label key={r} className={`flex items-center gap-1 text-[11px] cursor-pointer px-2 py-1 rounded border transition-colors ${rarities.includes(r) ? "bg-[rgb(var(--accent))]/10 border-[rgb(var(--accent))] text-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-secondary))]"}`}>
                <input type="checkbox" checked={rarities.includes(r)} onChange={() => toggleRarity(r)} className="hidden" /> {r}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[11px] font-medium text-[rgb(var(--text-primary))]">Tipos Permitidos (vazio = todos)</div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map(t => (
              <label key={t} className={`flex items-center gap-1 text-[11px] cursor-pointer px-2 py-1 rounded border transition-colors ${types.includes(t) ? "bg-[rgb(var(--accent))]/10 border-[rgb(var(--accent))] text-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-secondary))]"}`}>
                <input type="checkbox" checked={types.includes(t)} onChange={() => toggleType(t)} className="hidden" /> {TYPE_PT[t]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Toggle label="Limitar por IV" checked={useMaxIv} onChange={setUseMaxIv} />
            {useMaxIv && (
              <Field label="IV Max (Vende <= X)">
                <input type="number" min="0" max="192" value={maxIv} onChange={e => setMaxIv(Number(e.target.value))} className={inputCls} />
              </Field>
            )}
          </div>
          <div className="space-y-1">
            <Toggle label="Limitar por Qualidade" checked={useMaxQuality} onChange={setUseMaxQuality} />
            {useMaxQuality && (
              <Field label="Qualidade Max">
                <input type="number" min="0" max="10" step="0.1" value={maxQuality} onChange={e => setMaxQuality(Number(e.target.value))} className={inputCls} />
              </Field>
            )}
          </div>
          <div className="space-y-1">
            <Toggle label="Limitar por Score" checked={useMaxScore} onChange={setUseMaxScore} />
            {useMaxScore && (
              <Field label="Score Max">
                <input type="number" min="0" value={maxScore} onChange={e => setMaxScore(Number(e.target.value))} className={inputCls} />
              </Field>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
           <Toggle label="Proteger Shinies" checked={keepShiny} onChange={setKeepShiny} />
           <Toggle label="Proteger Lendarios+" checked={keepLegendary} onChange={setKeepLegendary} />
        </div>
      </div>
      <button onClick={startMassSell} className="w-full flex items-center justify-center gap-2 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded text-[13px] transition-colors">
        <Coins size={14} /> Iniciar Venda Massiva ({sel.size} contas)
      </button>

      {massModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
              <h3 className="font-semibold text-sm text-[rgb(var(--text-primary))]">{massModal.title}</h3>
              {massModal.finished && (
                <button onClick={() => setMassModal(null)} className="p-1 rounded text-[rgb(var(--text-muted))] hover:bg-[rgb(var(--bg-hover))] transition-colors"><X size={16} /></button>
              )}
            </div>
            <div className="p-4 flex flex-col gap-3 overflow-hidden flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[rgb(var(--text-muted))]">Progresso:</span>
                <span className="font-medium text-[rgb(var(--text-primary))]">{massModal.current} / {massModal.total}</span>
              </div>
              <div className="w-full h-2 bg-[rgb(var(--bg-hover))] rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${massModal.finished ? 'bg-green-500' : 'bg-blue-500'}`}
                  style={{ width: `${(massModal.current / massModal.total) * 100}%` }}
                />
              </div>
              <div 
                ref={massLogRef}
                onScroll={handleMassLogScroll}
                className="flex-1 overflow-y-auto bg-black/20 rounded border border-[rgb(var(--border))] p-2 space-y-1 mt-2"
              >
                {massModal.logs.map((log, i) => (
                  <div key={i} className="flex text-[11px] items-start gap-2 py-1 border-b border-[rgb(var(--border))]/50 last:border-0">
                    <span className="font-semibold shrink-0 w-24 truncate text-[rgb(var(--text-primary))]" title={log.acc}>{log.acc}</span>
                    <span className={`flex-1 break-words ${log.type === 'success' ? 'text-green-400' : log.type === 'error' ? 'text-red-400' : 'text-amber-400'}`}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {massModal.finished && (
              <div className="p-4 border-t border-[rgb(var(--border))]">
                <button onClick={() => setMassModal(null)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded text-sm transition-colors">
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
