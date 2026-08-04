import itemsData from '@shared/items_data.json';
import { useState, useEffect } from "react";
import { invoke } from "../../lib/ipc";
import { useBotStore } from "../../stores/botStore";
import { formatUptime, formatNumber } from "../../lib/utils";
import { SettingsDialog, getBallIcon } from "../ui/SettingsDialog";
import { LootTable } from "../ui/LootTable";
import { MultiLogView } from "../panels/MultiLogView";
import { TeamPanel } from "../panels/TeamPanel";
import { MyPokemonPanel } from "../panels/MyPokemonPanel";
import { InventoryPanel } from "../panels/InventoryPanel";
import { ShopPanel } from "../panels/ShopPanel";
import { CaptureLogPanel } from "../panels/CaptureLogPanel";
import { ShinyRadarPanel } from "../panels/ShinyRadarPanel";
import { loadJSON } from "../../lib/dataLoader";
import type { AccountConfig } from "../../types";
import { Play, Box, Square, Settings, Target, Zap, Shield, ShoppingCart, Route, Trophy, Droplets, Sword, Heart, Clock, Star, CircleDot, BarChart3, Crown, Package, Store, Camera, Copy } from "lucide-react";

interface Props {
  account: AccountConfig;
  onAccountUpdated: (acc: AccountConfig) => void;
  onOpenHuntSelector: (accountName: string) => void;
}

const BALL_NAMES: Record<number, string> = { 1: "Poke Ball", 2: "Great Ball", 3: "Super Ball", 4: "Ultra Ball", 5: "Master Ball", 6: "Idle Ball" };

type TabId = "equipe" | "pokemon" | "inventario" | "loja" | "capturas" | "radar" | "log";
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "equipe", label: "Equipe", icon: <Crown size={13} /> },
  { id: "pokemon", label: "Meus Pokemon", icon: <Box size={13} /> },
  { id: "inventario", label: "Inventario", icon: <Package size={13} /> },
  { id: "loja", label: "Loja", icon: <Store size={13} /> },
  { id: "capturas", label: "Capturas", icon: <Camera size={13} /> },
  { id: "radar", label: "Radar", icon: <Target size={13} /> },
  { id: "log", label: "Log", icon: <BarChart3 size={13} /> },
];


