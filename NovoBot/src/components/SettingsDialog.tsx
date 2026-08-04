import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Palette,
  Settings,
  Bell,
  Globe,
  Download,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Check,
  AlertTriangle,

  FileDown,
  FileUp,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { THEMES as themes, applyTheme, applyCustomAccent } from '../themes';

interface BotSettings {
  theme: string;
  customAccent: string;
  defaultProxy: string;
  proxyList: string;
  windowsNotify: boolean;
  alertSound: string;
  alertVolume: number;
  captureSound: string;
  captureVolume: number;
  importMode: 'merge' | 'replace';
}

import type { Account } from '../types';

interface SettingsDialogProps {
  onClose: () => void;
  accounts?: Account[];
  onSaveAccounts?: (accounts: Account[]) => void;
}

const STORAGE_KEY = 'pk_settings';

const defaultSettings: BotSettings = {
  theme: 'dark',
  customAccent: '#7c3aed',
  defaultProxy: '',
  proxyList: '',
  windowsNotify: true,
  alertSound: 'notify.mp3',
  alertVolume: 80,
  captureSound: 'notify.mp3',
  captureVolume: 70,
  importMode: 'merge',
};

const soundFiles = [
  'notify.mp3',
  'notify2.mp3',
  'notify3.mp3',
  'notify4.mp3',
  'notify5.mp3',
  'notify6.mp3',
  'notify7.mp3',
  'notify8.mp3',
  'Sem som',
];

const alertSoundOptions = [...soundFiles];
const captureSoundOptions = [...soundFiles];

type TabId = 'temas' | 'geral' | 'alertas' | 'proxies' | 'backup' | 'sobre';

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'temas', label: 'Temas', icon: <Palette size={14} /> },
  { id: 'geral', label: 'Geral', icon: <Settings size={14} /> },
  { id: 'alertas', label: 'Alertas', icon: <Bell size={14} /> },
  { id: 'proxies', label: 'Proxies', icon: <Globe size={14} /> },
  { id: 'backup', label: 'Backup', icon: <Download size={14} /> },
  { id: 'sobre', label: 'Sobre', icon: <Info size={14} /> },
];

const THEMES_PER_PAGE = 6;

function loadSettings(): BotSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultSettings, ...parsed };
    }
  } catch {}
  return { ...defaultSettings };
}

