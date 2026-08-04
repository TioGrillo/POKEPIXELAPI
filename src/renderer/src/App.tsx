import { useState, useEffect, useCallback } from "react";
import { Titlebar } from "./components/layout/Titlebar";
import { Sidebar } from "./components/layout/Sidebar";
import { AccountPage } from "./components/layout/AccountPage";
import { GlobalPanel } from "./components/panels/GlobalPanel";
import { LogPanel } from "./components/panels/LogPanel";
import { ControlPanel } from "./components/panels/ControlPanel";
import { AddAccountDialog } from "./components/ui/AddAccountDialog";
import { MassAddDialog } from "./components/ui/MassAddDialog";
import { HuntSelector } from "./components/ui/HuntSelector";
import { GlobalSettingsDialog } from "./components/ui/GlobalSettingsDialog";
import { LoginPage } from "./components/login/LoginPage";
import { RegisterBot } from "./components/panels/RegisterBot";
import { useBotStore } from "./stores/botStore";
import { invoke } from "./lib/ipc";
import { THEMES, applyTheme, applyCustomAccent } from "./lib/themes";
import { getRarity } from "./lib/rarity";
import type { AccountConfig, BotStats, LogEntry } from "./types";
import { PokedexPanel } from "./components/panels/PokedexPanel";
import { Gamepad2, BarChart3, ScrollText, SlidersHorizontal, BookOpen, UserPlus } from "lucide-react";

interface HuntEntry {
  name: string;
  area: string;
  minLevel: number;
  maxLevel: number;
}

type MainTab = "conta" | "global" | "log" | "control" | "pokedex" | "registro";

