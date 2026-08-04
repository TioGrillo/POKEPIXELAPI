import { useState, useEffect, useRef } from "react";
import { invoke } from "../../lib/ipc";
import { THEMES, applyTheme, applyCustomAccent } from "../../lib/themes";
import type { AccountConfig } from "../../types";
import { X, Download, Upload, Palette, Settings, Check, Globe, Info, Wifi, WifiOff, Key, Bell, Volume2, Play, BellOff } from "lucide-react";
import logoSrc from "../../assets/logo.png";

interface Props {
  accounts: AccountConfig[];
  onImported: (accounts: AccountConfig[]) => void;
  onClose: () => void;
  initialTab?: Tab;
}

type Tab = "temas" | "geral" | "backup" | "proxies" | "jwt" | "sobre" | "alertas";

interface GlobalSettings {
  theme: string;
  language: string;
  autoStart: boolean;
  customAccent: string;
  defaultProxy: string;
  defaultTemplate: string;
  alertSound: string;
  alertVolume: number;
  captureSound: string;
  captureVolume: number;
  windowsNotify: boolean;
}

export function GlobalSettingsDialog({ accounts, onImported, onClose, initialTab }: Props) {
  const [tab, setTab] = useState<Tab>(initialTab || "temas");
  const [settings, setSettings] = useState<GlobalSettings>({
    theme: "midnight",
    language: "pt-BR",
    autoStart: false,
    customAccent: "",
    defaultProxy: "",
    defaultTemplate: "",
    alertSound: "notify.mp3",
    alertVolume: 1,
    captureSound: "notify.mp3",
    captureVolume: 1,
    windowsNotify: true,
  });
  const [soundFiles, setSoundFiles] = useState<string[]>([]);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [importMode, setImportMode] = useState<"merge" | "replace">("merge");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [activeThemeId, setActiveThemeId] = useState("midnight");

  // Proxies
  const [proxyList, setProxyList] = useState("");
  const [proxyRatio, setProxyRatio] = useState(1);
  const [proxyResult, setProxyResult] = useState<{ updated: number, missing: number, newAccounts: AccountConfig[] } | null>(null);
  const [proxyTestResults, setProxyTestResults] = useState<{ proxy: string, success: boolean, latency?: number, error?: string }[] | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // JWT Renewal
  const [jwtTokens, setJwtTokens] = useState<Record<string, string>>({});
  const [jwtMsgMap, setJwtMsgMap] = useState<Record<string, { type: "ok" | "err"; text: string }>>({});

  const handleUpdateJwt = async (accountName: string) => {
    const token = jwtTokens[accountName];
    if (!token || !token.trim()) {
       setJwtMsgMap(p => ({ ...p, [accountName]: { type: "err", text: "Token vazio" } }));
       return;
    }
    const updated = accounts.map(a => a.name === accountName ? { ...a, token: token.trim() } : a);
    await invoke("accounts:save", updated);
    onImported(updated);
    setJwtMsgMap(p => ({ ...p, [accountName]: { type: "ok", text: "Atualizado!" } }));
    setJwtTokens(p => ({ ...p, [accountName]: "" }));
    
    setTimeout(() => {
      setJwtMsgMap(p => {
        const next = { ...p };
        delete next[accountName];
        return next;
      });
    }, 3000);
  };

  useEffect(() => {
    invoke<any>("settings:get").then((s) => {
      if (s) {
        setSettings((p) => ({ ...p, ...s }));
        setActiveThemeId(s.theme || "midnight");
      }
    });
    invoke<string[]>("sounds:list").then((files) => setSoundFiles(files || []));
  }, []);

  const update = <K extends keyof GlobalSettings>(key: K, val: GlobalSettings[K]) =>
    setSettings((p) => ({ ...p, [key]: val }));

  const selectTheme = (themeId: string) => {
    setActiveThemeId(themeId);
    update("theme", themeId);
    update("customAccent", "");
    const theme = THEMES.find((t) => t.id === themeId);
    if (theme) applyTheme(theme);
  };

  const handleCustomColor = (hex: string) => {
    update("customAccent", hex);
    update("theme", "custom");
    setActiveThemeId("custom");
    applyCustomAccent(hex);
  };

  const applyProxies = () => {
    const list = proxyList.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (list.length === 0) return;

    let pIdx = 0;
    let usedCount = 0;
    let updated = 0;
    let missing = 0;

    const accs = accounts.map((acc) => {
      if (pIdx >= list.length) {
        missing++;
        return { ...acc, proxy: "" };
      }
      
      const assigned = list[pIdx];
      usedCount++;
      if (usedCount >= proxyRatio) {
        pIdx++;
        usedCount = 0;
      }
      updated++;
      return { ...acc, proxy: assigned };
    });

    setProxyResult({ updated, missing, newAccounts: accs });
  };

    const testProxies = async () => {
    const list = proxyList.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (list.length === 0) return;
    
    setIsTesting(true);
    setProxyTestResults([]);
    
    const activeProxies: string[] = [];
    
    await Promise.all(list.map(async (p) => {
      const res = await invoke<{ success: boolean, latency?: number, error?: string }>("proxy:test", p);
      const resultObj = { proxy: p, ...res };
      
      if (res.success) {
        activeProxies.push(p);
      }
      
      setProxyTestResults((prev) => {
        if (!prev) return [resultObj];
        return [...prev, resultObj];
      });
    }));
    
    setProxyList(activeProxies.join("\n"));
    setIsTesting(false);
  };

  const clearAllProxies = async () => {
    if (!confirm("Tem certeza que deseja remover os proxies de TODAS as contas?")) return;
    const updatedAccounts = await invoke<AccountConfig[]>("accounts:clear-proxies");
    onImported(updatedAccounts);
    setMsg({ type: "ok", text: "Todos os proxies foram removidos." });
  };

  const handleSave = async () => {
    await invoke("settings:set", settings);
    if (proxyResult) {
      await invoke("accounts:save", proxyResult.newAccounts);
      onImported(proxyResult.newAccounts);
    }
    const theme = THEMES.find((t) => t.id === settings.theme);
    if (theme) applyTheme(theme);
    else if (settings.customAccent) applyCustomAccent(settings.customAccent);
    onClose();
  };

  const handleExport = async () => {
    setMsg(null);
    const res = await invoke<{ success: boolean; path?: string; error?: string }>("accounts:export");
    if (res.success) setMsg({ type: "ok", text: `Exportado para ${res.path}` });
    else setMsg({ type: "err", text: res.error || "Erro ao exportar." });
  };

  const handleImport = async () => {
    setMsg(null);
    const res = await invoke<{ success: boolean; accounts?: AccountConfig[]; count?: number; error?: string }>("accounts:import", importMode);
    if (res.success && res.accounts) {
      onImported(res.accounts);
      setMsg({ type: "ok", text: `${res.count} conta(s) importada(s) com sucesso.` });
    } else {
      setMsg({ type: "err", text: res.error || "Erro ao importar." });
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "temas", label: "Temas", icon: <Palette size={12} /> },
    { id: "geral", label: "Geral", icon: <Settings size={12} /> },
    { id: "alertas", label: "Alertas", icon: <Bell size={12} /> },
    { id: "proxies", label: "Proxies", icon: <Globe size={12} /> },
    { id: "jwt", label: "JWT", icon: <Key size={12} /> },
    { id: "backup", label: "Backup", icon: <Download size={12} /> },
    { id: "sobre", label: "Sobre", icon: <Info size={12} /> },
  ];


  const selectedPreview = activeThemeId === "custom"
    ? settings.customAccent || "#f59e0b"
    : THEMES.find((t) => t.id === activeThemeId)?.preview || "#f59e0b";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[600px] max-h-[85vh] shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">Configuracoes Gerais</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"><X size={14} /></button>
        </div>

        <div className="flex gap-1 px-5 pt-3 border-b border-[rgb(var(--border))]">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-t-md transition-colors ${tab === t.id ? "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] border-b-2 border-[rgb(var(--accent))]" : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === "temas" && (
            <ThemeCarousel 
              activeThemeId={activeThemeId}
              selectTheme={selectTheme}
              selectedPreview={selectedPreview}
              settings={settings}
              handleCustomColor={handleCustomColor}
              update={update}
            />
          )}

          {tab === "geral" && (
            <>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Proxy Padrao (novas contas)</label>
                <input value={settings.defaultProxy} onChange={(e) => update("defaultProxy", e.target.value)}
                  placeholder="socks5://user:pass@host:port" className="w-full px-2 py-1.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]" />
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Copiar Perfil (Molde)</label>
                <select value={settings.defaultTemplate} onChange={(e) => update("defaultTemplate", e.target.value)}
                  className="w-full px-2 py-1.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]"
                >
                  <option value="">Nenhum</option>
                  {accounts.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select>
                <p className="text-[10px] text-[rgb(var(--text-faint))] mt-1">Novas contas herdarao todas configuracoes (menos Nome, Token e Proxy) deste perfil.</p>
              </div>
            </>
          )}

          {tab === "alertas" && (
            <div className="space-y-5">
              {/* Windows Toast Notification */}
              <div className="bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell size={15} className="text-[rgb(var(--accent))]" />
                    <span className="text-[13px] font-bold text-[rgb(var(--text-primary))]">Notificação do Windows</span>
                  </div>
                  <button
                    onClick={() => update("windowsNotify", !settings.windowsNotify)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                      settings.windowsNotify
                        ? "bg-green-500/20 border-green-500/40 text-green-400"
                        : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
                    }`}
                  >
                    {settings.windowsNotify ? <><Bell size={12} /> Ativada</> : <><BellOff size={12} /> Desativada</>}
                  </button>
                </div>
                <p className="text-[11px] text-[rgb(var(--text-muted))]">
                  Aparece no canto inferior direito (como notificações da Steam) quando um Shiny, Raro, Épico ou Lendário é detectado.
                  Ao clicar na notificação, o app fica em foco automaticamente.
                </p>
              </div>

              {/* Sound Selection */}
              <div className="bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
                <div className="flex items-center gap-2">
                  <Volume2 size={15} className="text-[rgb(var(--accent))]" />
                  <span className="text-[13px] font-bold text-[rgb(var(--text-primary))]">Som de Alerta</span>
                </div>

                <div>
                  <label className="block text-[11px] text-[rgb(var(--text-muted))] mb-2">Selecione o som de notificação:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* No sound option */}
                    <button
                      onClick={() => update("alertSound", "")}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] transition-all ${
                        settings.alertSound === ""
                          ? "bg-[rgb(var(--accent))]/20 border-[rgb(var(--accent))] text-[rgb(var(--accent))]"
                          : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--text-faint))]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <BellOff size={12} />
                        Sem som
                      </span>
                      {settings.alertSound === "" && <Check size={12} />}
                    </button>

                    {soundFiles.map((f) => (
                      <div key={f} className={`flex items-center justify-between gap-1 px-3 py-2 rounded-lg border text-[12px] transition-all ${
                        settings.alertSound === f
                          ? "bg-[rgb(var(--accent))]/20 border-[rgb(var(--accent))] text-[rgb(var(--accent))]"
                          : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
                      }`}>
                        <button
                          onClick={() => update("alertSound", f)}
                          className="flex-1 text-left flex items-center gap-2 min-w-0"
                        >
                          {settings.alertSound === f ? <Check size={11} /> : <Volume2 size={11} />}
                          <span className="truncate">{f.replace(/\.[^.]+$/, "")}</span>
                        </button>
                        <button
                          onClick={async () => {
                            setPreviewingSound(f);
                            const filePath = await invoke<string>("sounds:get-path", f);
                            const url = "file:///" + filePath.replace(/\\/g, "/");
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                            }
                            const audio = new Audio(url);
                            audio.volume = settings.alertVolume ?? 1;
                            previewAudioRef.current = audio;
                            audio.play().catch(() => {});
                            audio.onended = () => setPreviewingSound(null);
                            setTimeout(() => setPreviewingSound(null), 5000);
                          }}
                          className={`shrink-0 p-1 rounded transition-colors ${
                            previewingSound === f
                              ? "text-yellow-400 animate-pulse"
                              : "text-[rgb(var(--text-muted))] hover:text-[rgb(var(--accent))]"
                          }`}
                          title="Ouvir prévia"
                        >
                          <Play size={11} fill={previewingSound === f ? "currentColor" : "none"} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <label className="flex items-center justify-between text-[11px] text-[rgb(var(--text-muted))] mb-2">
                    <span>Volume</span>
                    <span className="font-semibold text-[rgb(var(--text-primary))]">{Math.round((settings.alertVolume ?? 1) * 100)}%</span>
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={settings.alertVolume ?? 1}
                    onChange={(e) => update("alertVolume", parseFloat(e.target.value))}
                    className="w-full accent-[rgb(var(--accent))]"
                  />
                </div>
              </div>

              {/* Capture Sound Selection */}
              <div className="bg-[rgb(var(--bg-surface))] p-4 rounded-xl border border-[rgb(var(--border))] space-y-3">
                <div className="flex items-center gap-2">
                  <Volume2 size={15} className="text-yellow-400" />
                  <span className="text-[13px] font-bold text-[rgb(var(--text-primary))]">Som de Captura (Lendário/Shiny)</span>
                </div>

                <div>
                  <label className="block text-[11px] text-[rgb(var(--text-muted))] mb-2">Selecione o som tocado ao capturar um Lendário ou Shiny:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* No sound option */}
                    <button
                      onClick={() => update("captureSound", "")}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-[12px] transition-all ${
                        settings.captureSound === ""
                          ? "bg-yellow-400/20 border-yellow-400 text-yellow-400"
                          : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:border-[rgb(var(--text-faint))]"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <BellOff size={12} />
                        Sem som
                      </span>
                      {settings.captureSound === "" && <Check size={12} />}
                    </button>

                    {soundFiles.map((f) => (
                      <div key={`cap-${f}`} className={`flex items-center justify-between gap-1 px-3 py-2 rounded-lg border text-[12px] transition-all ${
                        settings.captureSound === f
                          ? "bg-yellow-400/20 border-yellow-400 text-yellow-400"
                          : "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] text-[rgb(var(--text-muted))]"
                      }`}>
                        <button
                          onClick={() => update("captureSound", f)}
                          className="flex-1 text-left flex items-center gap-2 min-w-0"
                        >
                          {settings.captureSound === f ? <Check size={11} /> : <Volume2 size={11} />}
                          <span className="truncate">{f.replace(/\.[^.]+$/, "")}</span>
                        </button>
                        <button
                          onClick={async () => {
                            setPreviewingSound("cap_" + f);
                            const filePath = await invoke<string>("sounds:get-path", f);
                            const url = "file:///" + filePath.replace(/\\/g, "/");
                            if (previewAudioRef.current) {
                              previewAudioRef.current.pause();
                            }
                            const audio = new Audio(url);
                            audio.volume = settings.captureVolume ?? 1;
                            previewAudioRef.current = audio;
                            audio.play().catch(() => {});
                            audio.onended = () => setPreviewingSound(null);
                            setTimeout(() => setPreviewingSound(null), 5000);
                          }}
                          className={`shrink-0 p-1 rounded transition-colors ${
                            previewingSound === "cap_" + f
                              ? "text-yellow-400 animate-pulse"
                              : "text-[rgb(var(--text-muted))] hover:text-yellow-400"
                          }`}
                          title="Ouvir prévia"
                        >
                          <Play size={11} fill={previewingSound === "cap_" + f ? "currentColor" : "none"} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capture Volume */}
                <div>
                  <label className="flex items-center justify-between text-[11px] text-[rgb(var(--text-muted))] mb-2">
                    <span>Volume</span>
                    <span className="font-semibold text-[rgb(var(--text-primary))]">{Math.round((settings.captureVolume ?? 1) * 100)}%</span>
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={settings.captureVolume ?? 1}
                    onChange={(e) => update("captureVolume", parseFloat(e.target.value))}
                    className="w-full accent-yellow-400"
                  />
                </div>
              </div>

              <p className="text-[10px] text-[rgb(var(--text-faint))]">
                Os sons ficam em: D:\PROJETOS AT\a\sounds — adicione qualquer .mp3 ou .wav nessa pasta e ele aparecerá aqui.
              </p>
            </div>
          )}

          {tab === "proxies" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-[rgb(var(--text-muted))]">Adicione proxys de forma massiva ou gerencie os atuais.</p>
                <button onClick={clearAllProxies} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-600/15 text-red-400 hover:bg-red-600/25 transition-colors">
                  Remover Proxy de TODAS as contas
                </button>
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Lista de Proxys</label>
                  <textarea
                    value={proxyList}
                    onChange={(e) => setProxyList(e.target.value)}
                    placeholder="Um proxy por linha (ex: http://user:pass@ip:port)"
                    className="w-full h-40 px-3 py-2 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors resize-none font-mono"
                  />
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={testProxies} 
                      disabled={proxyList.trim() === "" || isTesting}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent))] disabled:opacity-40 transition-colors"
                    >
                      {isTesting ? "Testando..." : "Testar Proxies da Lista"}
                    </button>
                  </div>
                  {proxyTestResults && (
                    <div className="mt-2 max-h-32 overflow-y-auto space-y-1 p-2 bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg">
                      {proxyTestResults.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="truncate w-48 text-[rgb(var(--text-secondary))]">{r.proxy}</span>
                          {r.success ? (
                            <span className="text-green-400 flex items-center gap-1.5"><Wifi size={11} /> {r.latency}ms</span>
                          ) : (
                            <span className="text-red-400 flex items-center gap-1.5" title={r.error}><WifiOff size={11} /> Offline</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="w-48 space-y-4">
                  <div className="space-y-2">
                    <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Distribuicao</label>
                    <div className="text-[11px] text-[rgb(var(--text-faint))] mb-1">Quantas contas por proxy?</div>
                    <select
                      value={proxyRatio}
                      onChange={(e) => setProxyRatio(Number(e.target.value))}
                      className="w-full px-2 py-1.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                    >
                      <option value={1}>1 Proxy para 1 Conta</option>
                      <option value={2}>1 Proxy para 2 Contas</option>
                      <option value={3}>1 Proxy para 3 Contas</option>
                      <option value={4}>1 Proxy para 4 Contas</option>
                      <option value={5}>1 Proxy para 5 Contas</option>
                      <option value={10}>1 Proxy para 10 Contas</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={applyProxies}
                    disabled={proxyList.trim() === ""}
                    className="w-full py-2 rounded-lg text-[12px] font-medium bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/25 disabled:opacity-40 transition-colors"
                  >
                    Enviar (Aplicar Distribuicao)
                  </button>

                  {proxyResult && (
                    <div className="text-[11px] space-y-1 pt-2 border-t border-[rgb(var(--border))]">
                      <div className="text-green-400">✓ {proxyResult.updated} perfis configurados.</div>
                      {proxyResult.missing > 0 && (
                        <div className="text-red-400">⚠ {proxyResult.missing} perfis ficaram sem proxy!</div>
                      )}
                      <div className="text-[rgb(var(--text-faint))] text-[10px] italic">Clique em Salvar e Aplicar abaixo para confirmar.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "jwt" && (
            <div className="space-y-4">
              <p className="text-[12px] text-[rgb(var(--text-muted))]">Atualize os tokens de forma rápida. Cole o novo token ao lado da conta desejada e clique em Salvar.</p>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {accounts.map(a => {
                  const msg = jwtMsgMap[a.name];
                  return (
                    <div key={a.name} className="flex items-center gap-2 p-2 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))]">
                      <div className="w-[100px] shrink-0 truncate text-[12px] font-medium text-[rgb(var(--text-primary))]" title={a.name}>
                        {a.name}
                      </div>
                      <div className="flex-1 relative min-w-0">
                        <input
                          type="text"
                          value={jwtTokens[a.name] || ""}
                          onChange={(e) => setJwtTokens(p => ({ ...p, [a.name]: e.target.value }))}
                          placeholder="Cole o novo JWT aqui..."
                          className="w-full px-2 py-1.5 rounded-md bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] font-mono focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateJwt(a.name)}
                        disabled={!(jwtTokens[a.name] && jwtTokens[a.name].trim())}
                        className="shrink-0 px-3 py-1.5 rounded-md text-[11px] font-medium bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/25 disabled:opacity-40 transition-colors"
                      >
                        Salvar
                      </button>
                      {msg && (
                        <div className={`shrink-0 w-16 text-center text-[10px] font-medium ${msg.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  );
                })}
                {accounts.length === 0 && (
                  <div className="text-[12px] text-[rgb(var(--text-faint))] text-center py-4">Nenhuma conta cadastrada.</div>
                )}
              </div>
            </div>
          )}

          {tab === "backup" && (
            <>
              <p className="text-[12px] text-[rgb(var(--text-muted))]">Faca backup das contas e configuracoes para transferir entre dispositivos.</p>
              <div className="flex gap-3">
                <button onClick={handleExport}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--bg-surface))] transition-all text-[13px] text-[rgb(var(--text-secondary))]">
                  <Download size={16} /> Exportar Contas
                </button>
                <button onClick={handleImport}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))] hover:bg-[rgb(var(--bg-surface))] transition-all text-[13px] text-[rgb(var(--text-secondary))]">
                  <Upload size={16} /> Importar Contas
                </button>
              </div>
              <div>
                <label className="block text-[12px] text-[rgb(var(--text-muted))] mb-1">Modo de Importacao</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-[12px] text-[rgb(var(--text-secondary))] cursor-pointer">
                    <input type="radio" checked={importMode === "merge"} onChange={() => setImportMode("merge")} className="accent-[rgb(var(--accent))]" /> Mesclar
                  </label>
                  <label className="flex items-center gap-1.5 text-[12px] text-[rgb(var(--text-secondary))] cursor-pointer">
                    <input type="radio" checked={importMode === "replace"} onChange={() => setImportMode("replace")} className="accent-[rgb(var(--accent))]" /> Substituir
                  </label>
                </div>
                <p className="text-[10px] text-[rgb(var(--text-faint))] mt-1">
                  {importMode === "merge" ? "Adiciona contas novas, mantendo as existentes." : "Remove todas contas atuais e substitui pelas importadas."}
                </p>
              </div>
              {msg && (
                <div className={`px-3 py-2 rounded text-[12px] ${msg.type === "ok" ? "bg-green-600/20 text-green-400" : "bg-red-600/20 text-red-400"}`}>
                  {msg.text}
                </div>
              )}
            </>
          )}
          {tab === "sobre" && (
            <div className="flex flex-col items-center justify-center text-center space-y-6 pt-10 pb-4 h-full">
              <img src={logoSrc} alt="Logo" className="w-24 h-24 object-contain rounded-2xl bg-[rgb(var(--bg-surface))] shadow-lg p-2" />
              
              <div>
                <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] tracking-wide">POKE IDLE BOT</h2>
                <div className="text-[13px] text-[rgb(var(--accent))] mt-1 font-medium">Versao 4.3.15</div>
              </div>

              <p className="text-[12px] text-[rgb(var(--text-muted))] max-w-[320px] leading-relaxed">
                Navegador simples e otimizado para uso de multiplas contas e relacionados. Desenvolvido pela UNION SCRIPTS.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end px-5 py-3 border-t border-[rgb(var(--border))]">
          <button onClick={onClose} className="px-4 py-1.5 rounded-md text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] transition-colors">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-1.5 rounded-md text-[13px] font-medium bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] hover:brightness-110 transition-all">Salvar e Aplicar</button>
        </div>
      </div>
    </div>
  );
}

