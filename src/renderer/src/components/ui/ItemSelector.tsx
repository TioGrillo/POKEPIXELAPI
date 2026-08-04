import { useState, useMemo, useEffect } from "react";
import { X, Search } from "lucide-react";
import { loadJSON } from "../../lib/dataLoader";

interface ItemEntry {
  id: number;
  name: string;
  icon: string;
  category: string;
  rare: boolean;
  npcPrice: number;
}

interface Props {
  onSelect: (item: ItemEntry) => void;
  onClose: () => void;
  title?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  loot: "Loot",
  stone: "Pedras",
  heal: "Poções",
  revive: "Revive",
  clan: "Clã",
  tm: "TM Disk",
};

const CATEGORY_COLORS: Record<string, string> = {
  loot: "bg-amber-600/20 text-amber-400",
  stone: "bg-blue-600/20 text-blue-400",
  heal: "bg-green-600/20 text-green-400",
  revive: "bg-purple-600/20 text-purple-400",
  clan: "bg-red-600/20 text-red-400",
  tm: "bg-cyan-600/20 text-cyan-400",
};

export function ItemSelector({ onSelect, onClose, title = "Selecionar Item" }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [items, setItems] = useState<ItemEntry[]>([]);

  useEffect(() => {
    loadJSON<ItemEntry[]>("items_data.json").then((data) => {
      setItems(Array.isArray(data) ? data : []);
    });
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(items.map((i) => i.category))].filter(Boolean);
    return ["all", ...cats.sort()];
  }, [items]);

  const filtered = useMemo(() =>
    items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    [items, search, category]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-xl w-[700px] max-h-[80vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgb(var(--border))]">
          <h2 className="text-[15px] font-semibold text-[rgb(var(--text-primary))]">{title}</h2>
          <button onClick={onClose} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]">
            <X size={14} />
          </button>
        </div>

        {/* Search & filters */}
        <div className="px-5 pt-3 space-y-3">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar item..."
              className="w-full pl-8 pr-3 py-2 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[13px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))] transition-colors"
              autoFocus
            />
          </div>
          <div className="flex gap-2 flex-wrap pb-1">
            {categories.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  category === cat
                    ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))]"
                    : "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-secondary))]"
                }`}>
                {cat === "all" ? "Todos" : (CATEGORY_LABELS[cat] || cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-5 gap-2">
            {filtered.map((item) => (
              <button key={item.id} onClick={() => { onSelect(item); onClose(); }}
                className="flex flex-col items-center p-2 rounded-lg border border-[rgb(var(--border))] hover:border-[rgb(var(--accent))]/60 hover:bg-[rgb(var(--bg-surface))]/60 transition-all group">
                {item.icon ? (
                  <div className="w-10 h-10 flex items-center justify-center">
                    <img
                      src={item.icon} alt={item.name}
                      className="w-10 h-10 object-contain pixelated group-hover:scale-110 transition-transform"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded bg-[rgb(var(--bg-surface))] flex items-center justify-center text-[18px]">📦</div>
                )}
                <span className="text-[9px] text-[rgb(var(--text-primary))] mt-1 text-center leading-tight line-clamp-2 w-full">{item.name}</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {item.rare && <span className="text-[8px] text-yellow-400">⭐</span>}
                  {item.npcPrice > 0 && (
                    <span className="text-[8px] text-amber-400 font-mono">{item.npcPrice >= 1000 ? `${(item.npcPrice/1000).toFixed(1)}k` : item.npcPrice}g</span>
                  )}
                </div>
                <span className={`text-[8px] px-1 rounded mt-0.5 ${CATEGORY_COLORS[item.category] || "bg-gray-600/20 text-gray-400"}`}>
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
              </button>
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center text-[13px] text-[rgb(var(--text-muted))] py-8">Nenhum item encontrado</div>
          )}
        </div>

        <div className="px-5 py-2 border-t border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-faint))]">
          {filtered.length} itens · Preços via NPC
        </div>
      </div>
    </div>
  );
}
