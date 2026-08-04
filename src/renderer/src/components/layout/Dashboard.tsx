import { useBotStore } from "../../stores/botStore";
import { formatUptime, formatNumber } from "../../lib/utils";
import type { AccountConfig } from "../../types";

interface DashboardProps {
  accounts: AccountConfig[];
}

export function Dashboard({ accounts }: DashboardProps) {
  const { stats } = useBotStore();

  const totalStats = Object.values(stats).reduce(
    (acc, s) => ({
      kills: acc.kills + (s.kills || 0),
      captures: acc.captures + (s.captures || 0),
      shiny: acc.shiny + (s.shiny || 0),
      xp: acc.xp + (s.xp || 0),
      gold: acc.gold + (s.gold || 0),
      kph: acc.kph + (s.kph || 0),
      gph: acc.gph + (s.gph || 0),
      xph: acc.xph + (s.xph || 0),
      passiveXp: acc.passiveXp + (s.passiveXp || 0),
    }),
    { kills: 0, captures: 0, shiny: 0, xp: 0, gold: 0, kph: 0, gph: 0, xph: 0, passiveXp: 0 }
  );

  const connectedCount = Object.values(stats).filter((s) => s.connected).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">Dashboard</h1>
        <span className="text-sm text-[rgb(var(--text-muted))]">
          {connectedCount}/{accounts.length} contas ativas
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Kills" value={formatNumber(totalStats.kills)} sub={`${formatNumber(totalStats.kph)}/h`} color="text-red-400" />
        <StatCard label="Capturas" value={formatNumber(totalStats.captures)} color="text-blue-400" />
        <StatCard label="Shiny" value={formatNumber(totalStats.shiny)} color="text-yellow-400" />
        <StatCard label="Ouro Total" value={formatNumber(totalStats.gold)} sub={`${formatNumber(totalStats.gph)}/h`} color="text-amber-400" />
        <StatCard label="XP Total" value={formatNumber(totalStats.xp)} sub={`${formatNumber(totalStats.xph)}/h`} color="text-purple-400" />
        <StatCard label="XP Soneca" value={formatNumber(totalStats.passiveXp)} color="text-indigo-400" />
        <StatCard label="Kills/h" value={formatNumber(totalStats.kph)} color="text-orange-400" />
        <StatCard label="Gold/h" value={formatNumber(totalStats.gph)} color="text-emerald-400" />
        <StatCard label="XP/h" value={formatNumber(totalStats.xph)} color="text-cyan-400" />
      </div>

      <div className="border border-[rgb(var(--border))] rounded-lg overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[rgb(var(--bg-surface))]">
            <tr className="text-left text-[rgb(var(--text-muted))]">
              <th className="px-4 py-2 font-medium">Conta</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Lv</th>
              <th className="px-4 py-2 font-medium">Hunt</th>
              <th className="px-4 py-2 font-medium">Kills</th>
              <th className="px-4 py-2 font-medium">Capturas</th>
              <th className="px-4 py-2 font-medium">Shiny</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const s = stats[acc.name];
              return (
                <tr key={acc.name} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-surface))]/50 transition-colors">
                  <td className="px-4 py-2 text-[rgb(var(--text-primary))]">{acc.name}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center gap-1 ${s?.connected ? "text-green-400" : "text-[rgb(var(--text-muted))]"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s?.connected ? "bg-green-400" : "bg-[rgb(var(--text-faint))]"}`} />
                      {s?.connected ? "Ativo" : "Parado"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[rgb(var(--text-secondary))]">{s?.heroLevel || "-"}</td>
                  <td className="px-4 py-2 text-[rgb(var(--text-secondary))]">{acc.hunt}</td>
                  <td className="px-4 py-2 text-[rgb(var(--text-secondary))]">{formatNumber(s?.kills || 0)}</td>
                  <td className="px-4 py-2 text-[rgb(var(--text-secondary))]">{formatNumber(s?.captures || 0)}</td>
                  <td className="px-4 py-2 text-yellow-400">{s?.shiny || 0}</td>
                </tr>
              );
            })}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">
                  Nenhuma conta configurada. Adicione uma conta no painel lateral.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-4">
      <div className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-[rgb(var(--text-muted))] mt-0.5">{sub}</div>}
    </div>
  );
}
