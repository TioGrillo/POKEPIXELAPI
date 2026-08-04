import { ScrollText } from 'lucide-react';
import MultiLogView from './MultiLogView';

interface LogPanelProps {
  logs: string[];
  onClear?: () => void;
}

export default function LogPanel({ logs, onClear }: LogPanelProps) {
  return (
    <div className="p-4 flex flex-col h-full flex-1 w-full min-h-0 overflow-hidden gap-4">
      <h1 className="text-lg font-bold text-white flex items-center gap-2">
        <ScrollText size={20} className="text-[rgb(var(--accent))]" />
        Log
      </h1>
      <div className="flex-1 min-h-0">
        <MultiLogView title="Logs" logs={logs} onClear={onClear} />
      </div>
    </div>
  );
}
