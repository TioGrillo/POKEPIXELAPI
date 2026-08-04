import { send } from "../../lib/ipc";
import { Minus, Square, X } from "lucide-react";
import logoSrc from "../../assets/logo.png";

export function Titlebar() {
  return (
    <div className="flex items-center h-9 bg-[rgb(var(--bg-base))] border-b border-[rgb(var(--border))] select-none shrink-0 [-webkit-app-region:drag]">
      <div className="flex items-center gap-2 px-3 flex-1">
        <img src={logoSrc} alt="Logo" className="w-4 h-4 object-contain" />
        <span className="text-[13px] font-bold text-[rgb(var(--accent))] tracking-wide">POKE IDLE BOT</span>
        <span className="text-[10px] text-[rgb(var(--text-faint))]">by Damdam088</span>
      </div>
      <div className="flex h-full [-webkit-app-region:no-drag]">
        <button onClick={() => send("window:minimize")} className="px-3 h-full hover:bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] transition-colors">
          <Minus size={12} />
        </button>
        <button onClick={() => send("window:maximize-toggle")} className="px-3 h-full hover:bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-secondary))] transition-colors">
          <Square size={10} />
        </button>
        <button onClick={() => send("window:close")} className="px-3 h-full hover:bg-red-600 text-[rgb(var(--text-secondary))] hover:text-white transition-colors">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}
