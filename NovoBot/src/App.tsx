import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Gamepad2, BarChart3, ScrollText, SlidersHorizontal, Play, Square, Wifi, WifiOff, Settings, Map as MapIcon, Swords, Key, Users, Package, ShoppingCart, Radar, Cross, Globe, Trophy } from 'lucide-react';
import type { Account, Zone } from './types';
import { PokePixelEngine } from './lib/PokePixelEngine';
import { DEFAULT_ZONES } from './lib/defaultZones';
import Titlebar from './components/layout/Titlebar';
import Sidebar from './components/layout/Sidebar';
import { GlobalPanel } from './components/panels/GlobalPanel';
import LogPanel from './components/panels/LogPanel';
import { ControlPanel } from './components/panels/ControlPanel';
import { AddAccountModal } from './components/AddAccountModal';
import SettingsDialog from './components/SettingsDialog';
import { AccountSettingsModal } from './components/AccountSettingsModal';
import { HuntSelectorDialog } from './components/HuntSelectorDialog';
import { QuickSellPanel, ItemImage } from './components/panels/QuickSellPanel';
import { RoutePanel } from './components/panels/RoutePanel';
import { GlobalRoutePanel } from './components/panels/GlobalRoutePanel';
import { THEMES, applyTheme, applyCustomAccent } from './themes';
import { getLogColor } from './components/panels/MultiLogView';
import { HuntAnalyzerPanel } from './components/panels/HuntAnalyzerPanel';
import axios from 'axios';

type MainTab = 'conta' | 'global' | 'log' | 'control' | 'globalRoutes';

