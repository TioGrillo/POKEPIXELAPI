// @ts-nocheck
import { useState, useEffect } from "react";
import type { AccountConfig } from "../../types";
import { X, ChevronRight } from "lucide-react";
import { loadJSON } from "../../lib/dataLoader";
import { invoke } from "../../lib/ipc";
import { HuntSelector } from "./HuntSelector";

function getSpriteUrl(slug: string, dexMap: Record<string, number>): string {
  const clean = slug.toLowerCase().replace(/^(furious|brave|ancient|elder|evil|dark|psy|hard|brute|trickmaster|banshee|enchanted|tactical|magnetic|freezing|heavy|roll|charged|tribal|war|enigmatic|enraged|taekwondo)[\s_]+/g, "").replace(/^milch-/, "").trim();
  const dex = dexMap[clean] || dexMap[slug.toLowerCase()] || 0;
  if (dex > 0) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${dex}.gif`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
}

export function getBallIcon(id: number): string {
  const map: Record<number, string> = {
    1: "poke-ball", 2: "great-ball", 3: "ultra-ball", 4: "ultra-ball", 5: "master-ball", 6: "poke-ball",
    201: "poke-ball", 202: "great-ball", 203: "ultra-ball", 204: "master-ball",
  };
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${map[id] || "poke-ball"}.png`;
}

interface Props { account: AccountConfig; onSave: (updated: AccountConfig) => void; onClose: () => void; }

const BALL_IDS: Record<number, string> = { 1: "Poke Ball", 2: "Great Ball", 3: "Super Ball", 4: "Ultra Ball", 5: "Master Ball", 6: "Idle Ball" };
const SELL_CATS = ["loot", "heal", "stone", "revive", "misc"];
const RARITIES = [{ value: "fraca", label: "Fraca" }, { value: "comum", label: "Comum" }, { value: "incomum", label: "Incomum" }, { value: "rara", label: "Rara" }, { value: "epica", label: "Epica" }, { value: "lendaria", label: "Lendaria" }];
type Tab = "geral" | "bolas" | "venda" | "sniper" | "auto" | "rotas";

