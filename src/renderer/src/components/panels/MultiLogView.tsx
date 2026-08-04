import { useState, useEffect, useRef } from "react";
import { useBotStore } from "../../stores/botStore";
import { Search, Filter, ScrollText, Trophy } from "lucide-react";

interface Props { title?: string; filterAccount?: string; }

export function MultiLogView({ title, filterAccount }: Props) {
  const { logs } = useBotStore();
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [pausedLogs, setPausedLogs] = useState<any[] | null>(null);

  const filtered = logs
    .filter((l) => {
      if (filterAccount && l.account !== filterAccount) return false;
      if (levelFilter !== "all" && l.level !== levelFilter) return false;
      if (search && !l.msg.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).slice(-500);

  const levels = ["all", "OK", "INFO", "WARN", "ERR", "KILL", "CATCH", "LVLUP", "SELL", "BUY"];

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 30; // 30px tolerance
    setAutoScroll(isAtBottom);
  };

  useEffect(() => {
    if (!autoScroll && pausedLogs === null) {
      setPausedLogs(filtered);
    } else if (autoScroll && pausedLogs !== null) {
      setPausedLogs(null);
    }
  }, [autoScroll]);

  useEffect(() => {
    setPausedLogs(null);
    setAutoScroll(true);
  }, [search, levelFilter]);

  const displayLogs = pausedLogs || filtered;

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLogs.length, autoScroll]);

  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden flex flex-col h-full relative">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[rgb(var(--border))]">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[rgb(var(--text-primary))]">
          <ScrollText size={13} /> {title || "Log"} ({filtered.length})
          {pausedLogs && <span className="text-[10px] text-amber-400 font-normal ml-2 bg-amber-400/10 px-1.5 py-0.5 rounded">Pausado (Rolagem)</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrar..."
              className="pl-6 pr-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] w-32" />
          </div>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
            className="px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] focus:outline-none focus:border-[rgb(var(--accent))]">
            {levels.map((l) => <option key={l} value={l}>{l === "all" ? "Todos" : l}</option>)}
          </select>
        </div>
      </div>
      <div 
        ref={scrollRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto font-mono text-[10px] leading-4 p-2 relative min-h-0"
      >
        {displayLogs.length === 0 && <div className="text-[rgb(var(--text-faint))] italic py-2">Nenhum log ainda...</div>}
        {displayLogs.map((log, i) => (
          <div key={i} className={`${getLogColor(log.level)} flex gap-2`}>
            <span className="text-[rgb(var(--text-faint))] shrink-0">{log.account}</span>
            <span className="flex-1">{log.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLogColor(level: string): string {
  switch (level) {
    case "OK": return "text-green-400";
    case "INFO": return "text-slate-400";
    case "WARN": return "text-yellow-400";
    case "ERR": return "text-red-400";
    case "KILL": return "text-rose-400";
    case "CATCH": return "text-blue-400";
    case "LVLUP": return "text-purple-400";
    case "SELL": return "text-amber-400";
    case "BUY": return "text-cyan-400";
    default: return "text-slate-400";
  }
}
