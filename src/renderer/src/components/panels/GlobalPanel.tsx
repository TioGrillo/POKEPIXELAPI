import { useBotStore } from "../../stores/botStore";
import { formatUptime, formatNumber } from "../../lib/utils";
import type { AccountConfig } from "../../types";
import { MultiLogView } from "./MultiLogView";
import { BarChart3, CircleDot, Star, Trophy, Zap, Clock, Wifi, WifiOff, Swords, Coins } from "lucide-react";

interface Props { accounts: AccountConfig[]; }

export function GlobalPanel({ accounts }: Props) {
  const { stats } = useBotStore();

  const total = Object.values(stats).reduce((a, s) => ({
    kills: a.kills + (s.kills || 0), captures: a.captures + (s.captures || 0),
    shiny: a.shiny + (s.shiny || 0), xp: a.xp + (s.xp || 0), gold: a.gold + (s.gold || 0),
    kph: a.kph + (s.kph || 0), gph: a.gph + (s.gph || 0), xph: a.xph + (s.xph || 0), passiveXp: a.passiveXp + (s.passiveXp || 0),
  }), { kills: 0, captures: 0, shiny: 0, xp: 0, gold: 0, kph: 0, gph: 0, xph: 0, passiveXp: 0 });

  const connectedCount = Object.values(stats).filter((s) => s.connected).length;

  return (
    <div className="p-4 space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]"><BarChart3 size={18} /> Painel Geral</h1>
        <span className="text-[12px] text-[rgb(var(--text-muted))]">{connectedCount}/{accounts.length} contas ativas</span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <Card icon={<Swords size={14} />} label="Derrotados" value={formatNumber(total.kills)} sub={`${formatNumber(total.kph)}/h`} color="text-orange-400" />
        <Card icon={<CircleDot size={14} />} label="Capturados" value={formatNumber(total.captures)} color="text-blue-400" />
        <Card icon={<Star size={14} />} label="Shiny" value={String(total.shiny)} color="text-yellow-400" />
        <Card icon={<Coins size={14} />} label="Ouro Total" value={formatNumber(total.gold)} sub={`${formatNumber(total.gph)}/h`} color="text-amber-400" />
        <Card icon={<Zap size={14} />} label="XP Total" value={formatNumber(total.xp)} sub={`${formatNumber(total.xph)}/h`} color="text-purple-400" />
        <Card icon={<Swords size={14} />} label="Kills/h" value={formatNumber(total.kph)} color="text-red-400" />
        <Card icon={<Coins size={14} />} label="Gold/h (Total)" value={formatNumber(total.gph)} sub={connectedCount > 0 ? `Média: ${formatNumber(Math.round(total.gph / connectedCount))}/h` : "Média: 0/h"} color="text-emerald-400" />
        <Card icon={<Zap size={14} />} label="XP/h (Total)" value={formatNumber(total.xph)} sub={connectedCount > 0 ? `Média: ${formatNumber(Math.round(total.xph / connectedCount))}/h` : "Média: 0/h"} color="text-cyan-400" />
        <Card icon={<Zap size={14} />} label="XP Soneca Total" value={formatNumber(total.passiveXp)} color="text-indigo-400" />
      </div>

      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-[rgb(var(--bg-surface))]">
            <tr className="text-left text-[rgb(var(--text-muted))]">
              <th className="px-3 py-1.5 font-medium">Conta</th>
              <th className="px-3 py-1.5 font-medium">Status</th>
              <th className="px-3 py-1.5 font-medium">Lv</th>
              <th className="px-3 py-1.5 font-medium">Hunt</th>
              <th className="px-3 py-1.5 font-medium">HP</th>
              <th className="px-3 py-1.5 font-medium">Kills</th>
              <th className="px-3 py-1.5 font-medium">Capturas</th>
              <th className="px-3 py-1.5 font-medium">Shiny</th>
              <th className="px-3 py-1.5 font-medium">Gold</th>
              <th className="px-3 py-1.5 font-medium">Uptime</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((acc) => {
              const s = stats[acc.name];
              return (
                <tr key={acc.name} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-surface))]/30 transition-colors">
                  <td className="px-3 py-1.5 text-[rgb(var(--text-primary))] font-medium">{acc.name}</td>
                  <td className="px-3 py-1.5">
                    <span className={`inline-flex items-center gap-1 ${s?.connected ? "text-green-400" : "text-[rgb(var(--text-muted))]"}`}>
                      {s?.connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {s?.connected ? (s.inHunt ? "Hunt" : "Conectado") : "Parado"}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{s?.heroLevel || "-"}</td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))] capitalize">{s?.huntSlug || acc.hunt || "-"}</td>
                  <td className="px-3 py-1.5">
                    {s ? (
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 rounded-full bg-[rgb(var(--bg-elevated))] overflow-hidden">
                          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${s.heroMaxHp ? Math.round((s.heroHp / s.heroMaxHp) * 100) : 0}%` }} />
                        </div>
                        <span className="text-[10px] text-[rgb(var(--text-muted))]">{s.heroHp}/{s.heroMaxHp}</span>
                      </div>
                    ) : "-"}
                  </td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{formatNumber(s?.kills || 0)}</td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{formatNumber(s?.captures || 0)}</td>
                  <td className="px-3 py-1.5 text-yellow-400">{s?.shiny || 0}</td>
                  <td className="px-3 py-1.5 text-amber-400">{formatNumber(s?.gold || 0)}</td>
                  <td className="px-3 py-1.5 text-[rgb(var(--text-muted))]">{formatUptime(s?.uptime || 0)}</td>
                </tr>
              );
            })}
            {accounts.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-[rgb(var(--text-muted))]">Nenhuma conta configurada.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="h-[60vh] min-h-[400px] shrink-0 mt-6">
        <MultiLogView title="Log Unificado" />
      </div>
    </div>
  );
}

function Card({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-1">{icon}{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[rgb(var(--text-muted))] mt-0.5">{sub}</div>}
    </div>
  );
}
