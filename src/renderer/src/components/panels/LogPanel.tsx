// @ts-nocheck
import { useState, useEffect } from "react";
import { useBotStore } from "../../stores/botStore";
import { loadJSON } from "../../lib/dataLoader";
import { MultiLogView } from "./MultiLogView";
import { RecentCapturesSection, SignificantCapturesSection } from "./CaptureLogPanel";
import { ScrollText, Trophy } from "lucide-react";

export function LogPanel() {
  const { captures, significantCaptures } = useBotStore();
  const [dexMap, setDexMap] = useState<Record<string, number>>({});

  useEffect(() => {
    loadJSON<Record<string, number>>("slug_to_dex.json").then(setDexMap);
  }, []);

  return (
    <div className="p-4 flex flex-col h-full flex-1 w-full min-h-0 overflow-hidden gap-4">
      <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))] shrink-0"><ScrollText size={18} /> Log Simplificado</h1>
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-[2] min-h-0 min-w-0 h-full">
          <MultiLogView title="Acontecimentos" />
        </div>
        <div className="flex-1 min-h-0 min-w-0 h-full">
          <SignificantCapturesSection captures={significantCaptures.slice(0, 20)} dexMap={dexMap} />
        </div>
        <div className="flex-1 min-h-0 min-w-0 h-full">
          <RecentCapturesSection events={captures.slice(0, 20).map(c => ({ kind: "capture", data: c, time: c.timestamp }))} dexMap={dexMap} />
        </div>
      </div>
      <div className="shrink-0 max-h-[30%] overflow-y-auto min-h-0">
        <RankingTable />
      </div>
    </div>
  );
}

function RankingTable() {
  const { stats } = useBotStore();
  const ranked = Object.entries(stats)
    .map(([name, s]) => ({ name, kills: s.kills || 0, captures: s.captures || 0, shiny: s.shiny || 0, kph: s.kph || 0, gph: s.gph || 0 }))
    .sort((a, b) => b.kills - a.kills);
  if (ranked.length === 0) return null;

  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[rgb(var(--text-primary))]"><Trophy size={13} /> Ranking (por kills)</div>
      </div>
      <table className="w-full text-[11px]">
        <thead className="bg-[rgb(var(--bg-surface))]">
          <tr className="text-left text-[rgb(var(--text-muted))]">
            <th className="px-3 py-1.5 font-medium">#</th>
            <th className="px-3 py-1.5 font-medium">Conta</th>
            <th className="px-3 py-1.5 font-medium">Kills</th>
            <th className="px-3 py-1.5 font-medium">Kills/h</th>
            <th className="px-3 py-1.5 font-medium">Capturas</th>
            <th className="px-3 py-1.5 font-medium">Shiny</th>
            <th className="px-3 py-1.5 font-medium">Gold/h</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((r, i) => (
            <tr key={r.name} className="border-t border-[rgb(var(--border))]">
              <td className="px-3 py-1.5 text-[rgb(var(--text-muted))]">{i + 1}</td>
              <td className="px-3 py-1.5 text-[rgb(var(--text-primary))] font-medium">{r.name}</td>
              <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{r.kills}</td>
              <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{r.kph}</td>
              <td className="px-3 py-1.5 text-blue-400">{r.captures}</td>
              <td className="px-3 py-1.5 text-yellow-400">{r.shiny}</td>
              <td className="px-3 py-1.5 text-amber-400">{r.gph}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
