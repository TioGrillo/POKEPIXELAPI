import { useState, useEffect } from 'react';
import { Swords, Star, Heart, CircleDot, BarChart3 } from 'lucide-react';
import type { Account } from '../../types';
import { HuntAnalyzerPanel } from './HuntAnalyzerPanel';

interface GlobalPanelProps {
  accounts: Account[];
  onSelectAccount: (id: string) => void;
}

export function GlobalPanel({ accounts, onSelectAccount }: GlobalPanelProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalEncounters = accounts.reduce((acc, a) => acc + (a.encounters ?? 0), 0);
  const totalShinies = accounts.reduce((acc, a) => acc + (a.shinies ?? 0), 0);
  const totalPotions = accounts.reduce((acc, a) => acc + (a.potionsUsed ?? 0), 0);
  const totalCaptures = accounts.reduce(
    (acc, a) => acc + Object.values(a.captureConfig).filter(Boolean).length,
    0
  );
  const connected = accounts.filter((a) => a.status !== 'idle').length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 h-full overflow-y-auto custom-scrollbar w-full">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]">
          <BarChart3 className="h-5 w-5 text-[rgb(var(--accent))]" />
          Painel Geral
        </h1>
        <span className="text-xs text-[rgb(var(--text-muted))]">
          {connected} conectada{connected !== 1 ? 's' : ''}
        </span>
      </div>

      <HuntAnalyzerPanel accounts={accounts} isGlobal={true} />

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))]/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[rgb(var(--text-muted))]">
            <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-400">
              <Swords className="h-3.5 w-3.5" />
            </div>
            Derrotados
          </div>
          <div className="mt-3 text-2xl font-black text-orange-400 tracking-tight">{totalEncounters}</div>
          <div className="mt-1 text-[11px] font-medium text-[rgb(var(--text-faint))]">monstros no total</div>
        </div>

        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))]/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[rgb(var(--text-muted))]">
            <div className="p-1.5 rounded-md bg-yellow-500/10 text-yellow-400">
              <Star className="h-3.5 w-3.5" />
            </div>
            Shiny
          </div>
          <div className="mt-3 text-2xl font-black text-yellow-400 tracking-tight">{totalShinies}</div>
          <div className="mt-1 text-[11px] font-medium text-[rgb(var(--text-faint))]">capturados / vistos</div>
        </div>

        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))]/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[rgb(var(--text-muted))]">
            <div className="p-1.5 rounded-md bg-green-500/10 text-green-400">
              <Heart className="h-3.5 w-3.5" />
            </div>
            Auto-Potion
          </div>
          <div className="mt-3 text-2xl font-black text-green-400 tracking-tight">{totalPotions}</div>
          <div className="mt-1 text-[11px] font-medium text-[rgb(var(--text-faint))]">poções consumidas</div>
        </div>

        <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))]/50 rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-[rgb(var(--text-muted))]">
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400">
              <CircleDot className="h-3.5 w-3.5" />
            </div>
            Capturas
          </div>
          <div className="mt-3 text-2xl font-black text-blue-400 tracking-tight">{totalCaptures}</div>
          <div className="mt-1 text-[11px] font-medium text-[rgb(var(--text-faint))]">regras ativas</div>
        </div>
      </div>

      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))]/50 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[rgb(var(--bg-surface))] border-b border-[rgb(var(--border))]/50">
              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Conta
              </th>
              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Status
              </th>
              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Lv
              </th>
              <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                HP
              </th>
              <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Kills
              </th>
              <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Kill/H
              </th>
              <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Doll/H
              </th>
              <th className="px-5 py-3 text-center text-[10px] uppercase tracking-wider font-bold text-[rgb(var(--text-muted))]">
                Auto-Potion
              </th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const hpPercent =
                account.heroMaxHp > 0
                  ? Math.round((account.heroHp / account.heroMaxHp) * 100)
                  : 0;
              
              const sStats = account.sessionStats;
              const durationSecs = sStats && account.status === 'hunting' 
                ? Math.max(0, now - sStats.startTime) / 1000 
                : 0;
              const hours = durationSecs > 0 ? Math.max(durationSecs, 60) / 3600 : 0;
              const killsPerHour = hours > 0 && sStats ? Math.round(sStats.encounters / hours) : 0;
              const dollPerHour = hours > 0 && sStats ? Math.round(sStats.moneyGained / hours) : 0;
              const totalKills = sStats?.encounters ?? 0;

              return (
                <tr
                  key={account.id}
                  className="border-b border-[rgb(var(--border))]/30 hover:bg-[rgb(var(--bg-surface))]/40 transition-colors cursor-pointer last:border-0"
                  onClick={() => onSelectAccount(account.id)}
                >
                  <td className="px-5 py-3.5 text-[13px] font-medium text-[rgb(var(--text-primary))]">
                    {account.name ?? account.email}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold tracking-wide ${
                      account.status === 'hunting'
                        ? 'bg-green-500/10 text-green-400'
                        : account.status === 'error'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        account.status === 'hunting' ? 'bg-green-400' : account.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
                      }`} />
                      {account.status === 'hunting' ? 'CAÇANDO' : account.status === 'error' ? 'ERRO' : 'OCIOSO'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[13px] text-[rgb(var(--text-secondary))] font-mono">
                    {account.heroLevel ?? '-'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${hpPercent > 50 ? 'bg-green-400' : hpPercent > 20 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.max(0, Math.min(100, hpPercent))}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-[rgb(var(--text-muted))] w-12">
                        {account.heroHp}/{account.heroMaxHp || 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center text-[13px] font-bold text-orange-400">
                    {totalKills}
                  </td>
                  <td className="px-5 py-3.5 text-center text-[13px] font-mono text-gray-300">
                    {killsPerHour}
                  </td>
                  <td className="px-5 py-3.5 text-center text-[13px] font-mono text-emerald-400">
                    ${dollPerHour}
                  </td>
                  <td className="px-5 py-3.5 text-center text-[13px] text-[rgb(var(--text-secondary))]">
                    {account.potionsUsed ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