function ThemeCarousel({ activeThemeId, selectTheme, selectedPreview, settings, handleCustomColor, update }: any) {
  const [page, setPage] = useState(0);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(THEMES.length / itemsPerPage);

  const paginatedThemes = THEMES.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Temas ({THEMES.length})</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-2 py-1 rounded bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] disabled:opacity-30 hover:text-[rgb(var(--text-primary))]">&lt;</button>
            <span className="text-[11px] text-[rgb(var(--text-faint))]">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="px-2 py-1 rounded bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] disabled:opacity-30 hover:text-[rgb(var(--text-primary))]">&gt;</button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {paginatedThemes.map((t) => (
            <ThemeCard key={t.id} theme={t} active={activeThemeId === t.id} onSelect={selectTheme} />
          ))}
        </div>

        <div className="pt-2 border-t border-[rgb(var(--border))]">
          <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2 font-semibold">Cor Personalizada</label>
          <div className="flex items-center gap-3">
            <input type="color"
              value={selectedPreview}
              onChange={(e) => handleCustomColor(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-[rgb(var(--border))] bg-transparent" />
            <input value={settings.customAccent}
              onChange={(e) => { if (e.target.value.length === 7) handleCustomColor(e.target.value); else update("customAccent", e.target.value); }}
              placeholder="#hex-color"
              className="px-3 py-1.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] font-mono w-28 focus:outline-none focus:border-[rgb(var(--accent))]" />
          </div>
        </div>
      </div>

      <div className="w-40 shrink-0">
        <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2 font-semibold">Preview</label>
        <div className="rounded-lg border border-[rgb(var(--border))] overflow-hidden">
          <div className="h-8 flex items-center px-2 gap-1" style={{ background: `rgb(${THEMES.find((t) => t.id === activeThemeId)?.vars["bg-deep"] || "2 6 23"})` }}>
            <span className="w-2 h-2 rounded-full bg-red-500/60" />
            <span className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <span className="w-2 h-2 rounded-full bg-green-500/60" />
          </div>
          <div className="p-2 space-y-1.5" style={{ background: `rgb(${THEMES.find((t) => t.id === activeThemeId)?.vars["bg-base"] || "15 23 42"})` }}>
            <div className="h-2 rounded" style={{ background: `rgb(${THEMES.find((t) => t.id === activeThemeId)?.vars["bg-surface"] || "30 41 59"})`, width: "80%" }} />
            <div className="h-2 rounded" style={{ background: `rgb(${THEMES.find((t) => t.id === activeThemeId)?.vars["bg-elevated"] || "51 65 85"})`, width: "60%" }} />
            <div className="flex gap-1 mt-2">
              <div className="h-4 w-4 rounded" style={{ background: selectedPreview }} />
              <div className="h-4 flex-1 rounded" style={{ background: `rgb(${THEMES.find((t) => t.id === activeThemeId)?.vars["bg-surface"] || "30 41 59"})` }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ theme, active, onSelect }: { theme: any; active: boolean; onSelect: (id: string) => void }) {
  return (
    <button onClick={() => onSelect(theme.id)}
      className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${active ? "border-[rgb(var(--accent))] bg-[rgb(var(--bg-surface))]" : "border-[rgb(var(--border))] hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/50"}`}>
      {active && <span className="absolute top-1 right-1"><Check size={10} className="text-[rgb(var(--accent))]" /></span>}
      <div className="flex gap-0.5">
        <span className="w-4 h-4 rounded-full border border-white/10" style={{ background: `rgb(${theme.vars["bg-deep"]})` }} />
        <span className="w-4 h-4 rounded-full border border-white/10" style={{ background: `rgb(${theme.vars["bg-base"]})` }} />
        <span className="w-4 h-4 rounded-full border border-white/10" style={{ background: `rgb(${theme.vars["bg-surface"]})` }} />
      </div>
      <div className="flex items-center gap-1">
        <span className="w-3 h-3 rounded-full" style={{ background: theme.preview }} />
        <span className="text-[10px] text-[rgb(var(--text-secondary))]">{theme.label}</span>
      </div>
    </button>
  );
}