export function App() {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('pk_accounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [globalRoutes, setGlobalRoutes] = useState<any[]>(() => {
    const saved = localStorage.getItem('pk_global_routes');
    return saved ? JSON.parse(saved) : [];
  });
  const [mainTab, setMainTab] = useState<MainTab>('global');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [huntSelectorAccountId, setHuntSelectorAccountId] = useState<string | null>(null);
  const [settingsModalAccount, setSettingsModalAccount] = useState<Account | null>(null);

  const [accountTab, setAccountTab] = useState<'log' | 'team' | 'inventory' | 'sell' | 'routes' | 'radar' | 'pc'>('log');

  const [mapId, setMapId] = useState(localStorage.getItem('pk_zone') || '65183cd4-66f3-49a1-91a2-2c2eb9d614c7');
  const [captureConfig] = useState<Record<string, any>>(() => {
    const saved = localStorage.getItem('pk_capture_config');
    return saved ? JSON.parse(saved) : { shiny: true, common: false, rare: false, epic: true, legendary: true, mythic: true };
  });
  const [globalShinyMode] = useState<boolean>(false);
  const [autoPotionThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('pk_autopotion');
    return saved ? parseInt(saved, 10) : 50;
  });

  // Zonas: Inicializa com fallback estático para NUNCA ficar vazio, mesmo offline
  const [zones, setZones] = useState<Zone[]>(() => {
    try {
      const cached = localStorage.getItem('pk_cached_zones');
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_ZONES;
  });

  const [globalLogs, setGlobalLogs] = useState<string[]>([]);

  const engineRefs = useRef(new Map<string, PokePixelEngine>());
  const accountsRef = useRef<Account[]>(accounts);

  useEffect(() => {
    localStorage.setItem('pk_global_routes', JSON.stringify(globalRoutes));
    engineRefs.current.forEach(engine => {
       engine.setGlobalRoutes(globalRoutes);
    });
  }, [globalRoutes]);

  useEffect(() => {
    localStorage.setItem('pk_accounts', JSON.stringify(accounts));
    accountsRef.current = accounts;
  }, [accounts]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pk_settings');
      if (saved) {
        const s = JSON.parse(saved);
        if (s.theme) {
          const t = THEMES.find((t) => t.id === s.theme);
          if (t) applyTheme(t);
        }
        if (s.customAccent) applyCustomAccent(s.customAccent);
      }
    } catch {}
  }, []);

  // Atualiza zonas da API e salva em cache sempre que uma conta conectar
  useEffect(() => {
    const activeAcc = accounts.find((a) => a.token && (a.status === 'online' || a.status === 'hunting'));
    if (activeAcc && activeAcc.token) {
      axios
        .get('https://pokepixel.nietore.com/api/v1/zones', {
          headers: { Authorization: `Bearer ${activeAcc.token}` },
        })
        .then((res) => {
          if (res.data?.data) {
            const live = res.data.data.filter((z: any) => z.type === 'hunt' || z.id.includes('-'));
            if (live.length > 0) {
              setZones(live);
              localStorage.setItem('pk_cached_zones', JSON.stringify(live));
            }
          }
        })
        .catch(() => {});
    }
  }, [accounts]);

  const pushLog = useCallback((accountId: string, msg: string) => {
    const acc = accountsRef.current.find((a) => a.id === accountId);
    const timeStr = new Date().toLocaleTimeString();
    const prefix = `[${acc ? acc.name || acc.email : 'Unknown'}]`;
    const fullMsg = `${prefix} [${timeStr}] ${msg}`;

    setGlobalLogs((gLogs) => [fullMsg, ...gLogs].slice(0, 500));
  }, []);

  const updateAccountState = useCallback((accountId: string, updates: Partial<Account>) => {
    setAccounts((prev) => prev.map((acc) => {
      if (acc.id === accountId) {
        const newAcc = { ...acc, ...updates };
        
        // Sync critical settings to the engine immediately
        const engine = engineRefs.current.get(accountId);
        if (engine) {
          if ('routes' in updates || 'routesEnabled' in updates) {
            engine.updateConfig(newAcc, zones);
          }
        }
        
        return newAcc;
      }
      return acc;
    }));
  }, [zones]);

  const setAccountMap = useCallback(
    (accountId: string, zoneId: string) => {
      updateAccountState(accountId, { mapId: zoneId });
      const engine = engineRefs.current.get(accountId);
      if (engine) {
        engine.setZone(zoneId);
      }
      const zoneObj = zones.find((z) => z.id === zoneId);
      const zoneName = zoneObj ? zoneObj.name : zoneId;
      pushLog(accountId, `🗺️ Mapa da conta alterado para: ${zoneName}`);
    },
    [zones, updateAccountState, pushLog]
  );

  const handleAuthError = useCallback(
    (accountId: string) => {
      pushLog(accountId, 'Sessão expirada. Faça login novamente.');
      updateAccountState(accountId, { status: 'error' });
      const engine = engineRefs.current.get(accountId);
      if (engine) engine.stop();
    },
    [pushLog, updateAccountState]
  );

  const addAccount = useCallback((acc: Account) => {
    setAccounts((prev) => {
      const existsIndex = prev.findIndex((a) => a.id === acc.id);
      if (existsIndex >= 0) {
        const newArr = [...prev];
        newArr[existsIndex] = { ...newArr[existsIndex], token: acc.token, password: acc.password, status: 'idle' };
        return newArr;
      }
      return [...prev, acc];
    });
  }, []);

  // 1. Ficar Apenas Online (Carrega dados sem iniciar caça)
  const connectAccount = useCallback(
    async (accountId: string) => {
      const acc = accountsRef.current.find((a) => a.id === accountId);
      if (!acc || !acc.token) return;

      let engine = engineRefs.current.get(accountId);
      if (!engine) {
        const zList = zones.map((z) => z.id);
        engine = new PokePixelEngine(
          acc.email,
          acc.password || '',
          acc.token,
          acc.mapId || mapId,
          acc.captureConfig || captureConfig,
          (st) => updateAccountState(accountId, st),
          (msg) => pushLog(accountId, msg),
          () => handleAuthError(accountId),
          globalShinyMode,
          zList,
          acc.autoPotionThreshold ?? autoPotionThreshold,
          0,
          acc.autoHealEnabled ?? true,
          acc.autoNurseJoyEnabled ?? true,
          acc.autoSellLootKills ?? 0,
          acc.autoSellPokemonConfig || { enabled: false, common: true, rare: false, epic: false },
          acc.turboInstances ?? 3,
          acc.speciesWhitelist || [],
          acc.proxy,
          acc.routesEnabled || false,
          acc.routes || []
        );
        engine.setAllZoneObjects(zones);
        engineRefs.current.set(accountId, engine);
      } else {
        engine.setAllZoneObjects(zones);
      }

      await engine.connectOnline();
    },
    [zones, mapId, captureConfig, globalShinyMode, autoPotionThreshold, pushLog, updateAccountState, handleAuthError]
  );

  // 2. Iniciar Caça (Inicia o loop de caça)
  const startHuntAccount = useCallback(
    async (accountId: string, targetZoneId?: string) => {
      const acc = accountsRef.current.find((a) => a.id === accountId);
      if (!acc || !acc.token) return;

      const zoneToUse = targetZoneId || acc.mapId || mapId;

      let engine = engineRefs.current.get(accountId);
      if (!engine) {
        const zList = zones.map((z) => z.id);
        engine = new PokePixelEngine(
          acc.email,
          acc.password || '',
          acc.token,
          zoneToUse,
          acc.captureConfig || captureConfig,
          (st) => updateAccountState(accountId, st),
          (msg) => pushLog(accountId, msg),
          () => handleAuthError(accountId),
          globalShinyMode,
          zList,
          acc.autoPotionThreshold ?? autoPotionThreshold,
          0,
          acc.autoHealEnabled ?? true,
          acc.autoNurseJoyEnabled ?? true,
          acc.autoSellLootKills ?? 0,
          acc.autoSellPokemonConfig || { enabled: false, common: true, rare: false, epic: false },
          acc.turboInstances ?? 3,
          acc.speciesWhitelist || [],
          acc.proxy
        );
        engine.setAllZoneObjects(zones);
        engineRefs.current.set(accountId, engine);
      } else {
        engine.setAllZoneObjects(zones);
      }

      engine.start(zoneToUse);
    },
    [zones, mapId, captureConfig, globalShinyMode, autoPotionThreshold, pushLog, updateAccountState, handleAuthError]
  );

  // 3. Pausar Caça (Mantém online)
  const stopHuntAccount = useCallback(
    (accountId: string) => {
      const engine = engineRefs.current.get(accountId);
      if (engine) engine.stopHunt();
    },
    []
  );

  // 4. Desconectar Conta (Idle)
  const disconnectAccount = useCallback(
    (accountId: string) => {
      const engine = engineRefs.current.get(accountId);
      if (engine) engine.stop();
      updateAccountState(accountId, { status: 'idle' });
    },
    [updateAccountState]
  );

  const startAll = useCallback(() => {
    Promise.all(accounts.map((acc) => {
      if (acc.status !== 'hunting') return startHuntAccount(acc.id);
    }));
  }, [accounts, startHuntAccount]);

  const startAllHunt = useCallback(() => {
    // Stagger starts by 3s per account to avoid 429 rate-limiting on /prepare
    const toStart = accounts.filter(acc => acc.status !== 'hunting');
    toStart.forEach((acc, i) => {
      setTimeout(() => startHuntAccount(acc.id), i * 3000);
    });
  }, [accounts, startHuntAccount]);

  const stopAll = useCallback(() => {
    accounts.forEach((acc) => disconnectAccount(acc.id));
  }, [accounts, disconnectAccount]);

  const openBrowserWithToken = useCallback(async (accountId: string) => {
    const acc = accountsRef.current.find((a) => a.id === accountId);
    if (!acc?.token) return;
    try {
      await (window as any).electron.invoke('browser:open-with-token', {
        token: acc.token,
        email: acc.email || acc.login || '',
        password: acc.password || '',
      });
    } catch (e) {
      console.error('Failed to open browser:', e);
    }
  }, []);

  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const handleSelectAccount = useCallback((id: string, e?: React.MouseEvent) => {
    if (e && e.ctrlKey) {
      setSelectedAccounts(prev => {
        if (prev.includes(id)) return prev.filter(a => a !== id);
        return [...prev, id];
      });
      setLastSelectedId(id);
      return;
    }
    
    setSelectedAccount(id);
    setSelectedAccounts([id]);
    setLastSelectedId(id);
    setMainTab('conta');
  }, []);

  const connectedCount = accounts.filter((a) => a.status === 'hunting' || a.status === 'online').length;
  const activeAccount = accounts.find((a) => a.id === selectedAccount);

  const forceLogin = async (accountId: string) => {
    const acc = accountsRef.current.find((a) => a.id === accountId);
    if (!acc || !acc.password) {
      pushLog(accountId, '❌ Senha não salva nesta conta. Remova e adicione-a novamente.');
      return;
    }

    pushLog(accountId, '🔑 Fazendo login manual...');
    try {
      const res = await axios.post(
        'https://pokepixel.nietore.com/api/v1/auth/login',
        { login: acc.email, password: acc.password },
        { validateStatus: () => true }
      );

      if (res.status === 200 && res.data && (res.data.token || res.data.access_token)) {
        const token = res.data.token || res.data.access_token;
        updateAccountState(accountId, { token, status: 'idle' });
        pushLog(accountId, '✅ Login realizado com sucesso! Token atualizado.');
      } else {
        pushLog(accountId, `❌ Falha no login: ${res.data?.error?.message || res.status}`);
      }
    } catch (e: any) {
      pushLog(accountId, `❌ Erro no login: ${e.message}`);
    }
  };

  const handleSaveAccountSettings = (updatedAccount: Account) => {
    if (selectedAccounts.length > 1 && selectedAccounts.includes(updatedAccount.id)) {
      setAccounts(prev => prev.map(a => {
        if (selectedAccounts.includes(a.id)) {
          const newAcc = {
            ...a,
            mapId: updatedAccount.mapId,
            captureConfig: updatedAccount.captureConfig,
            autoHealEnabled: updatedAccount.autoHealEnabled,
            autoPotionThreshold: updatedAccount.autoPotionThreshold,
            autoNurseJoyEnabled: updatedAccount.autoNurseJoyEnabled,
            turboInstances: updatedAccount.turboInstances,
            autoSellLootKills: updatedAccount.autoSellLootKills,
            autoSellPokemonConfig: updatedAccount.autoSellPokemonConfig,
            routesEnabled: updatedAccount.routesEnabled,
            routes: updatedAccount.routes
          };
          
          const engine = engineRefs.current.get(a.id);
          if (engine) engine.updateConfig(newAcc, zones);
          pushLog(a.id, '⚙️ Configurações sincronizadas em massa (Multi-Select).');
          return newAcc;
        }
        return a;
      }));
    } else {
      setAccounts((prev) => prev.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)));
      const engine = engineRefs.current.get(updatedAccount.id);
      if (engine) {
        engine.updateConfig(updatedAccount, zones);
      }
      pushLog(updatedAccount.id, '⚙️ Configurações individuais salvas com sucesso.');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[rgb(var(--bg-deep))]">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          accounts={accounts}
          selectedAccounts={selectedAccounts}
          onSelectAccount={handleSelectAccount}
          onSelectMultiple={(ids) => setSelectedAccounts(ids)}
          onAdd={() => setShowAddModal(true)}
          onRemove={(id: string) => {
            disconnectAccount(id);
            setAccounts((prev) => prev.filter((a) => a.id !== id));
            if (selectedAccount === id) {
              setSelectedAccount(null);
              setMainTab('global');
            }
          }}
          onOpenSettings={() => setShowSettings(true)}
          onImport={() => setShowSettings(true)}
          onExport={() => {}}
          onStartAll={startAllHunt}
          onStopAll={stopAll}
          connectedCount={connectedCount}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Main Navigation Tabs */}
          <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-base))] shrink-0">
            <TabBtn active={mainTab === 'conta'} onClick={() => { if (selectedAccount) setMainTab('conta'); }} disabled={!selectedAccount} icon={<Gamepad2 size={13} />}>
              Conta
            </TabBtn>
            <TabBtn active={mainTab === 'global'} onClick={() => setMainTab('global')} icon={<BarChart3 size={13} />}>
              Painel Geral
            </TabBtn>
            <TabBtn active={mainTab === 'log'} onClick={() => setMainTab('log')} icon={<ScrollText size={13} />}>
              Log
            </TabBtn>
            <TabBtn active={mainTab === 'globalRoutes'} onClick={() => setMainTab('globalRoutes')} icon={<MapIcon size={13} />}>
              Rotas Montadas
            </TabBtn>
            <TabBtn active={mainTab === 'control'} onClick={() => setMainTab('control')} icon={<SlidersHorizontal size={13} />}>
              Controle
            </TabBtn>
            
            {/* Botão de Mapa Pokémon na barra superior */}
            <div className="ml-auto pr-3 flex items-center">
              <button
                onClick={() => {
                  const targetId = selectedAccount || accounts[0]?.id;
                  if (targetId) setHuntSelectorAccountId(targetId);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-md bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all cursor-pointer"
              >
                <MapIcon size={14} />
                Mapa Pokémon
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-hidden flex flex-col relative">
            {mainTab === 'global' && <GlobalPanel accounts={accounts} onSelectAccount={handleSelectAccount} />}
            {mainTab === 'globalRoutes' && (
              <GlobalRoutePanel globalRoutes={globalRoutes} zones={zones} setGlobalRoutes={setGlobalRoutes} />
            )}
            {mainTab === 'log' && <LogPanel logs={globalLogs} onClear={() => setGlobalLogs([])} />}
            {mainTab === 'control' && (
              <ControlPanel
                accounts={accounts}
                onStartAccount={(id) => startHuntAccount(id)}
                onStopAccount={(id) => stopHuntAccount(id)}
                logs={globalLogs}
                onClearLogs={() => setGlobalLogs([])}
              />
            )}
            {mainTab === 'conta' && activeAccount && (
              <div className="p-6 max-w-6xl mx-auto space-y-6 h-full overflow-y-auto custom-scrollbar w-full">
                {/* Account Action Header */}
                <div className="flex items-center justify-between bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))]">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h1 className="text-base font-bold text-white">{activeAccount.trainerName || activeAccount.name || activeAccount.email}</h1>
                        {activeAccount.trainerLevel !== undefined && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                            Nv. {activeAccount.trainerLevel}
                          </span>
                        )}
                      </div>
                      
                      {/* EXP Bar do Treinador — sempre visível */}
                      <div className="flex flex-col w-48 mt-1 gap-0.5">
                        <div className="flex justify-between items-center text-[9px] font-bold tracking-wider text-amber-400">
                          <span>EXP</span>
                          <span className="font-mono">
                            {activeAccount.trainerExp !== undefined
                              ? `${activeAccount.trainerExpPercent ?? 0}%`
                              : '—'}
                          </span>
                        </div>
                        <div className="relative w-full h-1.5 rounded-full bg-black/50 border border-[rgb(var(--border))]/70 overflow-hidden shadow-inner" title={`EXP: ${activeAccount.trainerExp ?? 0}`}>
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_5px_rgba(251,191,36,0.5)] transition-all duration-700"
                            style={{ width: `${Math.min(100, activeAccount.trainerExpPercent ?? 0)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <span
                      className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold ${
                        activeAccount.status === 'hunting'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : activeAccount.status === 'online'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : activeAccount.status === 'error'
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}
                    >
                      {activeAccount.status === 'hunting' ? (
                        <>
                          <Swords size={12} /> Caçando
                        </>
                      ) : activeAccount.status === 'online' ? (
                        <>
                          <Wifi size={12} /> Online
                        </>
                      ) : activeAccount.status === 'error' ? (
                        <>
                          <WifiOff size={12} /> Erro
                        </>
                      ) : (
                        <>
                          <WifiOff size={12} /> Desconectado
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => forceLogin(activeAccount.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-blue-400 border border-blue-500/30 transition-colors cursor-pointer"
                      title="Re-autenticar Conta (Atualizar Token)"
                    >
                      <Key size={13} />
                      Re-login
                    </button>

                    {/* Botão: Ficar Online */}
                    {activeAccount.status === 'idle' && (
                      <button
                        onClick={() => connectAccount(activeAccount.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer shadow"
                      >
                        <Wifi size={14} />
                        Ficar Online
                      </button>
                    )}

                    {/* Botão: Selecionar Mapa Pokémon da Conta */}
                    <button
                      onClick={() => setHuntSelectorAccountId(activeAccount.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-700 hover:bg-cyan-600 text-white transition-colors cursor-pointer shadow"
                      title="Selecionar Mapa Pokémon para esta conta especificamente"
                    >
                      <MapIcon size={14} />
                      Mapa Pokémon
                    </button>

                    {/* Botão: Caçar / Pausar Caça */}
                    {activeAccount.status === 'hunting' ? (
                      <button
                        onClick={() => stopHuntAccount(activeAccount.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors cursor-pointer shadow"
                      >
                        <Square size={14} />
                        Pausar Caça
                      </button>
                    ) : (
                      <button
                        onClick={() => startHuntAccount(activeAccount.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-600 hover:bg-green-500 text-white transition-colors cursor-pointer shadow"
                      >
                        <Play size={14} />
                        Caçar
                      </button>
                    )}

                    {/* Botão: Abrir Jogo no Navegador */}
                    {(activeAccount.status === 'hunting' || activeAccount.status === 'online') && (
                      <button
                        onClick={() => openBrowserWithToken(activeAccount.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-700 hover:bg-indigo-600 text-white transition-colors cursor-pointer shadow"
                        title="Abrir o jogo no navegador (mesma hunt — bot + browser juntos)"
                      >
                        <Globe size={14} />
                        Abrir Jogo
                      </button>
                    )}

                    <button
                      onClick={() => setSettingsModalAccount(activeAccount)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-700 hover:bg-gray-600 text-white transition-colors cursor-pointer"
                      title="Configurações da Conta"
                    >
                      <Settings size={14} />
                      Configurações
                    </button>


                    {/* Botão: Desconectar */}
                    {activeAccount.status !== 'idle' && (
                      <button
                        onClick={() => disconnectAccount(activeAccount.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer shadow"
                      >
                        <WifiOff size={14} />
                        Desconectar
                      </button>
                    )}
                  </div>
                </div>

                <HuntAnalyzerPanel accounts={[activeAccount]} />

                {/* Sub-Abas da Conta (Log, Time, Inventário, QuickSell, Radar) */}
                <div className="flex flex-col flex-1 bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))]/50 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex border-b border-[rgb(var(--border))] pb-2 gap-4">
                    <button
                      onClick={() => setAccountTab('log')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'log' ? 'text-blue-400 border-b-2 border-blue-400 pb-1' : 'text-gray-400'}`}
                    >
                      <ScrollText size={14} />
                      Logs
                    </button>
                    <button
                      onClick={() => setAccountTab('team')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'team' ? 'text-green-400 border-b-2 border-green-400 pb-1' : 'text-gray-400'}`}
                    >
                      <Users size={14} />
                      Time ({activeAccount.team?.length || 0})
                    </button>
                    <button
                      onClick={() => setAccountTab('inventory')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'inventory' ? 'text-amber-400 border-b-2 border-amber-400 pb-1' : 'text-gray-400'}`}
                    >
                      <Package size={14} />
                      Inventário ({activeAccount.inventory?.length || 0})
                    </button>
                    <button
                      onClick={() => setAccountTab('sell')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'sell' ? 'text-purple-400 border-b-2 border-purple-400 pb-1' : 'text-gray-400'}`}
                    >
                      <ShoppingCart size={14} />
                      Venda Rápida
                    </button>
                    <button
                      onClick={() => setAccountTab('routes')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'routes' ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-gray-400'}`}
                    >
                      <MapIcon size={14} />
                      Rotas
                    </button>
                    <button
                      onClick={() => setAccountTab('radar')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'radar' ? 'text-cyan-400 border-b-2 border-cyan-400 pb-1' : 'text-gray-400'}`}
                    >
                      <Radar size={14} />
                      Radar ({activeAccount.radarLogs?.length || 0})
                    </button>
                    <button
                      onClick={() => setAccountTab('captured' as any)}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === ('captured' as any) ? 'text-emerald-400 border-b-2 border-emerald-400 pb-1' : 'text-gray-400'}`}
                    >
                      <Trophy size={14} className={accountTab === ('captured' as any) ? 'text-emerald-400' : 'text-gray-400'} />
                      Capturados ({activeAccount.capturedLogs?.length || 0})
                    </button>
                    <button
                      onClick={() => setAccountTab('pc')}
                      className={`text-xs font-bold flex items-center gap-1.5 ${accountTab === 'pc' ? 'text-pink-400 border-b-2 border-pink-400 pb-1' : 'text-gray-400'}`}
                    >
                      <Cross size={14} className={accountTab === 'pc' ? 'text-pink-400' : 'text-gray-400'} />
                      Poke Centro ({(activeAccount.pc || []).length})
                    </button>
                  </div>

                  {accountTab === 'log' && (
                    <div 
                      className="bg-black/50 border border-[rgb(var(--border))] rounded-xl p-3.5 h-[350px] overflow-y-auto font-mono text-[11px] space-y-1.5 custom-scrollbar shadow-inner"
                    >
                      {(activeAccount.logs || []).length === 0 ? (
                        <div className="text-[12px] text-gray-500 text-center py-16 flex flex-col items-center justify-center gap-2">
                          <ScrollText size={24} className="text-gray-600 animate-pulse" />
                          <span>Aguardando eventos... Nenhum log registrado para esta conta ainda.</span>
                        </div>
                      ) : (
                        (activeAccount.logs || []).map((l, idx) => (
                          <div key={idx} className={`hover:brightness-125 transition-colors border-b border-gray-800/20 pb-0.5 leading-relaxed ${getLogColor(l)}`}>
                            {l}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {accountTab === 'team' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const engine = engineRefs.current.get(activeAccount.id);
                            if (engine) engine.manualHeal();
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-pink-600/20 text-pink-400 border border-pink-500/30 hover:bg-pink-600/30 transition-all cursor-pointer shadow-sm"
                        >
                          <Cross size={14} /> Curar na Nurse Joy
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {(activeAccount.team || []).map((poke: any, idx: number) => {
                          const speciesId = poke.species_id || poke.species?.id || poke.species?.name || poke.name || 'sunkern';
                          const name = poke.name || poke.species?.name || poke.species_id || `Pokémon #${speciesId}`;
                          const ivs = poke.ivs || {};
                          const totalIv = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
                          const ivPercent = Math.round((totalIv / 186) * 100);
                          
                          const rarityStr = String(poke.rarity || poke.quality || 'COMUM').toUpperCase();
                          const isShiny = rarityStr.includes('SHINY') || poke.is_shiny;
                          const isLegendary = rarityStr.includes('LEGENDARY') || rarityStr.includes('LENDARIO');
                          const isEpic = rarityStr.includes('EPIC') || rarityStr.includes('EPICO');
                          const isRare = rarityStr.includes('RARE') || rarityStr.includes('RARO');
                          const isUncommon = rarityStr.includes('UNCOMMON') || rarityStr.includes('INCOMUM');

                          const rarityBadgeStyle = isShiny
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                            : isLegendary
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : isEpic
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : isRare
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isUncommon
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

                          return (
                            <div key={idx} className={`bg-[rgb(var(--bg-surface))] p-3 rounded-xl flex gap-3 items-center relative group transition-all duration-300 ${poke.is_active ? 'border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border border-[rgb(var(--border))] shadow-sm'}`}>
                              <PokemonImage speciesId={speciesId} speciesName={name} className="w-12 h-12 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 pr-[140px] overflow-hidden">
                                  <span className="font-bold text-xs text-white capitalize block truncate">{name}</span>
                                  {rarityStr !== 'COMUM' && (
                                    <span className={`px-1.5 py-[1px] rounded-[4px] text-[8px] font-bold border uppercase tracking-wider shrink-0 leading-none ${rarityBadgeStyle}`}>
                                      {rarityStr === 'UNCOMMON' ? 'INCOMUM' : rarityStr}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 block font-mono">Nv. {poke.level} | HP {poke.hp}/{poke.max_hp}</span>
                                <IvBar totalIv={totalIv} ivPct={ivPercent} showLabels={false} />
                                
                                {/* Barra de EXP do Pokémon */}
                                {poke.exp !== undefined && (() => {
                                  // Helpers for PokePixel EXP curve (Standard Pokemon curves * 65)
                                  const getBaseExp = (lvl: number, curve: number) => {
                                    if (curve === 1) return (4 * Math.pow(lvl, 3)) / 5;
                                    if (curve === 2) return Math.pow(lvl, 3);
                                    if (curve === 3) return (1.2 * Math.pow(lvl, 3)) - (15 * Math.pow(lvl, 2)) + (100 * lvl) - 140;
                                    if (curve === 4) return (5 * Math.pow(lvl, 3)) / 4;
                                    return Math.pow(lvl, 3);
                                  };
                                  
                                  const curve = poke.exp_curve_version || 2;
                                  const lvl = poke.level || 1;
                                  const curTotalExp = poke.exp;
                                  
                                  const expCurrentLevel = Math.floor(getBaseExp(lvl, curve) * 65);
                                  const expNextLevel = Math.floor(getBaseExp(lvl + 1, curve) * 65);
                                  
                                  const expIntoLevel = Math.max(0, curTotalExp - expCurrentLevel);
                                  const expRequired = Math.max(1, expNextLevel - expCurrentLevel);
                                  const expPct = Math.min(100, Math.round((expIntoLevel / expRequired) * 100));

                                  return (
                                    <div className="flex flex-col gap-0.5 pt-1">
                                      <div className="flex justify-between items-center text-[8px] text-purple-400 font-bold tracking-wide">
                                        <span>EXP</span>
                                        <span className="font-mono bg-purple-500/10 px-1 rounded">{expPct}%</span>
                                      </div>
                                      <div className="relative w-full h-1.5 rounded-full bg-black/50 border border-[rgb(var(--border))]/70 overflow-hidden shadow-inner" title={`${expIntoLevel.toLocaleString()} / ${expRequired.toLocaleString()}`}>
                                        <div
                                          className="h-full rounded-full bg-gradient-to-r from-purple-600 to-violet-400 shadow-[0_0_5px_rgba(139,92,246,0.5)] transition-all duration-700"
                                          style={{ width: `${expPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                  onClick={() => {
                                    if (poke.is_active) return;
                                    const engine = engineRefs.current.get(activeAccount.id);
                                    if (engine) engine.setLeader(poke.id || poke._id);
                                  }}
                                  className={`px-2 py-1 text-[9px] font-bold rounded border ${
                                    poke.is_active
                                      ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 cursor-default'
                                      : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/30'
                                  }`}
                                >
                                  {poke.is_active ? 'Líder Atual' : 'Líder'}
                                </button>
                                <button
                                  onClick={() => {
                                    const engine = engineRefs.current.get(activeAccount.id);
                                    if (engine) engine.toggleLock(poke.id || poke._id, !poke.locked);
                                  }}
                                  className={`px-2 py-1 text-[9px] font-bold rounded border ${
                                    poke.locked 
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/40' 
                                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/40'
                                  }`}
                                >
                                  {poke.locked ? 'Deslockar' : 'Lockar'}
                                </button>
                                <button
                                  onClick={() => {
                                    const engine = engineRefs.current.get(activeAccount.id);
                                    if (engine) engine.moveCreature(poke.id || poke._id, 'storage');
                                  }}
                                  className="px-2 py-1 text-[9px] font-bold bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded hover:bg-pink-500/40"
                                >
                                  Pro PC
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {accountTab === 'pc' && (
                    <div className="grid grid-cols-3 gap-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
                      {(activeAccount.pc || []).length === 0 ? (
                        <div className="col-span-3 text-[12px] text-gray-500 text-center py-10">
                          Nenhum Pokémon no PC.
                        </div>
                      ) : (
                        (activeAccount.pc || []).map((poke: any, idx: number) => {
                          const speciesId = poke.species_id || poke.species?.id || poke.species?.name || poke.name || 'sunkern';
                          const name = poke.name || poke.species?.name || poke.species_id || `Pokémon #${speciesId}`;
                          const ivs = poke.ivs || {};
                          const totalIv = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0);
                          const ivPercent = Math.round((totalIv / 186) * 100);
                          const rarityStr = String(poke.rarity || poke.quality || 'COMUM').toUpperCase();
                          const isShiny = rarityStr.includes('SHINY') || poke.is_shiny;
                          const isLegendary = rarityStr.includes('LEGENDARY') || rarityStr.includes('LENDARIO');
                          const isEpic = rarityStr.includes('EPIC') || rarityStr.includes('EPICO');
                          const isRare = rarityStr.includes('RARE') || rarityStr.includes('RARO');
                          const isUncommon = rarityStr.includes('UNCOMMON') || rarityStr.includes('INCOMUM');

                          const rarityBadgeStyle = isShiny
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                            : isLegendary
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : isEpic
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : isRare
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isUncommon
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-gray-500/20 text-gray-400 border-gray-500/30';

                          return (
                            <div key={idx} className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] p-3 rounded-xl flex gap-3 items-center shadow-sm relative group">
                              <PokemonImage speciesId={speciesId} speciesName={name} className="w-12 h-12 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-1.5 pr-24 overflow-hidden">
                                  <span className="font-bold text-xs text-white capitalize truncate">{name}</span>
                                  {rarityStr !== 'COMUM' && (
                                    <span className={`px-1.5 py-[1px] rounded-[4px] text-[8px] font-bold border uppercase tracking-wider shrink-0 leading-none ${rarityBadgeStyle}`}>
                                      {rarityStr === 'UNCOMMON' ? 'INCOMUM' : rarityStr}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[10px] text-gray-400 block font-mono">Nv. {poke.level}</span>
                                <IvBar totalIv={totalIv} ivPct={ivPercent} showLabels={false} />
                              </div>
                              <div className="absolute top-2 right-2 flex gap-1">
                                <button
                                  onClick={() => {
                                    const engine = engineRefs.current.get(activeAccount.id);
                                    if (engine) engine.toggleLock(poke.id || poke._id, !poke.locked);
                                  }}
                                  className={`px-2 py-1 text-[9px] font-bold rounded border ${
                                    poke.locked 
                                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/40' 
                                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/40'
                                  }`}
                                >
                                  {poke.locked ? 'Deslockar' : 'Lockar'}
                                </button>
                                <button
                                  onClick={() => {
                                    const engine = engineRefs.current.get(activeAccount.id);
                                    if (engine) engine.moveCreature(poke.id || poke._id, 'inventory');
                                  }}
                                  className="px-2 py-1 text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30 rounded hover:bg-green-500/40"
                                >
                                  Pro Time
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {accountTab === 'routes' && (
                    <div className="h-[350px]">
                      <RoutePanel account={activeAccount} zones={zones} updateAccount={updateAccountState} />
                    </div>
                  )}

                  {accountTab === 'inventory' && (
                    <div className="grid grid-cols-6 gap-2">
                      {(activeAccount.inventory || []).map((item: any, idx: number) => (
                        <div key={idx} className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] p-2 rounded-lg text-center">
                          <ItemImage itemId={item.item_id} itemName={item.name} className="w-8 h-8 mx-auto mb-1" />
                          <span className="text-[11px] font-bold text-white block truncate">{item.name || item.item_id}</span>
                          <span className="text-[10px] text-gray-400 block">x{item.qty || item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {accountTab === 'sell' && (
                    <QuickSellPanel
                      account={activeAccount}
                      onRefreshInventory={() => connectAccount(activeAccount.id)}
                      pushLog={(msg) => pushLog(activeAccount.id, msg)}
                    />
                  )}

                  {accountTab === 'radar' && (
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                      {(activeAccount.radarLogs || []).length === 0 ? (
                        <div className="text-[12px] text-gray-400 text-center py-10 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl">
                          <Radar size={24} className="mx-auto text-cyan-400/50 mb-2 animate-pulse" />
                          <span>Nenhum monstro detectado no radar ainda.</span>
                        </div>
                      ) : (
                        (activeAccount.radarLogs || []).map((r: any, idx: number) => {
                          const rawName = String(r.name || r.speciesId || '').replace(/^Pokémon\s+#/i, '').trim();
                          const speciesId = r.speciesId || rawName || 'sunkern';
                          const displayName = rawName || speciesId;
                          const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                          const rarityStr = String(r.rarity || 'COMUM').toUpperCase();
                          const isShiny = rarityStr.includes('SHINY');
                          const isLegendary = rarityStr.includes('LEGENDARY') || rarityStr.includes('LENDARIO');
                          const isEpic = rarityStr.includes('EPIC') || rarityStr.includes('EPICO');
                          const isRare = rarityStr.includes('RARE') || rarityStr.includes('RARO');
                          const isUncommon = rarityStr.includes('UNCOMMON') || rarityStr.includes('INCOMUM');

                          const rarityBadgeStyle = isShiny
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                            : isLegendary
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : isEpic
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : isRare
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isUncommon
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-gray-500/20 text-gray-300 border-gray-500/30';

                          const ivs = r.ivs || {};
                          const totalIv = ivs.total ?? 0;
                          const ivPct = ivs.percentage ?? Math.round((totalIv / 186) * 100);
                          const hpIv = ivs.hp ?? 0;
                          const atkIv = ivs.atk ?? 0;
                          const defIv = ivs.def ?? 0;
                          const spaIv = ivs.spa ?? 0;
                          const spdIv = ivs.spd ?? 0;
                          const speIv = ivs.spe ?? 0;

                          return (
                            <div
                              key={idx}
                              className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/50 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                <div className="w-12 h-12 flex items-center justify-center bg-[rgb(var(--bg-deep))] rounded-lg p-1.5 border border-[rgb(var(--border))]/60 shrink-0 shadow-inner">
                                  <PokemonImage speciesId={speciesId} speciesName={capitalizedName} className="w-10 h-10" />
                                </div>

                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-white">{capitalizedName}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${rarityBadgeStyle}`}>
                                      {rarityStr}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                      Nv. {r.level || 1}
                                    </span>
                                  </div>

                                  {/* Barra de IV (Medidor Visual Min 0 - Max 186) */}
                                  <IvBar totalIv={totalIv} ivPct={ivPct} />

                                  {/* Individual IV Chips */}
                                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      HP: <strong className="text-white">{hpIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      ATK: <strong className="text-white">{atkIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      DEF: <strong className="text-white">{defIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      SPA: <strong className="text-white">{spaIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      SPD: <strong className="text-white">{spdIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      SPE: <strong className="text-white">{speIv}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <span className="text-[10px] text-gray-500 font-mono shrink-0 self-end sm:self-center">
                                {r.timestamp}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {accountTab === ('captured' as any) && (
                    <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                      {(activeAccount.capturedLogs || []).length === 0 ? (
                        <div className="text-[12px] text-gray-400 text-center py-10 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl">
                          <Trophy size={24} className="mx-auto text-amber-400/50 mb-2" />
                          <span>Nenhum Pokémon capturado nesta sessão.</span>
                        </div>
                      ) : (
                        (activeAccount.capturedLogs || []).map((r: any, idx: number) => {
                          const rawName = String(r.name || r.speciesId || '').replace(/^Pokémon\s+#/i, '').trim();
                          const speciesId = r.speciesId || rawName || 'sunkern';
                          const displayName = rawName || speciesId;
                          const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                          const rarityStr = String(r.rarity || 'COMUM').toUpperCase();
                          const isShiny = rarityStr.includes('SHINY') || r.isShiny;
                          const isLegendary = rarityStr.includes('LEGENDARY') || rarityStr.includes('LENDARIO');
                          const isEpic = rarityStr.includes('EPIC') || rarityStr.includes('EPICO');
                          const isRare = rarityStr.includes('RARE') || rarityStr.includes('RARO');
                          const isUncommon = rarityStr.includes('UNCOMMON') || rarityStr.includes('INCOMUM');

                          const rarityBadgeStyle = isShiny
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                            : isLegendary
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                            : isEpic
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                            : isRare
                            ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            : isUncommon
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-gray-500/20 text-gray-300 border-gray-500/30';

                          const ivs = r.ivs || {};
                          const hpIv = ivs.hp ?? 0;
                          const atkIv = ivs.atk ?? 0;
                          const defIv = ivs.def ?? 0;
                          const spaIv = ivs.spa ?? 0;
                          const spdIv = ivs.spd ?? 0;
                          const speIv = ivs.spe ?? 0;
                          const totalIv = hpIv + atkIv + defIv + spaIv + spdIv + speIv;
                          const ivPct = Math.round((totalIv / 186) * 100);

                          return (
                            <div
                              key={idx}
                              className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/50 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                <div className="w-12 h-12 flex items-center justify-center bg-[rgb(var(--bg-deep))] rounded-lg p-1.5 border border-[rgb(var(--border))]/60 shrink-0 shadow-inner">
                                  <PokemonImage speciesId={speciesId} speciesName={capitalizedName} className="w-10 h-10" />
                                </div>

                                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-white">{capitalizedName}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${rarityBadgeStyle}`}>
                                      {rarityStr}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                                      Nv. {r.level || 1}
                                    </span>
                                  </div>

                                  {/* Barra de IV (Medidor Visual Min 0 - Max 186) */}
                                  <IvBar totalIv={totalIv} ivPct={ivPct} />

                                  {/* Individual IV Chips */}
                                  <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      HP: <strong className="text-white">{hpIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      ATK: <strong className="text-white">{atkIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      DEF: <strong className="text-white">{defIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      SPA: <strong className="text-white">{spaIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      SPD: <strong className="text-white">{spdIv}</strong>
                                    </span>
                                    <span className="text-[9px] font-semibold bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] text-gray-300 px-1.5 py-0.5 rounded">
                                      SPE: <strong className="text-white">{speIv}</strong>
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <span className="text-[10px] text-gray-500 font-mono shrink-0 self-end sm:self-center">
                                {r.timestamp}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Modais */}
      {showAddModal && <AddAccountModal onClose={() => setShowAddModal(false)} onAdd={addAccount} />}
      {showSettings && (
        <SettingsDialog 
          onClose={() => setShowSettings(false)} 
          accounts={accounts}
          onSaveAccounts={(updated) => {
            setAccounts(updated);
            localStorage.setItem('pk_accounts', JSON.stringify(updated));
          }}
        />
      )}
      
      {settingsModalAccount && (
        <AccountSettingsModal
          account={settingsModalAccount}
          zones={zones}
          onSave={handleSaveAccountSettings}
          onClose={() => setSettingsModalAccount(null)}
        />
      )}

      {huntSelectorAccountId && (
        <HuntSelectorDialog
          zones={zones}
          currentZoneId={accounts.find((a) => a.id === huntSelectorAccountId)?.mapId || mapId}
          onSelect={(zId) => {
            setAccountMap(huntSelectorAccountId, zId);
            setHuntSelectorAccountId(null);
          }}
          onClose={() => setHuntSelectorAccountId(null)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] p-3 rounded-xl">
      <span className="text-[10px] text-[rgb(var(--text-muted))] font-bold uppercase block mb-1">{label}</span>
      <span className={`text-lg font-extrabold ${color} font-mono`}>{value}</span>
    </div>
  );
}

function TabBtn({ active, onClick, disabled, icon, children }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
        disabled ? 'opacity-30 cursor-not-allowed' : active ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-400 hover:text-white'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

export function IvBar({ totalIv, ivPct, showLabels = true }: { totalIv: number; ivPct: number; showLabels?: boolean }) {
  const pct = Math.max(0, Math.min(100, ivPct));

  const barGradient =
    pct >= 90
      ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
      : pct >= 75
      ? 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'
      : pct >= 50
      ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
      : 'bg-gradient-to-r from-red-500 to-orange-400';

  const textColor =
    pct >= 90
      ? 'text-amber-300'
      : pct >= 75
      ? 'text-green-400'
      : pct >= 50
      ? 'text-blue-400'
      : 'text-gray-300';

  return (
    <div className="flex flex-col gap-0.5 w-full max-w-[210px]">
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-[rgb(var(--text-muted))] font-bold uppercase tracking-wider text-[9px]">IV Total</span>
        <span className={`font-mono font-bold ${textColor}`}>
          {totalIv} <span className="text-[9px] text-gray-500 font-normal">/ 186</span> ({pct}%)
        </span>
      </div>

      <div className="relative w-full h-2 rounded-full bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))]/70 overflow-hidden p-0.5 shadow-inner">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barGradient}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {showLabels && (
        <div className="flex justify-between text-[8px] text-[rgb(var(--text-faint))] font-mono px-0.5 pt-0.5">
          <span>0 (Min)</span>
          <span>186 (Max)</span>
        </div>
      )}
    </div>
  );
}

export function PokemonImage({ speciesId, speciesName, className = "w-10 h-10" }: { speciesId?: string; speciesName?: string; className?: string }) {
  const [srcIndex, setSrcIndex] = useState(0);

  const raw = String(speciesId || speciesName || 'sunkern').toLowerCase().trim();
  const cleanId = raw.replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '');

  const sources = useMemo(() => {
    return [
      `https://pokepixel.nietore.com/assets/imported/creatures/${cleanId}/front.png`,
      `https://pokepixel.nietore.com/assets/imported/creatures/${raw}/front.png`,
      `https://pokepixel.nietore.com/assets/imported/monsters/${cleanId}.png`,
      `https://pokepixel.nietore.com/assets/monsters/${cleanId}.png`,
      `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${cleanId}.png`
    ];
  }, [raw, cleanId]);

  const handleError = () => {
    if (srcIndex < sources.length - 1) {
      setSrcIndex((prev) => prev + 1);
    } else {
      setSrcIndex(-1);
    }
  };

  if (srcIndex === -1 || !cleanId) {
    return (
      <div className={`${className} flex items-center justify-center bg-[rgb(var(--bg-deep))] rounded-lg border border-[rgb(var(--border))] text-cyan-400 font-bold text-xs p-1 shadow-inner`} title={speciesName || speciesId}>
        <Radar size={18} className="text-cyan-400 animate-pulse" />
      </div>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={speciesName || speciesId || 'Pokemon'}
      className={`${className} object-contain pixelated drop-shadow-sm`}
      onError={handleError}
    />
  );
}

export default App;
