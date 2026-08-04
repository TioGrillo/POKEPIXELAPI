import { useState } from 'react';
import { Settings, Zap, Play, Square, Wifi, ShoppingCart, Gift, Package, Trophy } from 'lucide-react';
import type { Account } from '../../types';
import { getLogColor } from './MultiLogView';

interface ControlPanelProps {
  accounts: Account[];
  onStartAccount: (id: string) => void;
  onStopAccount: (id: string) => void;
  logs: string[];
  onClearLogs?: () => void;
}

export function ControlPanel({
  accounts,
  onStartAccount,
  onStopAccount,
  logs,
  onClearLogs,
}: ControlPanelProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('acoes');

  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedAccounts(new Set(accounts.map((a) => a.id)));
  };

  const selectNone = () => {
    setSelectedAccounts(new Set());
  };

  const handleStartSelected = () => {
    Promise.all(Array.from(selectedAccounts).map((id) => onStartAccount(id)));
  };

  const handleStopSelected = () => {
    Array.from(selectedAccounts).forEach((id) => onStopAccount(id));
  };

  return (
    <div className="p-4 flex flex-col h-full flex-1 w-full min-h-0 gap-4 overflow-y-auto">
      <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]">
        <Settings className="h-5 w-5 text-[rgb(var(--accent))]" />
        Controle em Massa
      </h1>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-52 shrink-0 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium text-[rgb(var(--text-secondary))]">Contas</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))]">
              {selectedAccounts.size}/{accounts.length}
            </span>
          </div>

          <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden max-h-80 overflow-y-auto">
            {accounts.map((account) => (
              <div
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all border-l-2 ${
                  selectedAccounts.has(account.id)
                    ? 'border-l-[rgb(var(--accent))] bg-[rgb(var(--accent))]/8'
                    : 'border-l-transparent hover:bg-[rgb(var(--bg-surface))]/50'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    account.status !== 'idle'
                      ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                      : 'bg-[rgb(var(--text-faint))]'
                  }`}
                />
                <span className="flex-1 truncate text-[12px] font-medium text-[rgb(var(--text-primary))]">
                  {account.name ?? account.email}
                </span>
                <span className="text-[10px] text-[rgb(var(--text-muted))] tabular-nums">
                  Lv.{account.heroLevel ?? '?'}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="flex-1 text-[10px] font-medium bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-secondary))] py-1.5 rounded-md transition-colors"
            >
              Todas
            </button>
            <button
              onClick={selectNone}
              className="flex-1 text-[10px] font-medium bg-[rgb(var(--bg-surface))] hover:bg-[rgb(var(--bg-elevated))] text-[rgb(var(--text-secondary))] py-1.5 rounded-md transition-colors"
            >
              Nenhuma
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex gap-1 border-b border-[rgb(var(--border))]">
            <button
              onClick={() => setActiveTab('acoes')}
              className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-medium transition-colors border-b-2 ${
                activeTab === 'acoes'
                  ? 'text-[rgb(var(--accent))] border-[rgb(var(--accent))]'
                  : 'text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] border-transparent'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              Acoes Rapidas
            </button>
          </div>

          {activeTab === 'acoes' && (
            <div className="grid grid-cols-3 gap-2 pt-3">
              <button
                onClick={handleStartSelected}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-green-600 hover:bg-green-500 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                Iniciar Hunt
              </button>
              <button
                onClick={handleStopSelected}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-red-600 hover:bg-red-500 transition-colors"
              >
                <Square className="h-3.5 w-3.5" />
                Pausar Hunt
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-blue-600 hover:bg-blue-500 transition-colors"
              >
                <Wifi className="h-3.5 w-3.5" />
                Conectar
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-amber-600 hover:bg-amber-500 transition-colors"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Vender Loot
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                <Gift className="h-3.5 w-3.5" />
                Bonus Diario
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-cyan-600 hover:bg-cyan-500 transition-colors"
              >
                <Package className="h-3.5 w-3.5" />
                Coletar Gifts
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-yellow-600 hover:bg-yellow-500 transition-colors"
              >
                <Trophy className="h-3.5 w-3.5" />
                Battle Pass
              </button>
              <button
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium text-white bg-pink-600 hover:bg-pink-500 transition-colors"
              >
                <Gift className="h-3.5 w-3.5" />
                Resgatar Tudo
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-[120px] bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-[rgb(var(--text-muted))]">Logs</span>
          {onClearLogs && (
            <button
              onClick={onClearLogs}
              className="text-[10px] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))] transition-colors"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-[11px] space-y-0.5 p-2 bg-[#090d16] rounded-lg border border-[rgb(var(--border))]">
          {logs.length === 0 ? (
            <span className="text-gray-500 italic">Nenhum log ainda...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={`leading-relaxed ${getLogColor(log)}`}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
