import { useState, useMemo, useRef, useEffect } from 'react';
import { ScrollText, Search } from 'lucide-react';

interface MultiLogViewProps {
  title?: string;
  logs: string[];
  onClear?: () => void;
}

export function getLogColor(line: string): string {
  if (/\[KILL\]|Kill #|Derrotou/i.test(line)) return 'text-red-400 font-medium';
  if (/\[SUCCESS\]|capturado com sucesso|CAPTURADO/i.test(line)) return 'text-green-400 font-medium';
  if (/\[NO_BALL\]|Sem pokébolas|Falta de pokébola/i.test(line)) return 'text-purple-400 font-medium';
  if (/\[CATCH\]|Lançando bola|Arremessando|Tentando capturar/i.test(line)) return 'text-orange-400 font-medium';
  if (/SHINY|🌟/i.test(line)) return 'text-yellow-400 font-bold';
  if (/Erro|Falha|❌|💀/i.test(line)) return 'text-red-500';
  if (/\[ONLINE\]|\[HUNT\]/i.test(line)) return 'text-cyan-400';
  return 'text-gray-400';
}

type LogLevel = 'all' | 'kill' | 'catch' | 'success' | 'error';

export default function MultiLogView({ title = 'Logs', logs, onClear }: MultiLogViewProps) {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState<LogLevel>('all');
  const bodyRef = useRef<HTMLDivElement>(null);

  const filteredLogs = useMemo(() => {
    let result = logs;

    if (level !== 'all') {
      result = result.filter((line) => {
        if (level === 'kill') return /\[KILL\]|Kill #|Derrotou/i.test(line);
        if (level === 'catch') return /\[CATCH\]|Lançando bola|Arremessando/i.test(line);
        if (level === 'success') return /\[SUCCESS\]|capturado com sucesso/i.test(line);
        if (level === 'error') return /Erro|Falha|❌|💀|\[NO_BALL\]/i.test(line);
        return true;
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((line) => line.toLowerCase().includes(q));
    }

    return result;
  }, [logs, search, level]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  const handleScroll = () => {
    if (bodyRef.current) {
      const { scrollTop } = bodyRef.current;
      const isAtTop = scrollTop < 10;
      setIsAutoScroll(isAtTop);
    }
  };

  useEffect(() => {
    if (isAutoScroll && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [filteredLogs, isAutoScroll]);
  return (
    <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl overflow-hidden flex flex-col h-full relative shadow-inner">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgb(var(--border))] bg-[rgb(var(--bg-surface))]">
        <div className="flex items-center gap-2">
          <ScrollText size={15} className="text-blue-400" />
          <span className="text-xs font-bold text-white">
            {title}
            <span className="text-[rgb(var(--text-muted))] ml-1.5 font-normal">({logs.length})</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar no log..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg px-2.5 py-1 pl-7 text-[11px] text-white placeholder:text-gray-500 outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LogLevel)}
            className="bg-[rgb(var(--bg-deep))] border border-[rgb(var(--border))] rounded-lg px-2.5 py-1 text-[11px] text-white outline-none focus:border-blue-500 cursor-pointer font-semibold"
          >
            <option value="all">Todos os Logs</option>
            <option value="kill">Kills (Vermelho)</option>
            <option value="catch">Bolas (Laranja)</option>
            <option value="success">Capturas (Verde)</option>
            <option value="error">Erros & Falta de Bola</option>
          </select>
          {onClear && (
            <button
              onClick={onClear}
              className="text-[11px] text-gray-400 hover:text-red-400 transition-colors px-2 py-1 font-semibold"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      <div ref={bodyRef} onScroll={handleScroll} className="flex-1 overflow-y-auto font-mono text-[11px] leading-5 p-3 relative min-h-0 space-y-0.5 bg-[#090d16]">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 italic p-2 text-xs">Nenhum log registrado ainda...</div>
        ) : (
          filteredLogs.map((line, i) => {
            const color = getLogColor(line);
            return (
              <div key={i} className={`font-mono text-[11px] tracking-wide select-text ${color}`}>
                {line}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
