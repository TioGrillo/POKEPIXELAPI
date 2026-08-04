import { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Layers,
  Play,
  Square,
  Search,
  ArrowUpDown,
  Wifi,
  WifiOff,
  Upload,
  Download,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import type { Account } from '../../types';
import { logout } from '../../lib/keyauth';

interface SidebarProps {
  accounts: Account[];
  selectedAccounts: string[];
  onSelectAccount: (id: string, e?: React.MouseEvent) => void;
  onSelectMultiple: (ids: string[]) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onOpenSettings: () => void;
  onImport: () => void;
  onExport: () => void;
  onStartAll: () => void;
  onStopAll: () => void;
  connectedCount: number;
}

export default function Sidebar({
  accounts,
  selectedAccounts,
  onSelectAccount,
  onSelectMultiple,
  onAdd,
  onRemove,
  onOpenSettings,
  onImport,
  onExport,
  onStartAll,
  onStopAll,
  connectedCount,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState('1.0.0');

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.invoke('system:app-version').then((v: string) => {
        setAppVersion(v);
      });
    }
  }, []);

  const filteredAccounts = useMemo(() => {
    const filtered = accounts.filter((a) =>
      (a.email || a.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    return filtered.sort((a, b) => {
      const nameA = (a.name || a.email || '').toLowerCase();
      const nameB = (b.name || b.email || '').toLowerCase();
      return sortAsc ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
  }, [accounts, searchQuery, sortAsc]);

  const isConnected = (status: string) => status === 'hunting' || status === 'online';

  return (
    <div className="w-56 bg-[rgb(var(--bg-base))] border-r border-[rgb(var(--border))] flex flex-col shrink-0">
      {/* Top section - Add buttons */}
      <div className="p-2 border-b border-[rgb(var(--border))]">
        <div className="flex gap-1">
          <button
            onClick={onAdd}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[12px] font-medium hover:brightness-110 transition-all"
          >
            <Plus size={14} />
            Adicionar
          </button>
          <button
            onClick={onAdd}
            className="flex-none flex items-center justify-center p-1.5 rounded-md bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))] transition-colors"
          >
            <Layers size={14} />
          </button>
        </div>
      </div>

      {/* Start/Stop buttons */}
      <div className="flex flex-col gap-1.5 p-2 border-b border-[rgb(var(--border))]">
        <button
          onClick={onStartAll}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
        >
          <Play size={12} />
          Iniciar Todas as Contas
        </button>
        <button
          onClick={onStopAll}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[11px] font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
        >
          <Square size={12} />
          Parar Todas as Contas
        </button>
      </div>

      {/* Accounts header */}
      <div className="px-3 pt-3 pb-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] font-semibold">
            CONTAS
          </span>
          <span className="text-[10px] text-green-400">
            {connectedCount} ativa(s)
          </span>
        </div>
      </div>

      {/* Search row */}
      <div className="px-2 pb-2 flex gap-1">
        <div className="relative flex-1">
          <Search
            size={12}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]"
          />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-6 pr-2 py-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
          />
        </div>
        <button
          onClick={() => setSortAsc(!sortAsc)}
          className="flex-none flex items-center justify-center p-1.5 rounded-md bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--border))] transition-colors"
          title={sortAsc ? 'A-Z' : 'Z-A'}
        >
          <ArrowUpDown size={12} />
        </button>
      </div>

      {/* Account list */}
      <div className="flex-1 overflow-y-auto">
        {filteredAccounts.map((account) => {
          const isSelected = selectedAccounts.includes(account.id);
          const handleRowClick = (e: React.MouseEvent) => {
            if (e.shiftKey && lastSelectedId) {
              const currentIndex = filteredAccounts.findIndex(a => a.id === account.id);
              const lastIndex = filteredAccounts.findIndex(a => a.id === lastSelectedId);
              if (currentIndex !== -1 && lastIndex !== -1) {
                const start = Math.min(currentIndex, lastIndex);
                const end = Math.max(currentIndex, lastIndex);
                const newSelection = new Set(selectedAccounts);
                for (let i = start; i <= end; i++) {
                  newSelection.add(filteredAccounts[i].id);
                }
                onSelectMultiple(Array.from(newSelection));
                return;
              }
            }
            setLastSelectedId(account.id);
            onSelectAccount(account.id, e);
          };

          return (
          <div
            key={account.id}
            onClick={handleRowClick}
            className={`group flex items-center gap-2 px-2.5 py-1.5 cursor-pointer transition-all border-l-2 select-none ${
              isSelected
                ? 'border-l-[rgb(var(--accent))] bg-[rgb(var(--accent))]/8'
                : 'border-l-transparent hover:bg-[rgb(var(--bg-surface))]/40'
            }`}
          >
            {isConnected(account.status) ? (
              <Wifi size={14} className="text-green-400 shrink-0" />
            ) : (
              <WifiOff size={14} className="text-[rgb(var(--text-faint))] shrink-0" />
            )}
            <span
              className={`flex-1 truncate text-[12px] font-medium ${
                isConnected(account.status)
                  ? 'text-green-400'
                  : 'text-[rgb(var(--text-secondary))]'
              }`}
            >
              {account.name || account.email}
            </span>
            {account.heroLevel !== undefined && (
              <span className="text-[10px] tabular-nums text-[rgb(var(--text-muted))]">
                Lv.{account.heroLevel}
              </span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(account.id);
              }}
              className="opacity-0 group-hover:opacity-100 flex-none p-0.5 rounded hover:bg-red-500/20 text-[rgb(var(--text-muted))] hover:text-red-400 transition-all"
              title="Remover"
            >
              <X size={12} />
            </button>
          </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="p-2 border-t border-[rgb(var(--border))] flex gap-1">
        <button
          onClick={onImport}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))] transition-colors"
          title="Importar"
        >
          <Upload size={12} />
          Importar
        </button>
        <button
          onClick={onExport}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))] transition-colors"
          title="Exportar"
        >
          <Download size={12} />
          Exportar
        </button>
        <button
          onClick={onOpenSettings}
          className="flex-none flex items-center justify-center p-1.5 rounded-md bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--border))] hover:text-[rgb(var(--text-primary))] transition-colors"
          title="Configurações"
        >
          <Settings size={14} />
        </button>
        <button
          onClick={logout}
          className="flex-none flex items-center justify-center p-1.5 rounded-md bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] hover:bg-red-500/20 hover:text-red-400 transition-colors"
          title="Sair"
        >
          <LogOut size={14} />
        </button>
      </div>

      {/* Version label */}
      <div className="px-3 pb-2 text-center text-[10px] text-[rgb(var(--text-faint))]">
        NovoBot v{appVersion}
      </div>
    </div>
  );
}