function getItemIcon(name: string) {
  if (!name) return "";
  const n = name.toLowerCase();
  if (n === 'poké ball' || n === 'poke ball') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png";
  if (n === 'great ball') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/great-ball.png";
  if (n === 'super ball') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/safari-ball.png";
  if (n === 'ultra ball') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/ultra-ball.png";
  if (n === 'master ball') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/master-ball.png";
  if (n === 'idle ball') return "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cherish-ball.png";

  const found = itemsData.find((i: any) => i.name.toLowerCase() === n);
  if (found && found.icon) return found.icon;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${n.replace(/é/g, 'e').replace(/\s+/g, '-')}.png`;
}
function getSpriteUrl(slug: string, dexMap: Record<string, number>): string {
  const clean = slug.toLowerCase().replace(/^(furious_|brave_|ancient_|elder_|evil_|dark_|psy_|hard_|brute_|trickmaster_|banshee_|enchanted_|tactical_|magnetic_|freezing_|heavy_|milch_|roll_|charged_|tribal_)/, "");
  const dex = dexMap[clean] || dexMap[slug.toLowerCase()] || 0;
  if (dex > 0) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

export function AccountPage({ account, onAccountUpdated, onOpenHuntSelector }: Props) {
  const { stats } = useBotStore();
  const s = stats[account.name];
  const [isStarting, setIsStarting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<TabId>("equipe");

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
  }, []);

  const handleStart = async () => { setIsStarting(true); await invoke("bot:start", account.name); setIsStarting(false); };
  const handleStop = async () => { await invoke("bot:stop", account.name); };
  const handleSaveSettings = async (updated: AccountConfig) => { await onAccountUpdated(updated); setShowSettings(false); };

  const [localProxy, setLocalProxy] = useState(account.proxy || "");
  useEffect(() => { setLocalProxy(account.proxy || ""); }, [account.proxy]);

  const handleSaveProxy = async () => {
    const updated = { ...account, proxy: localProxy };
    await onAccountUpdated(updated);
  };

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-[rgb(var(--text-primary))]">{account.name}</h1>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${s?.connected ? "bg-green-600/20 text-green-400" : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))]"}`}>
            {s?.connected ? <><CircleDot size={9} /> Conectado</> : <><Square size={9} /> Parado</>}
          </span>
          {s && <span className="flex items-center gap-1 text-[12px] text-amber-400 font-medium"><Trophy size={12} /> {formatNumber(s.gold || 0)}</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onOpenHuntSelector(account.name)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] transition-colors">
            <Target size={13} /> Hunt
          </button>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] transition-colors">
            <Settings size={13} /> Configuracoes
          </button>
          <button onClick={handleStart} disabled={s?.connected || isStarting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Zap size={12} /> {isStarting ? "Conectando..." : "Conectar"}
          </button>
          
          {s?.connected ? (
            s.inHunt ? (
              <button onClick={() => invoke("bot:stop-hunt", account.name)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium bg-red-600 text-white hover:bg-red-500 transition-colors">
                <Square size={12} /> Parar Hunt
              </button>
            ) : (
              <button onClick={() => invoke("bot:start-hunt", account.name, account.hunt)}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium bg-green-600 text-white hover:bg-green-500 transition-colors">
                <Play size={12} /> Hunt: <span className="capitalize">{account.hunt}</span>
              </button>
            )
          ) : null}

          <button onClick={handleStop} disabled={!s}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[12px] font-medium bg-red-800 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Square size={12} /> Desconectar
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 space-y-4">
          <Section title="Configuracao da Conta" icon={<Settings size={13} />} defaultCollapsed={true}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-[rgb(var(--text-faint))] mb-1">Token JWT</label>
                <div className="flex items-center gap-2">
                  <div className="px-2 py-1.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-muted))] font-mono truncate max-w-[200px] flex-1">
                    {account.token ? account.token.substring(0, 30) + "..." : "(nao definido)"}
                  </div>
                  {account.token && (
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(account.token || "");
                        alert("Token JWT copiado para a area de transferencia!");
                      }}
                      className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent))] hover:text-[rgb(var(--accent))] transition-colors"
                      title="Copiar JWT"
                    >
                      <Copy size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-[rgb(var(--text-faint))] mb-1">Proxy</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={localProxy}
                    onChange={(e) => setLocalProxy(e.target.value)}
                    placeholder="http://user:pass@ip:port"
                    className="flex-1 px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  />
                  <button onClick={handleSaveProxy} disabled={localProxy === (account.proxy || "")} className="px-3 py-1 rounded text-[11px] font-medium bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/25 disabled:opacity-40 transition-colors">
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </Section>

          <Section title="Hunt Atual" icon={<Target size={13} />} action={<button onClick={() => onOpenHuntSelector(account.name)} className="text-[11px] text-[rgb(var(--accent))] hover:brightness-110">Trocar</button>}>
            <div className="flex items-center gap-3">
              <img src={getSpriteUrl(account.hunt, dexMap)} alt={account.hunt} className="w-16 h-16 object-contain"
                onError={(e) => { const dex = dexMap[account.hunt.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
              <div>
                <div className="text-[14px] font-bold text-[rgb(var(--text-primary))] capitalize">{account.hunt}</div>
                <div className="text-[11px] text-[rgb(var(--text-muted))]">{s?.inHunt ? `Huntando: ${s.huntSlug || account.hunt}` : "Nao esta huntando"}</div>
              </div>
            </div>
          </Section>

          <Section title="Sistema de Rotas" icon={<Route size={13} />}>
            <div className="flex items-center gap-2 text-[11px] text-[rgb(var(--text-muted))]">
              {account.route_enabled ? <><Zap size={10} className="text-green-400" /> {account.route_rules?.length || 0} regras{account.route_continue_infinite && " - Continuar infinito"}</> : <><Shield size={10} className="text-[rgb(var(--text-faint))]" /> Desativado</>}
            </div>
          </Section>

          <Section title="Regras de Compra de Bolas" icon={<ShoppingCart size={13} />}>
            {(account.ball_rules || []).length > 0 ? (
              <div className="space-y-1">
                {(account.ball_rules || []).map((rule: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-[rgb(var(--text-secondary))] bg-[rgb(var(--bg-surface))] p-1 rounded">
                    <img src={getBallIcon(rule.ball_id || rule.ballType)} alt="Ball" className="w-4 h-4 object-contain" />
                    <span>{BALL_NAMES[rule.ball_id || rule.ballType] || `Bola #${rule.ball_id}`}</span>
                    <span className="text-[rgb(var(--text-faint))]">|</span>
                    <span>Min: {rule.min_qty || rule.min || 10}</span>
                    <span className="text-[rgb(var(--text-faint))]">|</span>
                    <span>Comprar: {rule.buy_qty || rule.buy || 50}</span>
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${rule.enabled !== false ? "bg-green-400" : "bg-red-400"}`} />
                  </div>
                ))}
              </div>
            ) : <div className="text-[11px] text-[rgb(var(--text-faint))]">Nenhuma regra configurada</div>}
          </Section>

          <Section title="Filtro de Pokemon" icon={<Target size={13} />}>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Info label="Score Min" value={String(account.sell_config.min_score_keep)} />
              <Info label="IV ATK" value={String(account.sell_config.min_iv_atk)} />
              <Info label="IV Speed" value={String(account.sell_config.min_iv_speed)} />
              <Info label="Raridade Min" value={account.sell_config.keep_min_rarity} />
            </div>
          </Section>

          <Section title="Bolas de Captura" icon={<Droplets size={13} />}>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Info label="Captura" value={<span className="flex items-center gap-1"><img src={getBallIcon(account.sell_config.catch_ball_id)} className="w-4 h-4" />{BALL_NAMES[account.sell_config.catch_ball_id] || "?"}</span>} />
              <Info label="Shiny" value={<span className="flex items-center gap-1"><img src={getBallIcon(account.sell_config.shiny_ball_id)} className="w-4 h-4" />{BALL_NAMES[account.sell_config.shiny_ball_id] || "?"}</span>} />
              <Info label="Auto-melhor" value={account.sell_config.best_cball ? <span className="flex items-center gap-1"><img src={getBallIcon(account.sell_config.max_cball_id)} className="w-4 h-4" />Ate {BALL_NAMES[account.sell_config.max_cball_id]}</span> : "Nao"} />
            </div>
          </Section>

          <Section title="Cassino Automatico (Marlon)" icon={<Trophy size={13} />}>
            <CasinoReroll name={account.name} />
          </Section>
        </div>

        <div className="flex-1 space-y-4">
          <Section title="Ações Manuais" icon={<Zap size={13} />}>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex gap-1">
                <select id={`fish-tier-${account.name}`} className="w-14 text-[11px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded px-1 outline-none">
                  <option value="0">T0</option>
                  <option value="1">T1</option>
                  <option value="2">T2</option>
                  <option value="3">T3</option>
                  <option value="4">T4</option>
                  <option value="5">T5</option>
                </select>
                <button onClick={() => {
                  const tier = parseInt((document.getElementById(`fish-tier-${account.name}`) as HTMLSelectElement).value);
                  invoke("bot:start-fishing", account.name, tier);
                }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium bg-teal-600 text-white hover:bg-teal-500 transition-colors">Pescar</button>
              </div>
              <button onClick={() => invoke("bot:claim-streak", account.name)} className="flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium bg-purple-600 text-white hover:bg-purple-500 transition-colors">Bonus Diario</button>
              <button onClick={() => invoke("bot:claim-bp", account.name)} className="flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium bg-yellow-600 text-white hover:bg-yellow-500 transition-colors">Battle Pass</button>
              <button onClick={() => invoke("bot:claim-all", account.name)} className="flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] font-medium bg-pink-600 text-white hover:bg-pink-500 transition-colors">Resgatar Tudo</button>
            </div>
          </Section>
          
          <Section title="Estatisticas & Drops da Sessao" icon={<BarChart3 size={13} />}>
            {s ? (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <MiniStat icon={<Sword size={11} />} label="Kills" value={formatNumber(s.kills || 0)} sub={`${s.kph || 0}/h`} />
                  <MiniStat icon={<CircleDot size={11} />} label="Capturas" value={formatNumber(s.captures || 0)} color="text-blue-400" />
                  <MiniStat icon={<Star size={11} />} label="Shiny" value={String(s.shiny || 0)} color="text-yellow-400" />
                  <MiniStat icon={<Trophy size={11} />} label="Gold" value={formatNumber(s.gold || 0)} sub={`${s.gph || 0}/h`} />
                  
                  <MiniStat icon={<Zap size={11} />} label="XP (Hunt)" value={formatNumber(s.xp || 0)} sub={`${s.xph || 0}/h`} color="text-purple-400" />
                  <MiniStat icon={<Zap size={11} />} label="XP Soneca" value={formatNumber(s.passiveXp || 0)} color="text-indigo-400" />
                  <MiniStat icon={<Clock size={11} />} label="Uptime" value={formatUptime(s.uptime || 0)} color="text-slate-400" />
                  <MiniStat icon={<Heart size={11} />} label="HP" value={`${s.heroHp || 0}/${s.heroMaxHp || 1}`} />
                  <MiniStat icon={<Droplets size={11} />} label="Bolas" value={String(s.ballsUsed || 0)} color="text-blue-300" />
                  
                  <MiniStat icon={<Trophy size={11} />} label="Loot ($)" value={`$${formatNumber(s.lootGold || 0)}`} color="text-amber-400" />
                  <MiniStat icon={<ShoppingCart size={11} />} label="Supply" value={`$${formatNumber(s.supplyGold || 0)}`} color="text-red-400" />
                  <MiniStat icon={<BarChart3 size={11} />} label="Saldo" value={`$${formatNumber((s.lootGold || 0) - (s.supplyGold || 0))}`} color={(s.lootGold || 0) >= (s.supplyGold || 0) ? "text-green-400" : "text-red-400"} />
                  <MiniStat icon={<Heart size={11} />} label="Level" value={String(s.heroLevel || 1)} />
                </div>
                <div className="border-t border-[rgb(var(--border))] pt-3 mt-3">
                  <LootTable accountName={account.name} />
                </div>
              </div>
            ) : <div className="text-[12px] text-[rgb(var(--text-faint))] italic">Sem dados - inicie a conta</div>}
          </Section>
        </div>
      </div>

      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden">
        <div className="flex border-b border-[rgb(var(--border))] overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[rgb(var(--accent))] text-[rgb(var(--accent))] bg-[rgb(var(--bg-surface))]/50"
                  : "border-transparent text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface))]/30"
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-[400px]">
          <div style={{ display: activeTab === "equipe" ? "block" : "none" }}>
            <TeamPanel accountName={account.name} onRefresh={() => onAccountUpdated(account)} />
          </div>
          <div style={{ display: activeTab === "pokemon" ? "block" : "none" }}>
            <MyPokemonPanel accountName={account.name} onRefresh={() => onAccountUpdated(account)} />
          </div>
          <div style={{ display: activeTab === "inventario" ? "block" : "none" }}>
            <InventoryPanel accountName={account.name} />
          </div>
          <div style={{ display: activeTab === "loja" ? "block" : "none" }}>
            <ShopPanel accountName={account.name} />
          </div>
          <div style={{ display: activeTab === "capturas" ? "block" : "none" }}>
            <CaptureLogPanel accountName={account.name} />
          </div>
          <div style={{ display: activeTab === "radar" ? "block" : "none" }}>
            <ShinyRadarPanel accountName={account.name} onRefresh={() => onAccountUpdated(account)} />
          </div>
          <div style={{ display: activeTab === "log" ? "block" : "none" }}>
            <div className="h-[60vh] min-h-[400px]">
              <MultiLogView title={`Log da Conta - ${account.name}`} filterAccount={account.name} />
            </div>
          </div>
        </div>
      </div>

      {showSettings && <SettingsDialog account={account} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function Section({ title, icon, action, defaultCollapsed, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; defaultCollapsed?: boolean; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed || false);
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3">
      <div className={`flex items-center justify-between ${collapsed ? '' : 'mb-2'}`}>
        <div 
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold cursor-pointer select-none hover:text-[rgb(var(--text-primary))] transition-colors"
          onClick={() => setCollapsed(!collapsed)}
        >
          {icon}{title}
        </div>
        {action}
      </div>
      {!collapsed && children}
    </div>
  );
}

function MiniStat({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[rgb(var(--bg-surface))] rounded-md p-2">
      <div className="flex items-center gap-1 text-[9px] uppercase text-[rgb(var(--text-muted))]">{icon}{label}</div>
      <div className={`text-[13px] font-bold ${color || "text-[rgb(var(--text-primary))]"}`}>{value}</div>
      {sub && <div className="text-[9px] text-[rgb(var(--text-muted))]">{sub}</div>}
    </div>
  );
}

function AnalyzerCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-surface))] rounded-md p-2">
      <div className="text-[9px] text-[rgb(var(--text-muted))]">{label}</div>
      <div className={`text-[14px] font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[rgb(var(--text-muted))]">{label}:</span>
      <span className="text-[rgb(var(--text-primary))]">{value}</span>
    </div>
  );
}




function CasinoReroll({ name }: { name: string }) {
  const [pokemon, setPokemon] = useState(133);
  const [attempts, setAttempts] = useState(50);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);

  const POKEMON = [{ id: 133, name: "Eevee" }, { id: 122, name: "Mr. Mime" }, { id: 137, name: "Porygon" }];

  useEffect(() => {
    if (!running) return;
    let active = true;
    const run = async () => {
      for (let i = current; i < attempts; i++) {
        if (!active) break;
        setCurrent(i + 1);
        await invoke("bot:casino-reroll", name, pokemon);
        await new Promise(r => setTimeout(r, 1500)); // Delay between rerolls
      }
      if (active) setRunning(false);
    };
    run();
    return () => { active = false; };
  }, [running, attempts, name, pokemon]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-[rgb(var(--text-muted))] mb-1">Pokemon</div>
          <select disabled={running} value={pokemon} onChange={(e) => setPokemon(Number(e.target.value))} className="w-full px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))]">
            {POKEMON.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] text-[rgb(var(--text-muted))] mb-1">Tentativas</div>
          <input disabled={running} type="number" value={attempts} min={1} onChange={(e) => setAttempts(Number(e.target.value))} className="w-full px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))]" />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <button 
          onClick={() => {
            if (running) { setRunning(false); }
            else { setCurrent(0); setRunning(true); }
          }} 
          className={`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors ${running ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
        >
          {running ? "Parar Reroll" : "Iniciar Reroll"}
        </button>
        <div className="text-[11px] text-[rgb(var(--text-muted))]">
          {current} / {attempts}
        </div>
      </div>
    </div>
  );
}