export function SettingsDialog({ account, onSave, onClose }: Props) {
  const [cfg, setCfg] = useState<AccountConfig>({ ...account });
  const [sc, setSc] = useState({ ...account.sell_config });
  const [tab, setTab] = useState<Tab>("geral");
  const [dexMap, setDexMap] = useState<Record<string, number>>({});
  const [huntsData, setHuntsData] = useState<any[]>([]);
  const [selectorTarget, setSelectorTarget] = useState<{ type: "geral" } | { type: "rota", index: number } | { type: "ball", field: string } | null>(null);
  const [mountedRoutes, setMountedRoutes] = useState<Record<string, any>>({});

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
    loadJSON<{ hunts: any[] }>("hunts_data.json").then((d) => setHuntsData(d.hunts || []));
    invoke<Record<string, any>>("mounted-routes:list").then(setMountedRoutes).catch(() => {});
  }, []);

  const update = <K extends keyof AccountConfig>(key: K, val: AccountConfig[K]) => setCfg((p) => ({ ...p, [key]: val }));
  const updateSc = <K extends keyof typeof sc>(key: K, val: (typeof sc)[K]) => setSc((p) => ({ ...p, [key]: val }));
  const handleSave = async () => {
    const updated = { ...cfg, sell_config: sc, hunt: cfg.hunt.toLowerCase() };
    onSave(updated);
    // Sync sniper + min_quality settings to the running bot engine
    try {
      await invoke("bot:set-hunt-settings", account.name, {
        min_quality: updated.hunt_min_quality,
        sniper_enabled: sc.sniper_enabled,
        sniper_min_rarity: sc.sniper_min_rarity,
        sniper_only_shiny: sc.sniper_only_shiny,
        sniper_min_iv: sc.sniper_min_iv,
        auto_catch: sc.auto_catch,
      });
    } catch {}
  };

  const tabs: { id: Tab; label: string }[] = [{ id: "geral", label: "Geral" }, { id: "bolas", label: "Bolas" }, { id: "venda", label: "Venda" }, { id: "sniper", label: "Sniper" }, { id: "auto", label: "Auto" }, { id: "rotas", label: "Rotas" }];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[640px] max-h-[80vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">Configuracoes - {account.name}</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"><X size={14} /></button>
        </div>
        <div className="flex gap-1 px-5 pt-3 border-b border-[rgb(var(--border))]">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-[12px] rounded-t-md transition-colors ${tab === t.id ? "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] border-b-2 border-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === "geral" && (
            <>
              <Field label="Hunt">
                <div onClick={() => setSelectorTarget({ type: "geral" })} className="flex items-center gap-2 w-48 px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <img src={getSpriteUrl(cfg.hunt, dexMap)} alt={cfg.hunt} className="w-6 h-6 object-contain" onError={(e) => { const dex = dexMap[cfg.hunt.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
                  <div className="flex-1 text-[12px] text-[rgb(var(--text-primary))] capitalize truncate">{cfg.hunt}</div>
                  <ChevronRight size={12} className="text-[rgb(var(--text-faint))]" />
                </div>
              </Field>
              <Field label="Proxy (opcional)"><input value={cfg.proxy || ""} onChange={(e) => update("proxy", e.target.value || undefined)} placeholder="socks5://user:pass@host:port" className={inputCls} /></Field>
              <Field label="Vender Loot a cada"><div className="flex items-center gap-2"><Toggle checked={cfg.auto_sell_loot ?? true} onChange={(v) => update("auto_sell_loot", v)} /><input type="number" value={cfg.sell_loot_every_kills} onChange={(e) => update("sell_loot_every_kills", Number(e.target.value))} className={`${inputCls} w-20`} disabled={!cfg.auto_sell_loot} /><span className="text-[12px] text-[rgb(var(--text-muted))]">kills</span></div></Field>
              <Field label="Comprar bolas min gold"><input type="number" value={cfg.buy_balls_min_gold} onChange={(e) => update("buy_balls_min_gold", Number(e.target.value))} className={`${inputCls} w-24`} /></Field>
            </>
          )}
          {tab === "bolas" && (
            <>
              <Field label="Bola para captura">
                <div onClick={() => setSelectorTarget({ type: "ball", field: "catch_ball_id" })} className="flex items-center gap-2 w-40 px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <img src={getBallIcon(sc.catch_ball_id)} alt="Ball" className="w-5 h-5 object-contain" />
                  <div className="flex-1 text-[12px] text-[rgb(var(--text-primary))] truncate">{BALL_IDS[sc.catch_ball_id]}</div>
                  <ChevronRight size={12} className="text-[rgb(var(--text-faint))]" />
                </div>
              </Field>
              <Field label="Bola para Shiny">
                <div onClick={() => setSelectorTarget({ type: "ball", field: "shiny_ball_id" })} className="flex items-center gap-2 w-40 px-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <img src={getBallIcon(sc.shiny_ball_id)} alt="Ball" className="w-5 h-5 object-contain" />
                  <div className="flex-1 text-[12px] text-[rgb(var(--text-primary))] truncate">{BALL_IDS[sc.shiny_ball_id]}</div>
                  <ChevronRight size={12} className="text-[rgb(var(--text-faint))]" />
                </div>
              </Field>
              <Field label="Auto-melhor bola Shiny"><Toggle checked={sc.best_shiny_ball} onChange={(v) => updateSc("best_shiny_ball", v)} /></Field>
              <Field label="Auto-melhor bola Comum">
                <div className="flex items-center gap-2">
                  <Toggle checked={sc.best_cball} onChange={(v) => updateSc("best_cball", v)} />
                  <div onClick={() => sc.best_cball && setSelectorTarget({ type: "ball", field: "max_cball_id" })} className={`flex items-center gap-2 w-40 px-2 py-1.5 rounded-md border transition-colors ${sc.best_cball ? "bg-[rgb(var(--bg-surface))] border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))]" : "bg-transparent border-transparent opacity-50 cursor-not-allowed"}`}>
                    <img src={getBallIcon(sc.max_cball_id)} alt="Ball" className="w-5 h-5 object-contain" />
                    <div className="flex-1 text-[12px] text-[rgb(var(--text-primary))] truncate">{BALL_IDS[sc.max_cball_id]}</div>
                    {sc.best_cball && <ChevronRight size={12} className="text-[rgb(var(--text-faint))]" />}
                  </div>
                </div>
              </Field>
              <Field label="Usar outras bolas se faltar (Fallback)"><Toggle checked={sc.fallback_other_balls !== false} onChange={(v) => updateSc("fallback_other_balls", v)} /></Field>
            </>
          )}
          {tab === "venda" && (
            <>
              <Field label="Score min para manter"><input type="number" value={sc.min_score_keep} onChange={(e) => updateSc("min_score_keep", Number(e.target.value))} className={`${inputCls} w-20`} /></Field>
              <Field label="IV min ATK"><input type="number" value={sc.min_iv_atk} min={0} max={31} onChange={(e) => updateSc("min_iv_atk", Number(e.target.value))} className={`${inputCls} w-20`} /></Field>
              <Field label="IV min Speed"><input type="number" value={sc.min_iv_speed} min={0} max={31} onChange={(e) => updateSc("min_iv_speed", Number(e.target.value))} className={`${inputCls} w-20`} /></Field>
              <Field label="Raridade min para manter"><select value={sc.keep_min_rarity} onChange={(e) => updateSc("keep_min_rarity", e.target.value)} className={inputCls}>{RARITIES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select></Field>
              <Field label="Manter Shiny"><Toggle checked={sc.keep_shiny} onChange={(v) => updateSc("keep_shiny", v)} /></Field>
              <Field label="Vender Pokemon"><div className="flex items-center gap-2"><Toggle checked={sc.sell_pokemon} onChange={(v) => updateSc("sell_pokemon", v)} /><span className="text-[12px] text-[rgb(var(--text-muted))]">a cada</span><input type="number" value={sc.sell_pokemon_every_catches} onChange={(e) => updateSc("sell_pokemon_every_catches", Number(e.target.value))} className={`${inputCls} w-16`} disabled={!sc.sell_pokemon} /><span className="text-[12px] text-[rgb(var(--text-muted))]">capturas</span></div></Field>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-2">Categorias para vender</label>
                <div className="flex gap-3">{SELL_CATS.map((cat) => (
                  <label key={cat} className="flex items-center gap-1.5 text-[12px] text-[rgb(var(--text-secondary))] cursor-pointer">
                    <input type="checkbox" checked={sc.sell_categories.includes(cat)} onChange={(e) => updateSc("sell_categories", e.target.checked ? [...sc.sell_categories, cat] : sc.sell_categories.filter((c) => c !== cat))} className="accent-[rgb(var(--accent))]" />{cat}
                  </label>
                ))}</div>
              </div>
            </>
          )}
          {tab === "sniper" && (
            <>
              <div className="bg-[rgb(var(--accent))]/10 border border-[rgb(var(--accent))]/30 rounded-lg p-3 text-[11px] text-[rgb(var(--accent))]">
                🎯 <strong>Filtro Sniper de Caça:</strong> O bot analisa as criaturas no mapa durante a hunt e só joga Pokébola se o mob atingir a raridade ou IV mínimo especificado!
              </div>
              <Field label="Ativar Filtro Sniper"><Toggle checked={sc.sniper_enabled ?? false} onChange={(v) => updateSc("sniper_enabled", v)} /></Field>
              <Field label="Capturar Somente Shinies"><Toggle checked={sc.sniper_only_shiny ?? false} onChange={(v) => updateSc("sniper_only_shiny", v)} /></Field>
              <Field label="Raridade Mínima do Alvo">
                <select value={sc.sniper_min_rarity || "uncommon"} onChange={(e) => updateSc("sniper_min_rarity", e.target.value)} className={inputCls}>
                  <option value="weak">Fraca (Qualquer)</option>
                  <option value="common">Comum</option>
                  <option value="uncommon">Incomum</option>
                  <option value="rare">Rara</option>
                  <option value="epic">Épica</option>
                  <option value="legendary">Lendária</option>
                </select>
              </Field>
              <Field label="IV Total Mínimo (0 - 100)">
                <input type="number" min={0} max={100} value={sc.sniper_min_iv || 0} onChange={(e) => updateSc("sniper_min_iv", Number(e.target.value))} className={`${inputCls} w-24`} />
              </Field>
            </>
          )}
          {tab === "auto" && (
            <>
              <Field label="Captura Automatica"><Toggle checked={sc.auto_catch} onChange={(v) => updateSc("auto_catch", v)} /></Field>
              <Field label="Auto-Potion">
                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-2">
                    <Toggle checked={cfg.auto_potion} onChange={(v) => update("auto_potion", v)} />
                    <span className="text-[12px] text-[rgb(var(--text-muted))]">HP &le;</span>
                    <input type="number" value={cfg.auto_potion_pct} min={1} max={99} onChange={(e) => update("auto_potion_pct", Number(e.target.value))} className={`${inputCls} w-16`} disabled={!cfg.auto_potion} />
                    <span className="text-[12px] text-[rgb(var(--text-muted))]">%</span>
                  </div>
                  <select 
                    value={cfg.auto_potion_item_id || "potion_great"} 
                    onChange={(e) => update("auto_potion_item_id", e.target.value)}
                    className={inputCls}
                    disabled={!cfg.auto_potion}
                  >
                    <option value="potion_small">Small Potion</option>
                    <option value="potion_great">Great Potion</option>
                    <option value="potion_super">Super Potion</option>
                    <option value="potion_ultra">Ultra Potion</option>
                    <option value="potion_hyper">Hyper Potion</option>
                    <option value="potion_ultimate">Ultimate Potion</option>
                  </select>
                </div>
              </Field>
              <Field label="Auto-Revive">
                <div className="flex flex-col gap-2 w-full">
                  <Toggle checked={cfg.auto_revive} onChange={(v) => update("auto_revive", v)} />
                  <select 
                    value={cfg.auto_revive_item_id || "revive_basic"} 
                    onChange={(e) => update("auto_revive_item_id", e.target.value)}
                    className={inputCls}
                    disabled={!cfg.auto_revive}
                  >
                    <option value="revive_minor">Minor Revive</option>
                    <option value="revive_basic">Revive</option>
                    <option value="revive_max">Max Revive</option>
                  </select>
                </div>
              </Field>
              <Field label="Auto-Resgatar BattlePass"><Toggle checked={cfg.auto_claim_battlepass} onChange={(v) => update("auto_claim_battlepass", v)} /></Field>
              <Field label="Auto-Evoluir (Com Pedras)"><Toggle checked={cfg.auto_evolve ?? true} onChange={(v) => update("auto_evolve", v)} /></Field>
              
              <Field label="Radar de Shinies"><Toggle checked={cfg.hunt_shiny_enabled !== false} onChange={(v) => update("hunt_shiny_enabled", v)} /></Field>
              <div className="flex flex-col gap-1">
                 <span className="text-xs text-[rgb(var(--text-faint))]">Qualidade Mínima para Combate (Radar)</span>
                 <select 
                   value={cfg.hunt_min_quality || 'weak'} 
                   onChange={(e) => update("hunt_min_quality", e.target.value)}
                   className="w-full p-2 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded border border-[rgb(var(--border))] outline-none focus:border-[rgb(var(--accent))]"
                 >
                   <option value="weak">Ignorar Qualidade (Ataca Todos)</option>
                   <option value="common">Common (No mínimo)</option>
                   <option value="uncommon">Uncommon (No mínimo)</option>
                   <option value="rare">Rare (No mínimo)</option>
                   <option value="epic">Epic (No mínimo)</option>
                   <option value="legendary">Legendary (No mínimo)</option>
                 </select>
              </div>
              <Field label="Auto-Escolher Melhor Zona">
                <div className="flex flex-col gap-1">
                  <Toggle checked={cfg.auto_choose_zone ?? false} onChange={(v) => update("auto_choose_zone", v)} />
                  <span className="text-[10px] text-[rgb(var(--text-faint))]">
                    Escaneia zonas e escolhe automaticamente a com mais Rare+/Epico/Lendario.
                    Se desligado, so avisa se a zona nao tem nada valioso.
                  </span>
                </div>
              </Field>
              <div className="flex flex-col gap-1">
                 <span className="text-xs text-[rgb(var(--text-faint))]">IV Total Mínimo (Soma)</span>
                 <input 
                   type="number" 
                   value={cfg.hunt_min_iv || 0} 
                   onChange={(e) => update("hunt_min_iv", parseInt(e.target.value) || 0)}
                   className="w-full p-2 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded border border-[rgb(var(--border))] outline-none focus:border-[rgb(var(--accent))]"
                 />
              </div>

              <Field label="Auto-Soneca (Farm Offline Extra)"><Toggle checked={cfg.auto_sleep ?? true} onChange={(v) => update("auto_sleep", v)} /></Field>
              
              {/* Auto-Buy Section */}
              <div className="border border-[rgb(var(--border))] rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[rgb(var(--text-primary))]">Auto-Comprar Itens</span>
                  <Toggle checked={cfg.auto_buy?.enabled ?? false} onChange={(v) => update("auto_buy", { ...(cfg.auto_buy || { enabled: false, min_gold: 1000, balls: [], potions: [], revives: [] }), enabled: v })} />
                </div>
                {cfg.auto_buy?.enabled && (
                  <>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[rgb(var(--text-muted))]">Ouro minimo:</span>
                      <input type="number" value={cfg.auto_buy?.min_gold || 1000} onChange={(e) => update("auto_buy", { ...(cfg.auto_buy!), min_gold: Number(e.target.value) })} className={`${inputCls} w-20`} />
                      <span className="text-[rgb(var(--text-muted))]">g</span>
                    </div>
                    {/* Balls */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[rgb(var(--text-secondary))]">Pokebolas</span>
                      {(cfg.auto_buy?.balls || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <Toggle checked={item.enabled} onChange={(v) => { const ab = { ...(cfg.auto_buy!) }; ab.balls = [...ab.balls]; ab.balls[i] = { ...ab.balls[i], enabled: v }; update("auto_buy", ab); }} />
                          <span className="text-[rgb(var(--text-primary))] w-24 truncate">{item.item_id.replace("capsule_", "")}</span>
                          <span className="text-[rgb(var(--text-muted))]">min:</span>
                          <input type="number" value={item.min_qty} onChange={(e) => { const ab = { ...(cfg.auto_buy!) }; ab.balls = [...ab.balls]; ab.balls[i] = { ...ab.balls[i], min_qty: Number(e.target.value) }; update("auto_buy", ab); }} className={`${inputCls} w-14`} />
                          <span className="text-[rgb(var(--text-muted))]">max:</span>
                          <input type="number" value={item.max_qty} onChange={(e) => { const ab = { ...(cfg.auto_buy!) }; ab.balls = [...ab.balls]; ab.balls[i] = { ...ab.balls[i], max_qty: Number(e.target.value) }; update("auto_buy", ab); }} className={`${inputCls} w-14`} />
                          <button onClick={() => { const ab = { ...(cfg.auto_buy!) }; ab.balls = ab.balls.filter((_, j) => j !== i); update("auto_buy", ab); }} className="text-red-400 hover:text-red-300 ml-auto"><X size={10} /></button>
                        </div>
                      ))}
                      <select onChange={(e) => { if (!e.target.value) return; const ab = { ...(cfg.auto_buy || { enabled: true, min_gold: 1000, balls: [], potions: [], revives: [] }) }; ab.balls = [...(ab.balls || []), { item_id: e.target.value, enabled: true, min_qty: 50, max_qty: 200 }]; update("auto_buy", ab); e.target.value = ""; }} className="text-[10px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] rounded px-2 py-0.5">
                        <option value="">+ Adicionar bola</option>
                        <option value="capsule_basic">Basic Ball</option>
                        <option value="capsule_great">Great Ball</option>
                        <option value="capsule_super">Super Ball</option>
                        <option value="capsule_ultra">Ultra Ball</option>
                      </select>
                    </div>
                    {/* Potions */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[rgb(var(--text-secondary))]">Potions</span>
                      {(cfg.auto_buy?.potions || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <Toggle checked={item.enabled} onChange={(v) => { const ab = { ...(cfg.auto_buy!) }; ab.potions = [...ab.potions]; ab.potions[i] = { ...ab.potions[i], enabled: v }; update("auto_buy", ab); }} />
                          <span className="text-[rgb(var(--text-primary))] w-24 truncate">{item.item_id.replace("potion_", "")}</span>
                          <span className="text-[rgb(var(--text-muted))]">min:</span>
                          <input type="number" value={item.min_qty} onChange={(e) => { const ab = { ...(cfg.auto_buy!) }; ab.potions = [...ab.potions]; ab.potions[i] = { ...ab.potions[i], min_qty: Number(e.target.value) }; update("auto_buy", ab); }} className={`${inputCls} w-14`} />
                          <span className="text-[rgb(var(--text-muted))]">max:</span>
                          <input type="number" value={item.max_qty} onChange={(e) => { const ab = { ...(cfg.auto_buy!) }; ab.potions = [...ab.potions]; ab.potions[i] = { ...ab.potions[i], max_qty: Number(e.target.value) }; update("auto_buy", ab); }} className={`${inputCls} w-14`} />
                          <button onClick={() => { const ab = { ...(cfg.auto_buy!) }; ab.potions = ab.potions.filter((_, j) => j !== i); update("auto_buy", ab); }} className="text-red-400 hover:text-red-300 ml-auto"><X size={10} /></button>
                        </div>
                      ))}
                      <select onChange={(e) => { if (!e.target.value) return; const ab = { ...(cfg.auto_buy || { enabled: true, min_gold: 1000, balls: [], potions: [], revives: [] }) }; ab.potions = [...(ab.potions || []), { item_id: e.target.value, enabled: true, min_qty: 20, max_qty: 100 }]; update("auto_buy", ab); e.target.value = ""; }} className="text-[10px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] rounded px-2 py-0.5">
                        <option value="">+ Adicionar pocao</option>
                        <option value="potion_basic">Potion Basic</option>
                        <option value="potion_great">Potion Great</option>
                        <option value="potion_ultra">Potion Ultra</option>
                      </select>
                    </div>
                    {/* Revives */}
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-[rgb(var(--text-secondary))]">Revives</span>
                      {(cfg.auto_buy?.revives || []).map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px]">
                          <Toggle checked={item.enabled} onChange={(v) => { const ab = { ...(cfg.auto_buy!) }; ab.revives = [...ab.revives]; ab.revives[i] = { ...ab.revives[i], enabled: v }; update("auto_buy", ab); }} />
                          <span className="text-[rgb(var(--text-primary))] w-24 truncate">{item.item_id.replace("revive_", "")}</span>
                          <span className="text-[rgb(var(--text-muted))]">min:</span>
                          <input type="number" value={item.min_qty} onChange={(e) => { const ab = { ...(cfg.auto_buy!) }; ab.revives = [...ab.revives]; ab.revives[i] = { ...ab.revives[i], min_qty: Number(e.target.value) }; update("auto_buy", ab); }} className={`${inputCls} w-14`} />
                          <span className="text-[rgb(var(--text-muted))]">max:</span>
                          <input type="number" value={item.max_qty} onChange={(e) => { const ab = { ...(cfg.auto_buy!) }; ab.revives = [...ab.revives]; ab.revives[i] = { ...ab.revives[i], max_qty: Number(e.target.value) }; update("auto_buy", ab); }} className={`${inputCls} w-14`} />
                          <button onClick={() => { const ab = { ...(cfg.auto_buy!) }; ab.revives = ab.revives.filter((_, j) => j !== i); update("auto_buy", ab); }} className="text-red-400 hover:text-red-300 ml-auto"><X size={10} /></button>
                        </div>
                      ))}
                      <select onChange={(e) => { if (!e.target.value) return; const ab = { ...(cfg.auto_buy || { enabled: true, min_gold: 1000, balls: [], potions: [], revives: [] }) }; ab.revives = [...(ab.revives || []), { item_id: e.target.value, enabled: true, min_qty: 5, max_qty: 20 }]; update("auto_buy", ab); e.target.value = ""; }} className="text-[10px] bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] rounded px-2 py-0.5">
                        <option value="">+ Adicionar revive</option>
                        <option value="revive_basic">Revive Basic</option>
                        <option value="revive_ultra">Revive Ultra</option>
                      </select>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
          {tab === "rotas" && (
            <>
              <Field label="Sistema de Rotas"><Toggle checked={cfg.route_enabled} onChange={(v) => update("route_enabled", v)} /></Field>
              <Field label="Obedecer sempre a rota montada"><Toggle checked={cfg.route_obey_always ?? true} onChange={(v) => update("route_obey_always", v)} /></Field>
              <Field label="Continuar upando (infinito)"><Toggle checked={cfg.route_continue_infinite} onChange={(v) => update("route_continue_infinite", v)} /></Field>
              {cfg.route_enabled && (
                <div className="border border-[rgb(var(--border))] rounded-lg p-3 space-y-2">
                  <div className="text-[12px] font-medium text-[rgb(var(--text-primary))]">Regras de Rota</div>
                  {cfg.route_rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px]">
                      <input type="number" value={rule.min_lv} onChange={(e) => { const rules = [...cfg.route_rules]; rules[i] = { ...rules[i], min_lv: Number(e.target.value) }; update("route_rules", rules); }} className={`${inputCls} w-16`} placeholder="Min" />
                      <span className="text-[rgb(var(--text-muted))]">-</span>
                      <input type="number" value={rule.max_lv} onChange={(e) => { const rules = [...cfg.route_rules]; rules[i] = { ...rules[i], max_lv: Number(e.target.value) }; update("route_rules", rules); }} className={`${inputCls} w-16`} placeholder="Max" />
                      <div onClick={() => setSelectorTarget({ type: "rota", index: i })} className="flex-1 relative flex items-center px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors h-[26px]">
                        {rule.hunt && (
                          <img src={getSpriteUrl(rule.hunt, dexMap)} alt={rule.hunt} className="w-5 h-5 object-contain mr-2"
                            onError={(e) => { const dex = dexMap[rule.hunt.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
                        )}
                        <span className="text-[12px] text-[rgb(var(--text-primary))] capitalize truncate flex-1">{rule.hunt || "Selecionar..."}</span>
                      </div>
                      <button onClick={() => update("route_rules", cfg.route_rules.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><X size={12} /></button>
                    </div>
                  ))}
                  <button onClick={() => update("route_rules", [...cfg.route_rules, { min_lv: 1, max_lv: 50, hunt: "pidgey" }])} className="text-[12px] text-[rgb(var(--accent))] hover:brightness-110">+ Adicionar Regra</button>
                </div>
              )}
              
              {/* Mounted Routes */}
              <div className="border border-[rgb(var(--border))] rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[rgb(var(--text-primary))]">Hunts Montadas (por Pokemon Lider)</span>
                </div>
                <p className="text-[10px] text-[rgb(var(--text-faint))]">
                  Configure hunt automatica baseada no Pokemon que esta como lider da equipe.
                </p>
                {Object.entries(mountedRoutes).map(([id, route]) => (
                  <div key={id} className="flex items-center gap-2 text-[11px] bg-[rgb(var(--bg-base))] p-2 rounded border border-[rgb(var(--border))]">
                    {route.pokemon && (
                      <img src={getSpriteUrl(route.pokemon, dexMap)} alt={route.pokemon} className="w-5 h-5 object-contain"
                        onError={(e) => { const dex = dexMap[route.pokemon?.toLowerCase()] || 0; (e.target as HTMLImageElement).src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`; }} />
                    )}
                    <span className="text-[rgb(var(--text-primary))] capitalize font-medium">{route.pokemon || id}</span>
                    <span className="text-[rgb(var(--text-muted))]">→</span>
                    <span className="text-[rgb(var(--text-secondary))]">{route.rules?.length || 0} regras</span>
                    <div className="flex-1" />
                    <button onClick={async () => { const updated = { ...mountedRoutes }; delete updated[id]; setMountedRoutes(updated); await invoke("mounted-routes:save", updated); }} className="text-red-400 hover:text-red-300"><X size={11} /></button>
                  </div>
                ))}
                <button onClick={async () => {
                  const newId = `route_${Date.now()}`;
                  const newRoute = { name: "Nova Rota", pokemon: "", rules: [{ min_lv: 1, max_lv: 50, hunt: "pidgey" }] };
                  const updated = { ...mountedRoutes, [newId]: newRoute };
                  setMountedRoutes(updated);
                  await invoke("mounted-routes:save", updated);
                }} className="text-[12px] text-[rgb(var(--accent))] hover:brightness-110">+ Criar Rota Montada</button>
              </div>
            </>
          )}
        </div>
        <div className="flex gap-3 justify-end px-5 py-3 border-t border-[rgb(var(--border))]">
          <button onClick={onClose} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-1.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 transition-all">Salvar</button>
        </div>
      </div>
      {selectorTarget && selectorTarget.type !== "ball" && (
        <HuntSelector
          hunts={huntsData}
          currentHunt={selectorTarget.type === "geral" ? cfg.hunt : cfg.route_rules[selectorTarget.index].hunt}
          onSelect={(s) => {
            if (selectorTarget.type === "geral") update("hunt", s);
            else {
              const rules = [...cfg.route_rules];
              rules[selectorTarget.index] = { ...rules[selectorTarget.index], hunt: s };
              update("route_rules", rules);
            }
          }}
          onClose={() => setSelectorTarget(null)}
        />
      )}
      {selectorTarget && selectorTarget.type === "ball" && (
        <BallSelector 
          currentId={(sc as any)[selectorTarget.field]}
          field={selectorTarget.field}
          onSelect={(id) => updateSc(selectorTarget.field as any, id)}
          onClose={() => setSelectorTarget(null)}
        />
      )}
    </div>
  );
}

function BallSelector({ currentId, field, onSelect, onClose }: { currentId: number; field: string; onSelect: (id: number) => void; onClose: () => void }) {
  const options = Object.entries(BALL_IDS).map(([id, name]) => ({ id: Number(id), name }));
  const filtered = field === "max_cball_id" ? options.filter(o => [2, 3, 4].includes(o.id)) : field === "catch_ball_id" ? options.filter(o => o.id !== 5) : options;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[320px] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgb(var(--border))]">
          <span className="text-[13px] font-semibold text-[rgb(var(--text-primary))]">Selecionar Bola</span>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"><X size={14} /></button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {filtered.map(o => (
            <button key={o.id} onClick={() => { onSelect(o.id); onClose(); }} className={`flex flex-col items-center p-3 rounded-lg border transition-all ${currentId === o.id ? "bg-[rgb(var(--accent))]/10 border-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-surface))] border-[rgb(var(--border))] hover:border-[rgb(var(--text-faint))]"}`}>
              <img src={getBallIcon(o.id)} alt={o.name} className="w-8 h-8 object-contain mb-2" />
              <span className="text-[11px] font-medium text-[rgb(var(--text-primary))]">{o.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><label className="text-[12px] text-[rgb(var(--text-muted))] shrink-0">{label}</label><div className="flex items-center">{children}</div></div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className={`relative w-9 h-5 rounded-full transition-colors ${checked ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-elevated))]"}`}>
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : ""}`} />
    </button>
  );
}

const inputCls = "px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors";