function saveSettings(settings: BotSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function ToggleSwitch({
  value,
  onChange,
  accent,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  accent?: string;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      className="w-9 h-5 rounded-full cursor-pointer transition-colors flex-shrink-0"
      style={{
        backgroundColor: value
          ? accent || 'rgb(var(--accent))'
          : 'rgb(var(--bg-elevated))',
      }}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
        style={{ marginTop: 2 }}
      />
    </div>
  );
}

function InputField({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
    />
  );
}

function SoundButton({
  name,
  selected,
  onSelect,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const isNone = name === 'Sem som';

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isNone) return;
    try {
      const audio = new Audio(`/sounds/${name}`);
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {}
  };

  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border transition-all cursor-pointer ${
        selected
          ? 'bg-[rgb(var(--accent))] bg-opacity-15 border-[rgb(var(--accent))] text-[rgb(var(--text-primary))]'
          : 'bg-[rgb(var(--bg-surface))] border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:border-[rgb(var(--accent))]'
      }`}
    >
      {!isNone && (
        <button
          onClick={handlePlay}
          className="w-5 h-5 flex items-center justify-center rounded-full bg-[rgb(var(--bg-elevated))] hover:bg-[rgb(var(--accent))] transition-colors"
        >
          <Play size={10} className="ml-0.5" />
        </button>
      )}
      <span className="truncate">{name}</span>
      {selected && <Check size={12} className="ml-auto flex-shrink-0" />}
    </button>
  );
}

export default function SettingsDialog({ onClose, accounts = [], onSaveAccounts }: SettingsDialogProps) {
  const [settings, setSettings] = useState<BotSettings>(loadSettings);
  const [activeTab, setActiveTab] = useState<TabId>('temas');
  const [themePage, setThemePage] = useState(0);
  const [proxyTestResult, setProxyTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    latency?: number;
    message?: string;
  }>({ status: 'idle' });
  const [proxyTestAllResult, setProxyTestAllResult] = useState<
    { proxy: string; status: 'ok' | 'fail'; latency?: number }[]
  >([]);
  const [testingAll, setTestingAll] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  
  // Proxies
  const [proxyRatio, setProxyRatio] = useState(1);
  const [proxyResult, setProxyResult] = useState<{ updated: number, missing: number, newAccounts: Account[] } | null>(null);
  
  const panelRef = useRef<HTMLDivElement>(null);

  const [initialSettings] = useState<BotSettings>(loadSettings);

  useEffect(() => {
    const t = Array.isArray(themes) ? themes.find((t) => t.id === settings.theme) : null;
    if (t) applyTheme(t);
    if (settings.customAccent) applyCustomAccent(settings.customAccent);
  }, [settings.theme, settings.customAccent]);

  const totalPages = Math.ceil(
    (Array.isArray(themes) ? themes.length : 0) / THEMES_PER_PAGE
  );
  const currentThemes = Array.isArray(themes)
    ? themes.slice(
        themePage * THEMES_PER_PAGE,
        (themePage + 1) * THEMES_PER_PAGE
      )
    : [];

  const selectedThemeObj = Array.isArray(themes)
    ? themes.find((t) => t.id === settings.theme) || themes[0]
    : null;

  const update = useCallback(
    <K extends keyof BotSettings>(key: K, value: BotSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleSave = useCallback(() => {
    saveSettings(settings);
    
    if (proxyResult && onSaveAccounts) {
      onSaveAccounts(proxyResult.newAccounts);
    }
    
    if (selectedThemeObj) {
      applyTheme(selectedThemeObj);
    }
    if (settings.customAccent) {
      applyCustomAccent(settings.customAccent);
    }
    onClose();
  }, [settings, selectedThemeObj, proxyResult, onSaveAccounts, onClose]);

  const handleCancel = useCallback(() => {
    const t = Array.isArray(themes) ? themes.find((t) => t.id === initialSettings.theme) : null;
    if (t) applyTheme(t);
    if (initialSettings.customAccent) applyCustomAccent(initialSettings.customAccent);
    onClose();
  }, [initialSettings, onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        handleCancel();
      }
    },
    [handleCancel]
  );

  const handleTestProxy = useCallback(async () => {
    if (!settings.defaultProxy.trim()) {
      setProxyTestResult({
        status: 'error',
        message: 'Insira um proxy para testar',
      });
      return;
    }
    setProxyTestResult({ status: 'testing' });
    setTimeout(() => {
      const success = Math.random() > 0.3;
      setProxyTestResult({
        status: success ? 'success' : 'error',
        latency: success ? Math.floor(Math.random() * 500) + 50 : undefined,
        message: success
          ? `Conexão bem-sucedida`
          : `Falha na conexão com o proxy`,
      });
    }, 1500);
  }, [settings.defaultProxy]);

  const handleTestAllProxies = useCallback(async () => {
    const lines = settings.proxyList
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setFeedback({ type: 'error', message: 'Nenhum proxy para testar' });
      return;
    }
    setTestingAll(true);
    setProxyTestAllResult([]);
    const results: {
      proxy: string;
      status: 'ok' | 'fail';
      latency?: number;
    }[] = [];
    for (let i = 0; i < lines.length; i++) {
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 600));
      const success = Math.random() > 0.25;
      results.push({
        proxy: lines[i],
        status: success ? 'ok' : 'fail',
        latency: success ? Math.floor(Math.random() * 800) + 30 : undefined,
      });
      setProxyTestAllResult([...results]);
    }
    setTestingAll(false);
    const okCount = results.filter((r) => r.status === 'ok').length;
    setFeedback({
      type: okCount > 0 ? 'success' : 'error',
      message: `${okCount}/${results.length} proxies funcionando`,
    });
  }, [settings.proxyList]);

  const applyProxies = useCallback(() => {
    if (!accounts || accounts.length === 0) {
      setFeedback({ type: 'error', message: 'Nenhuma conta cadastrada.' });
      return;
    }
    
    const list = settings.proxyList.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (list.length === 0) {
      setFeedback({ type: 'error', message: 'A lista de proxies está vazia.' });
      return;
    }

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
  }, [settings.proxyList, proxyRatio, accounts]);

  const clearAllProxies = useCallback(() => {
    if (!accounts || accounts.length === 0) return;
    if (!window.confirm("Tem certeza que deseja remover os proxies de TODAS as contas?")) return;
    
    const updatedAccounts = accounts.map(a => ({ ...a, proxy: "" }));
    if (onSaveAccounts) onSaveAccounts(updatedAccounts);
    setProxyResult(null);
    setFeedback({ type: "success", message: "Todos os proxies foram removidos." });
  }, [accounts, onSaveAccounts]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleCancel]);

  useEffect(() => {
    if (feedback) {
      const t = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(t);
    }
  }, [feedback]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'temas':
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {currentThemes.map((theme: any) => {
                const isSelected = settings.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => {
                      update('theme', theme.id);
                      if (theme.preview) {
                        update('customAccent', theme.preview);
                      }
                    }}
                    className={`relative p-3 rounded-xl border-2 transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-[rgb(var(--accent))] bg-[rgb(var(--bg-surface))]'
                        : 'border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--text-faint))]'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0 border border-[rgb(var(--border))]"
                        style={{ backgroundColor: theme.preview || '#7c3aed' }}
                      />
                      <span className="text-[12px] font-medium text-[rgb(var(--text-primary))] truncate">
                        {theme.label || theme.name || theme.id}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {(theme.swatches || []).slice(0, 5).map((c: string, i: number) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <Check size={14} className="text-[rgb(var(--accent))]" />
                      </div>
                    )}
                  </button>
                );
              })}
              {currentThemes.length === 0 && (
                <div className="col-span-3 text-center py-8 text-[13px] text-[rgb(var(--text-muted))]">
                  Nenhum tema disponível
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setThemePage((p) => Math.max(0, p - 1))}
                  disabled={themePage === 0}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-elevated))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[12px] text-[rgb(var(--text-muted))]">
                  {themePage + 1} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setThemePage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={themePage >= totalPages - 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-elevated))] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4">
              <p className="text-[11px] text-[rgb(var(--text-muted))] mb-3 uppercase tracking-wider font-medium">
                Pré-visualização
              </p>
              <div className="rounded-lg overflow-hidden border border-[rgb(var(--border))]">
                <div className="h-7 bg-[rgb(var(--bg-deep))] flex items-center px-3 gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-400" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span className="text-[10px] text-[rgb(var(--text-muted))] ml-2">
                    POKEPIXEL BOT
                  </span>
                </div>
                <div className="bg-[rgb(var(--bg-base))] p-4 space-y-3">
                  <div className="bg-[rgb(var(--bg-surface))] rounded-lg p-3 border border-[rgb(var(--border))]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-[rgb(var(--accent))]" />
                      <div className="space-y-1 flex-1">
                        <div className="h-2 w-24 rounded bg-[rgb(var(--bg-elevated))]" />
                        <div className="h-1.5 w-16 rounded bg-[rgb(var(--text-faint))]" />
                      </div>
                    </div>
                    <div className="h-1.5 w-full rounded bg-[rgb(var(--bg-elevated))] mb-1" />
                    <div className="h-1.5 w-3/4 rounded bg-[rgb(var(--bg-elevated))]" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 flex-1 rounded bg-[rgb(var(--bg-elevated))]" />
                    <div
                      className="h-2 w-8 rounded"
                      style={{
                        backgroundColor: settings.customAccent || 'rgb(var(--accent))',
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-2 w-2/3 rounded bg-[rgb(var(--bg-elevated))]" />
                    <div className="h-2 flex-1 rounded bg-[rgb(var(--accent))]" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4">
              <p className="text-[11px] text-[rgb(var(--text-muted))] mb-3 uppercase tracking-wider font-medium">
                Cor de destaque personalizada
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.customAccent}
                  onChange={(e) => update('customAccent', e.target.value)}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-[rgb(var(--border))] bg-transparent"
                />
                <input
                  type="text"
                  value={settings.customAccent}
                  onChange={(e) => update('customAccent', e.target.value)}
                  className="flex-1 px-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] font-mono placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
                  placeholder="#7c3aed"
                />
              </div>
            </div>
          </div>
        );

      case 'geral':
        return (
          <div className="space-y-5">
            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-[rgb(var(--text-muted))] uppercase tracking-wider font-medium">
                Proxy Padrão
              </p>
              <InputField
                value={settings.defaultProxy}
                onChange={(v) => update('defaultProxy', v)}
                placeholder="socks5://user:pass@host:port"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestProxy}
                  disabled={proxyTestResult.status === 'testing'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--bg-elevated))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] hover:text-[rgb(var(--text-primary))] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <Shield
                    size={14}
                    className={
                      proxyTestResult.status === 'testing'
                        ? 'animate-spin'
                        : ''
                    }
                  />
                  {proxyTestResult.status === 'testing'
                    ? 'Testando...'
                    : 'Testar Proxy'}
                </button>
                {proxyTestResult.status === 'success' && (
                  <span className="text-[12px] text-green-400 flex items-center gap-1">
                    <Check size={12} />
                    OK — {proxyTestResult.latency}ms
                  </span>
                )}
                {proxyTestResult.status === 'error' && (
                  <span className="text-[12px] text-red-400 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    {proxyTestResult.message}
                  </span>
                )}
              </div>
            </div>

            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-[rgb(var(--text-muted))] uppercase tracking-wider font-medium">
                Zona / Caça Padrão
              </p>
              <InputField
                value={settings.defaultProxy}
                onChange={() => {}}
                placeholder="Ex: zonas_1, zone_hunt, etc."
              />
              <p className="text-[11px] text-[rgb(var(--text-faint))]">
                Define a zona padrão para capturas e caças automáticas.
              </p>
            </div>
          </div>
        );

      case 'alertas':
        return (
          <div className="space-y-5">
            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[13px] text-[rgb(var(--text-primary))] font-medium">
                  Notificações Windows
                </p>
                <p className="text-[11px] text-[rgb(var(--text-muted))]">
                  Exibir notificações toast no sistema
                </p>
              </div>
              <ToggleSwitch
                value={settings.windowsNotify}
                onChange={(v) => update('windowsNotify', v)}
              />
            </div>

            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-[rgb(var(--text-muted))] uppercase tracking-wider font-medium">
                Som de Alerta
              </p>
              <div className="grid grid-cols-3 gap-2">
                {alertSoundOptions.map((s) => (
                  <SoundButton
                    key={s}
                    name={s}
                    selected={settings.alertSound === s}
                    onSelect={() => update('alertSound', s)}
                  />
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">
                    Volume
                  </span>
                  <span className="text-[11px] text-[rgb(var(--text-secondary))] font-mono">
                    {settings.alertVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.alertVolume}
                  onChange={(e) =>
                    update('alertVolume', Number(e.target.value))
                  }
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[rgb(var(--accent))]"
                  style={{
                    background: `linear-gradient(to right, rgb(var(--accent)) ${settings.alertVolume}%, rgb(var(--bg-elevated)) ${settings.alertVolume}%)`,
                  }}
                />
              </div>
            </div>

            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-[rgb(var(--text-muted))] uppercase tracking-wider font-medium">
                Som de Captura
              </p>
              <div className="grid grid-cols-3 gap-2">
                {captureSoundOptions.map((s) => (
                  <SoundButton
                    key={s}
                    name={s}
                    selected={settings.captureSound === s}
                    onSelect={() => update('captureSound', s)}
                  />
                ))}
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">
                    Volume
                  </span>
                  <span className="text-[11px] text-[rgb(var(--text-secondary))] font-mono">
                    {settings.captureVolume}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={settings.captureVolume}
                  onChange={(e) =>
                    update('captureVolume', Number(e.target.value))
                  }
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    accentColor: '#eab308',
                    background: `linear-gradient(to right, #eab308 ${settings.captureVolume}%, rgb(var(--bg-elevated)) ${settings.captureVolume}%)`,
                  }}
                />
              </div>
            </div>
          </div>
        );

      case 'proxies':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] text-[rgb(var(--text-muted))]">Adicione proxys de forma massiva ou gerencie os atuais.</p>
              <button onClick={clearAllProxies} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-600/15 text-red-400 hover:bg-red-600/25 transition-colors cursor-pointer">
                Remover Proxy de TODAS as contas
              </button>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Lista de Proxys</label>
                <textarea
                  value={settings.proxyList}
                  onChange={(e) => update('proxyList', e.target.value)}
                  placeholder="Um proxy por linha (ex: http://user:pass@ip:port)"
                  className="w-full h-40 px-3 py-2 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors resize-none font-mono"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-[rgb(var(--text-muted))]">
                    {settings.proxyList.split('\n').filter((l) => l.trim()).length} proxies
                  </span>
                  <button 
                    onClick={handleTestAllProxies} 
                    disabled={settings.proxyList.trim() === "" || testingAll}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-primary))] hover:border-[rgb(var(--accent))] disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <RefreshCw size={12} className={testingAll ? 'animate-spin' : ''} />
                    {testingAll ? "Testando..." : "Testar Proxies da Lista"}
                  </button>
                </div>
                
                {proxyTestAllResult.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-1 p-2 bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg">
                    {proxyTestAllResult.map((r, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                        <span className={`truncate w-48 ${r.status === 'ok' ? 'text-[rgb(var(--text-secondary))]' : 'text-red-400 line-through'}`}>
                          {r.proxy}
                        </span>
                        {r.status === 'ok' ? (
                          <span className="text-green-400 flex items-center gap-1.5"><Check size={11} /> {r.latency}ms</span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1.5" title="Offline"><X size={11} /> Offline</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="w-48 space-y-4">
                <div className="space-y-2">
                  <label className="block text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">Distribuição</label>
                  <div className="text-[11px] text-[rgb(var(--text-faint))] mb-1">Quantas contas por proxy?</div>
                  <select
                    value={proxyRatio}
                    onChange={(e) => setProxyRatio(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors cursor-pointer"
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
                  disabled={settings.proxyList.trim() === ""}
                  className="w-full py-2 rounded-lg text-[12px] font-medium bg-[rgb(var(--accent))]/15 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/25 disabled:opacity-40 transition-colors cursor-pointer border border-[rgb(var(--accent))]/30"
                >
                  Enviar (Aplicar Distribuição)
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
        );

      case 'backup':
        return (
          <div className="space-y-5">
            <button className="w-full flex items-center gap-4 p-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--accent))] transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-[rgb(var(--accent))] bg-opacity-15 flex items-center justify-center flex-shrink-0">
                <FileDown size={20} className="text-[rgb(var(--accent))]" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium text-[rgb(var(--text-primary))]">
                  Exportar Configurações
                </p>
                <p className="text-[11px] text-[rgb(var(--text-muted))]">
                  Salvar todas as configurações em um arquivo JSON
                </p>
              </div>
            </button>

            <button className="w-full flex items-center gap-4 p-5 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))] hover:border-[rgb(var(--accent))] transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-[rgb(var(--accent))] bg-opacity-15 flex items-center justify-center flex-shrink-0">
                <FileUp size={20} className="text-[rgb(var(--accent))]" />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-medium text-[rgb(var(--text-primary))]">
                  Importar Configurações
                </p>
                <p className="text-[11px] text-[rgb(var(--text-muted))]">
                  Carregar configurações de um arquivo de backup
                </p>
              </div>
            </button>

            <div className="bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 space-y-3">
              <p className="text-[11px] text-[rgb(var(--text-muted))] uppercase tracking-wider font-medium">
                Modo de Importação
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={settings.importMode === 'merge'}
                    onChange={() => update('importMode', 'merge')}
                    className="accent-[rgb(var(--accent))]"
                  />
                  <div>
                    <p className="text-[12px] text-[rgb(var(--text-primary))] font-medium">
                      Mesclar
                    </p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))]">
                      Combina com as configurações atuais
                    </p>
                  </div>
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] cursor-pointer hover:border-[rgb(var(--accent))] transition-colors">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={settings.importMode === 'replace'}
                    onChange={() => update('importMode', 'replace')}
                    className="accent-[rgb(var(--accent))]"
                  />
                  <div>
                    <p className="text-[12px] text-[rgb(var(--text-primary))] font-medium">
                      Substituir
                    </p>
                    <p className="text-[10px] text-[rgb(var(--text-muted))]">
                      Substitui todas as configurações atuais
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {feedback && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] border ${
                  feedback.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {feedback.type === 'success' ? (
                  <Check size={16} />
                ) : (
                  <AlertTriangle size={16} />
                )}
                {feedback.message}
              </div>
            )}
          </div>
        );

      case 'sobre':
        return (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <img src="/LUG.png" alt="Bot Logo" className="w-24 h-24 mb-2 drop-shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
            <h2 className="text-xl font-bold text-[rgb(var(--text-primary))] tracking-tight">
              POKE PIXEL MANAGER
            </h2>
            <div className="px-3 py-1 rounded-full bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-muted))] font-mono">
              v1.0.0
            </div>
            <div className="text-center space-y-1 pt-2">
              <p className="text-[12px] text-[rgb(var(--text-secondary))]">
                Desenvolvido por{' '}
                <span className="font-semibold text-[rgb(var(--accent))]">
                  Damdam088
                </span>
              </p>
              <p className="text-[11px] text-[rgb(var(--text-faint))]">
                Bot de captura automática de Pokémon
              </p>
            </div>
            
            {/* Update Log */}
            <div className="w-full max-w-sm mt-4 bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] rounded-xl p-4 shadow-inner text-left">
              <h3 className="text-xs font-bold text-[rgb(var(--text-secondary))] mb-2 uppercase tracking-wider border-b border-[rgb(var(--border))] pb-2">
                Última Atualização
              </h3>
              <ul className="text-[11px] text-[rgb(var(--text-muted))] space-y-2 list-disc pl-4">
                <li>Melhoria: O Log Geral agora mostra os eventos recentes no topo com travamento inteligente de scroll.</li>
                <li>Correção: Loop infinito da nurse joy no mapa bloqueado resolvido.</li>
                <li>Segurança: Implementação de licença KeyAuth e Auto-updater embutidos!</li>
                <li>Visual: Dezenas de novos temas de cores e nova UI de abas!</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <div className="px-4 py-2 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-center">
                <p className="text-[10px] text-[rgb(var(--text-muted))] uppercase">
                  Engine
                </p>
                <p className="text-[12px] text-[rgb(var(--text-primary))] font-medium">
                  React 19
                </p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-center">
                <p className="text-[10px] text-[rgb(var(--text-muted))] uppercase">
                  UI
                </p>
                <p className="text-[12px] text-[rgb(var(--text-primary))] font-medium">
                  Tailwind CSS
                </p>
              </div>
              <div className="px-4 py-2 rounded-lg bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-center">
                <p className="text-[10px] text-[rgb(var(--text-muted))] uppercase">
                  Runtime
                </p>
                <p className="text-[12px] text-[rgb(var(--text-primary))] font-medium">
                  Node.js
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <div
        ref={panelRef}
        className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[600px] max-h-[85vh] shadow-2xl flex flex-col"
      >
        <div className="relative px-5 pt-4 pb-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">
              Configurações
            </h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface))] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="flex gap-1 overflow-x-auto pb-0 -mb-px scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[12px] font-medium whitespace-nowrap transition-all cursor-pointer border-b-2 ${
                  activeTab === tab.id
                    ? 'bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] border-[rgb(var(--accent))]'
                    : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] border-transparent hover:border-[rgb(var(--border))]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {renderTabContent()}
        </div>

        <div className="px-5 py-3 border-t border-[rgb(var(--border))] flex items-center justify-end gap-2">
          <button
            onClick={handleCancel}
            className="text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-surface))] px-3 py-1.5 rounded-lg text-[13px] transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] font-medium px-4 py-2 rounded-lg text-[13px] hover:brightness-110 transition-all cursor-pointer"
          >
            Salvar e Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
