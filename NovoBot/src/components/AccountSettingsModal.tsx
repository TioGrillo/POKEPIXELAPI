import React, { useState, useMemo } from 'react';
import { X, Heart, Shield, DollarSign, Save, Sliders, Crosshair, Sparkles, Filter, MapPin, CheckCircle2, Plus, Compass } from 'lucide-react';
import type { Account, Zone } from '../types';
import { DEFAULT_ZONES } from '../lib/defaultZones';
import { HuntSelectorDialog } from './HuntSelectorDialog';

interface AccountSettingsModalProps {
  account: Account;
  zones?: Zone[];
  onSave: (updatedAccount: Account) => void;
  onClose: () => void;
}

export function AccountSettingsModal({ account, zones, onSave, onClose }: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'health' | 'capture' | 'sell'>('health');

  const allZones = useMemo(() => (zones && zones.length > 0) ? zones : DEFAULT_ZONES, [zones]);
  const [mapId, setMapId] = useState<string>(account.mapId || allZones[0]?.id || '');
  const [showMapSelectorModal, setShowMapSelectorModal] = useState(false);

  // State: Cura & Batalha
  const [autoHealEnabled, setAutoHealEnabled] = useState(account.autoHealEnabled ?? true);
  const [autoPotionThreshold, setAutoPotionThreshold] = useState(account.autoPotionThreshold ?? 50);
  const [autoNurseJoyEnabled, setAutoNurseJoyEnabled] = useState(account.autoNurseJoyEnabled ?? true);
  const [turboInstances, setTurboInstances] = useState(account.turboInstances ?? 3);
  const [proxy, setProxy] = useState(account.proxy || '');

  // State: Captura
  const [captureConfig, setCaptureConfig] = useState(account.captureConfig || {
    shiny: true,
    common: false,
    rare: false,
    epic: true,
    legendary: true,
    mythic: true,
  });

  // State: Auto-Venda (Loot & Pokémons)
  const [autoSellLootKills, setAutoSellLootKills] = useState(account.autoSellLootKills ?? 0);
  const [autoSellPokemonConfig, setAutoSellPokemonConfig] = useState(account.autoSellPokemonConfig || {
    enabled: false,
    common: true,
    rare: false,
    epic: false,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: Account = {
      ...account,
      mapId,
      autoHealEnabled,
      autoPotionThreshold,
      autoNurseJoyEnabled,
      turboInstances,
      captureConfig,
      autoSellLootKills,
      autoSellPokemonConfig,
      proxy,
    };
    onSave(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-xs">
      <div className="bg-[rgb(var(--bg-base))] rounded-2xl border border-[rgb(var(--border))] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Cabeçalho */}
        <div className="p-5 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders size={20} className="text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white">Configurações de {account.name || 'Conta'}</h2>
              <span className="text-xs text-[rgb(var(--text-muted))]">{account.email}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-white transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-deep))] px-6 pt-3 gap-3">
          <button
            onClick={() => setActiveTab('health')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'health'
                ? 'border-red-500 text-red-400'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'
            }`}
          >
            <Heart size={15} />
            Batalha & Cura
          </button>
          <button
            onClick={() => setActiveTab('capture')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'capture'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'
            }`}
          >
            <Crosshair size={15} />
            Regras de Captura
          </button>
          <button
            onClick={() => setActiveTab('sell')}
            className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sell'
                ? 'border-green-500 text-green-400'
                : 'border-transparent text-[rgb(var(--text-muted))] hover:text-white'
            }`}
          >
            <DollarSign size={15} />
            Auto-Venda & Limpeza
          </button>
        </div>

        {/* Conteúdo */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {activeTab === 'health' && (
            <div className="space-y-4">
              {/* Card Visual do Mapa Selecionado da Conta */}
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-2 mb-2">
                  <MapPin size={16} className="text-cyan-400" />
                  Mapa da Hunt
                </span>

                <div className="flex items-center justify-between bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-xl p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-lg shadow-sm">
                      🗺️
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        {allZones.find(z => z.id === mapId)?.name || 'Selecione um Mapa'}
                      </span>
                      <span className="text-[10px] text-[rgb(var(--text-muted))] capitalize">
                        {allZones.find(z => z.id === mapId)?.world ? allZones.find(z => z.id === mapId)?.world?.toUpperCase() : 'KANTO'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMapSelectorModal(true)}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    <Compass size={14} />
                    Selecionar Mapa
                  </button>
                </div>
              </div>

              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Heart size={16} className="text-red-400" />
                    Cura Automática por Poções
                  </span>
                  <input
                    type="checkbox"
                    checked={autoHealEnabled}
                    onChange={(e) => setAutoHealEnabled(e.target.checked)}
                    className="accent-red-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                {autoHealEnabled && (
                  <div className="pt-2 border-t border-[rgb(var(--border))]/50 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-[rgb(var(--text-muted))]">Usar poção quando HP cair abaixo de:</span>
                      <span className="font-bold text-red-400 font-mono">{autoPotionThreshold}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      step={5}
                      value={autoPotionThreshold}
                      onChange={(e) => setAutoPotionThreshold(parseInt(e.target.value))}
                      className="w-full accent-red-500 cursor-pointer"
                    />
                  </div>
                )}
              </div>

              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Sparkles size={16} className="text-amber-400" />
                      Instâncias Simultâneas por Mapa (Turbo)
                    </span>
                    <span className="text-[10px] text-[rgb(var(--text-muted))] block mt-0.5">
                      Número de combates em paralelo simultâneos no mapa (limite de 1 a 25 alvos).
                    </span>
                  </div>
                  <span className="text-sm font-bold text-amber-400 font-mono bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {turboInstances}x
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={25}
                  step={1}
                  value={turboInstances}
                  onChange={(e) => setTurboInstances(parseInt(e.target.value) || 1)}
                  className="w-full accent-amber-500 cursor-pointer pt-1"
                />
              </div>

              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      <Shield size={16} className="text-blue-400" />
                      Voltar para Nurse Joy (Curar Time)
                    </span>
                    <span className="text-[10px] text-[rgb(var(--text-muted))] block">
                      Caso o time desmaie ou acabem as poções, o bot vai à Nurse Joy, cura 100% e retorna à hunt.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={autoNurseJoyEnabled}
                    onChange={(e) => setAutoNurseJoyEnabled(e.target.checked)}
                    className="accent-blue-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-2">
                <div className="space-y-0.5 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Shield size={16} className="text-indigo-400" />
                    Proxy Específico (Opcional)
                  </span>
                  <span className="text-[10px] text-[rgb(var(--text-muted))] block">
                    Use um Proxy exclusivo apenas para esta conta (ignora o proxy global). Formato: socks5://user:pass@host:port ou http://user:pass@host:port
                  </span>
                </div>
                <input
                  type="text"
                  value={proxy}
                  onChange={(e) => setProxy(e.target.value)}
                  placeholder="Ex: http://user:pass@127.0.0.1:8080"
                  className="w-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono transition-colors"
                />
              </div>
            </div>
          )}

          {activeTab === 'capture' && (
            <div className="space-y-4">
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-white block uppercase tracking-wider mb-2">
                  Tentar Capturar Pokémons por Raridade:
                </span>

                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { key: 'shiny', label: 'Shiny', color: 'text-amber-400', badge: 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]' },
                    { key: 'common', label: 'Comum', color: 'text-gray-300', badge: 'bg-gray-400' },
                    { key: 'rare', label: 'Raro', color: 'text-blue-400', badge: 'bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]' },
                    { key: 'epic', label: 'Épico', color: 'text-purple-400', badge: 'bg-purple-400 shadow-[0_0_6px_rgba(192,132,252,0.5)]' },
                    { key: 'legendary', label: 'Lendário', color: 'text-yellow-400', badge: 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.5)]' },
                    { key: 'mythic', label: 'Mítico', color: 'text-red-400', badge: 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]' },
                  ].map(({ key, label, color, badge }) => (
                    <label key={key} className="flex items-center gap-2.5 cursor-pointer bg-[rgb(var(--bg-deep))] p-2.5 rounded-lg border border-[rgb(var(--border))]">
                      <input
                        type="checkbox"
                        checked={!!(captureConfig as any)[key]}
                        onChange={(e) => setCaptureConfig({ ...captureConfig, [key]: e.target.checked })}
                        className="accent-amber-500 w-4 h-4 rounded cursor-pointer"
                      />
                      <span className={`w-2 h-2 rounded-full ${badge}`} />
                      <span className={`text-xs font-bold ${color}`}>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Crosshair size={16} className="text-amber-400" />
                  Pokébola Utilizada nas Capturas
                </span>
                <span className="text-[10px] text-[rgb(var(--text-muted))] block mb-2">
                  Selecione "Automático (Melhor Disponível)" para usar sempre a pokébola com maior taxa de captura no seu inventário e alternar quando acabar, não parando a captura.
                </span>
                <select
                  value={captureConfig.ball || 'auto'}
                  onChange={(e) => setCaptureConfig({ ...captureConfig, ball: e.target.value })}
                  className="w-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="auto">Automático (Melhor Disponível)</option>
                  <option value="capsule_basic">Pixel Ball (Comum)</option>
                  <option value="capsule_great">Great Ball (Incomum)</option>
                  <option value="capsule_ultra">Ultra Ball (Rara)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'sell' && (
            <div className="space-y-4">
              {/* Auto-Venda de Loot */}
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-2">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <DollarSign size={16} className="text-green-400" />
                  Auto-Vender Loot no NPC
                </span>
                <span className="text-[10px] text-[rgb(var(--text-muted))] block">
                  Vende automaticamente os itens acumulados no inventário a cada X monstrengos derrotados. (0 = Desativado)
                </span>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={autoSellLootKills}
                    onChange={(e) => setAutoSellLootKills(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-28 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-green-500 font-mono"
                  />
                  <span className="text-xs text-[rgb(var(--text-muted))]">Kills</span>
                </div>
              </div>

              {/* Auto-Venda / Liberação de Pokémons */}
              <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles size={16} className="text-purple-400" />
                    Auto-Vender Pokémons Capturados
                  </span>
                  <input
                    type="checkbox"
                    checked={autoSellPokemonConfig.enabled}
                    onChange={(e) => setAutoSellPokemonConfig({ ...autoSellPokemonConfig, enabled: e.target.checked })}
                    className="accent-purple-500 w-4 h-4 rounded cursor-pointer"
                  />
                </label>

                {autoSellPokemonConfig.enabled && (
                  <div className="pt-2 border-t border-[rgb(var(--border))]/50 space-y-2">
                    <span className="text-[10px] text-[rgb(var(--text-muted))] block">
                      Vender automaticamente pokémons recém-capturados das raridades marcadas:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'common', label: 'Comum', badge: 'bg-gray-400' },
                        { key: 'rare', label: 'Raro', badge: 'bg-blue-400' },
                        { key: 'epic', label: 'Épico', badge: 'bg-purple-400' },
                      ].map(({ key, label, badge }) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer bg-[rgb(var(--bg-deep))] p-2 rounded-lg border border-[rgb(var(--border))] text-xs text-white">
                          <input
                            type="checkbox"
                            checked={!!(autoSellPokemonConfig as any)[key]}
                            onChange={(e) => setAutoSellPokemonConfig({ ...autoSellPokemonConfig, [key]: e.target.checked })}
                            className="accent-purple-500 w-3.5 h-3.5 rounded cursor-pointer"
                          />
                          <span className={`w-2 h-2 rounded-full ${badge}`} />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}



          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg text-xs"
            >
              <Save size={16} />
              Salvar Configurações da Conta
            </button>
          </div>
        </form>

        {/* Modal de Escolha Visual do Mapa */}
        {showMapSelectorModal && (
          <HuntSelectorDialog
            zones={allZones}
            currentZoneId={mapId}
            onSelect={(zId) => {
              setMapId(zId);
              setShowMapSelectorModal(false);
            }}
            onClose={() => setShowMapSelectorModal(false)}
          />
        )}
      </div>
    </div>
  );
}