export function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [accounts, setAccounts] = useState<AccountConfig[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>("global");
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showMassAdd, setShowMassAdd] = useState(false);
  const [globalSettingsTab, setGlobalSettingsTab] = useState<"temas" | "backup">("temas");
  const [showHuntSelector, setShowHuntSelector] = useState(false);
  const [huntSelectorTarget, setHuntSelectorTarget] = useState<string | null>(null);
  const [hunts, setHunts] = useState<HuntEntry[]>([]);
  const { updateStats, addLog, applyBatch } = useBotStore();

  useEffect(() => {
    const handleOpenMassAdd = () => setShowMassAdd(true);
    window.addEventListener("open-mass-add", handleOpenMassAdd);
    return () => window.removeEventListener("open-mass-add", handleOpenMassAdd);
  }, []);

  useEffect(() => {
    invoke<{ success: boolean }>("auth:check").then((result) => {
      setAuthenticated(result?.success || false);
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    invoke<AccountConfig[]>("accounts:list").then((accs) => setAccounts(accs || []));

    invoke<any>("settings:get").then((s) => {
      if (s) {
        const theme = THEMES.find((t) => t.id === s.theme);
        if (theme) applyTheme(theme);
        else if (s.customAccent) applyCustomAccent(s.customAccent);
      }
    });

    fetch(`${window.location.origin}/hunts_data.json`)
      .catch(() => fetch("hunts_data.json"))
      .then((r) => r.json())
      .then((data: any) => {
        if (Array.isArray(data)) setHunts(data);
        else if (data.hunts) setHunts(data.hunts);
      })
      .catch(() => {});

    const offStats = window.electronAPI.on("bot:stats", (...args: unknown[]) => {
      const data = args[0] as { account: string } & Partial<BotStats>;
      if (data.account) updateStats(data.account, data as Partial<BotStats>);
    });

    const offLog = window.electronAPI.on("bot:log", (...args: unknown[]) => {
      const data = args[0] as LogEntry;
      addLog({ ...data, time: Date.now() });
    });

    const offCapture = window.electronAPI.on("bot:capture-log", (...args: unknown[]) => {
      const data = args[0] as { account: string, pk: any, escaped: boolean };
      
      const realPk = data.pk.pokemon || data.pk.poke || data.pk.entry || data.pk;
      const ivs = realPk.ivs || [];
      const calculatedIvTotal = ivs.reduce((a: number, b: number) => a + b, 0) || realPk.ivTotal || 0;
      const q = realPk.quality || 1.0;
      const calculatedScore = Math.round(q * calculatedIvTotal * 10) / 10;
      
      let rarity = getRarity(realPk);

      useBotStore.getState().addCapture({
        name: realPk.speciesName || realPk.name || "???",
        level: String(realPk.level || 1),
        ivTotal: calculatedIvTotal,
        score: calculatedScore,
        quality: String(q),
        power: String(realPk.power || 0),
        rarity,
        isShiny: realPk.shiny || false,
        isFailedShiny: data.escaped && realPk.shiny,
        timestamp: Date.now(),
        account: data.account,
        raw: ""
      });
    });

    const offBatch = window.electronAPI.on("bot:batch-update", (...args: unknown[]) => {
      const data = args[0] as { logs: any[], stats: Record<string, any>, captures: any[] };
      const parsedCaptures = data.captures.map(capData => {
        const realPk = capData.pk.pokemon || capData.pk.poke || capData.pk.entry || capData.pk;
        const ivs = realPk.ivs || [];
        const calculatedIvTotal = ivs.reduce((a: number, b: number) => a + b, 0) || realPk.ivTotal || 0;
        const q = realPk.quality || 1.0;
        const calculatedScore = Math.round(q * calculatedIvTotal * 10) / 10;
        let rarity = getRarity(realPk);
        
        return {
          name: realPk.speciesName || realPk.name || "???",
          level: String(realPk.level || 1),
          ivTotal: calculatedIvTotal,
          score: calculatedScore,
          quality: String(q),
          power: String(realPk.power || 0),
          rarity,
          isShiny: realPk.shiny || false,
          isFailedShiny: capData.escaped && realPk.shiny,
          timestamp: Date.now(),
          account: capData.account,
          raw: ""
        };
      });
      
      const newLogs = data.logs.map(l => ({ ...l, time: Date.now() }));
      applyBatch({ logs: newLogs, stats: data.stats, captures: parsedCaptures });
    });

    return () => { offStats(); offLog(); offCapture(); offBatch(); };
  }, [authenticated]);

  const saveAccounts = useCallback(async (list: AccountConfig[]) => {
    setAccounts(list);
    await invoke("accounts:save", list);
  }, []);

  const handleAddAccount = async (acc: AccountConfig) => {
    await saveAccounts([...accounts, acc]);
    setShowAddAccount(false);
  };

  const handleAddMass = async (newAccounts: AccountConfig[]) => {
    try {
      const updated = [...accounts, ...newAccounts];
      await saveAccounts(updated);
      setAccounts(updated);
      useBotStore.getState().setAccounts(updated);
      setShowMassAdd(false);
    } catch (e: any) {
      alert("Erro ao adicionar contas: " + e.message);
    }
  };

  const handleRemoveAccount = async (name: string) => {
    const updated = accounts.filter((a) => a.name !== name);
    await saveAccounts(updated);
    if (selectedAccount === name) {
      setSelectedAccount(null);
      setMainTab("global");
    }
  };

  const handleAccountUpdated = useCallback(async (updated: AccountConfig) => {
    const all = await invoke<AccountConfig[]>("accounts:list");
    const idx = all.findIndex((a) => a.name === updated.name);
    if (idx >= 0) {
      all[idx] = updated;
      await invoke("accounts:save", all);
    }
    setAccounts((prev) => prev.map((a) => (a.name === updated.name ? updated : a)));
  }, []);

  const handleSelectAccount = (name: string) => {
    setSelectedAccount(name);
    setMainTab("conta");
  };

  const handleHuntSelect = async (slug: string) => {
    if (!huntSelectorTarget) return;
    const acc = accounts.find((a) => a.name === huntSelectorTarget);
    if (!acc) return;
    const updated = { ...acc, hunt: slug };
    await handleAccountUpdated(updated);
    setShowHuntSelector(false);
    setHuntSelectorTarget(null);
  };

  const handleOpenHuntSelector = (accountName: string) => {
    setHuntSelectorTarget(accountName);
    setShowHuntSelector(true);
  };

  const handleImported = useCallback(async (importedAccounts: AccountConfig[]) => {
    setAccounts(importedAccounts);
  }, []);

  const handleExport = async () => {
    const res = await invoke<{ success: boolean; path?: string; error?: string }>("accounts:export");
    if (res.success) {
      addLog({ account: "sistema", level: "INFO", msg: `Contas exportadas para ${res.path}`, time: Date.now() });
    }
  };

  const handleLogout = async () => {
    await invoke("auth:logout");
    setAuthenticated(false);
  };

  const openSettings = (tab: "temas" | "backup" = "temas") => {
    setGlobalSettingsTab(tab);
    setShowGlobalSettings(true);
  };

  const activeAccount = accounts.find((a) => a.name === selectedAccount);
  const connectedCount = Object.values(useBotStore.getState().stats).filter((s) => s.connected).length;

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[rgb(var(--bg-deep))]">
        <div className="text-[13px] text-[rgb(var(--text-muted))]">Carregando...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginPage onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[rgb(var(--bg-deep))]">
      <Titlebar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          accounts={accounts}
          selectedAccount={selectedAccount}
          mainTab={mainTab as any}
          onSelectAccount={handleSelectAccount}
          onSelectTab={(tab) => { setSelectedAccount(null); setMainTab(tab); }}
          onAdd={() => setShowAddAccount(true)}
          onRemove={handleRemoveAccount}
          onOpenSettings={() => openSettings("temas")}
          onImport={() => openSettings("backup")}
          onExport={handleExport}
          onLogout={handleLogout}
          connectedCount={connectedCount}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-base))] shrink-0">
            <TabBtn active={mainTab === "conta"} onClick={() => { if (selectedAccount) setMainTab("conta"); }} disabled={!selectedAccount} icon={<Gamepad2 size={13} />}>
              Conta
            </TabBtn>
            <TabBtn active={mainTab === "global"} onClick={() => setMainTab("global")} icon={<BarChart3 size={13} />}>
              Painel Geral
            </TabBtn>
            <TabBtn active={mainTab === "log"} onClick={() => setMainTab("log")} icon={<ScrollText size={13} />}>
              Log
            </TabBtn>
            <TabBtn active={mainTab === "control"} onClick={() => setMainTab("control")} icon={<SlidersHorizontal size={13} />}>
              Controle
            </TabBtn>
            <TabBtn active={mainTab === "pokedex"} onClick={() => setMainTab("pokedex")} icon={<BookOpen size={13} />}>
              Pokedex
            </TabBtn>
            <TabBtn active={mainTab === "registro"} onClick={() => setMainTab("registro")} icon={<UserPlus size={13} />}>
              Registro
            </TabBtn>
          </div>
          <main className="flex-1 overflow-hidden flex flex-col relative">
            {mainTab === "conta" && activeAccount && (
              <AccountPage account={activeAccount} onAccountUpdated={handleAccountUpdated} onOpenHuntSelector={handleOpenHuntSelector} />
            )}
            {mainTab === "global" && <GlobalPanel accounts={accounts} />}
            {mainTab === "log" && <LogPanel />}
            {mainTab === "control" && <ControlPanel accounts={accounts} hunts={hunts} />}
            {mainTab === "pokedex" && <PokedexPanel accounts={accounts} />}
            {mainTab === "registro" && (
              <RegisterBot onAccountsChanged={() => invoke<AccountConfig[]>("accounts:list").then((accs) => setAccounts(accs || []))} />
            )}
          </main>
        </div>
      </div>
      {showAddAccount && <AddAccountDialog onAdd={handleAddAccount} onClose={() => setShowAddAccount(false)} />}
      {showMassAdd && <MassAddDialog onAddMass={handleAddMass} onClose={() => setShowMassAdd(false)} />}
      {showGlobalSettings && <GlobalSettingsDialog accounts={accounts} onImported={handleImported} onClose={() => setShowGlobalSettings(false)} initialTab={globalSettingsTab} />}
      {showHuntSelector && huntSelectorTarget && (
        <HuntSelector
          hunts={hunts}
          currentHunt={accounts.find((a) => a.name === huntSelectorTarget)?.hunt || ""}
          onSelect={handleHuntSelect}
          onClose={() => { setShowHuntSelector(false); setHuntSelectorTarget(null); }}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, disabled, icon, children }: {
  active: boolean; onClick: () => void; disabled?: boolean; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-colors whitespace-nowrap ${
        disabled ? "text-[rgb(var(--text-faint))] cursor-not-allowed"
          : active ? "text-[rgb(var(--accent))] border-b-2 border-[rgb(var(--accent))]"
            : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"
      }`}
    >
      {icon}{children}
    </button>
  );
}
