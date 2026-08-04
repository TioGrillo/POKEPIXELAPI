import { useState, useEffect, useCallback } from "react";
import { invoke } from "../../lib/ipc";
import { Store, Coins, ShoppingCart, RefreshCw, Package, Tag, Trash2, CheckSquare } from "lucide-react";
import { getItemIcon } from "../../lib/itemUtils";

interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  npcPrice: number;
  sell_price: number;
  quantity: number;
  rarity: string;
  type: string;
  can_sell: boolean;
}

interface Props {
  accountName: string;
  gold?: number;
}

const RARITY_COLORS: Record<string, string> = {
  "fraca": "text-gray-400",
  "comum": "text-white",
  "incomum": "text-green-400",
  "rara": "text-blue-400",
  "epica": "text-purple-400",
  "lendaria": "text-yellow-400",
};

const CATEGORY_FILTERS = ["Todos", "loot", "heal", "stone", "revive", "bait", "tool"];

export function MarkPanel({ accountName, gold }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selling, setSelling] = useState(false);
  const [catFilter, setCatFilter] = useState("Todos");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [totalSellGold, setTotalSellGold] = useState(0);
  const [lastSellResult, setLastSellResult] = useState<{ gained: number } | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<any>("bot:get-depot", accountName);
      const items: InventoryItem[] = (data?.inventory || data?.data || []).map((item: any) => ({
        id: String(item.id ?? item.item_id),
        name: item.name || "?",
        icon: item.icon || "",
        category: (item.category || item.type || "misc").toLowerCase(),
        npcPrice: item.npcPrice ?? item.price ?? item.sell_price ?? 0,
        sell_price: item.sell_price ?? item.npcPrice ?? 0,
        quantity: item.quantity ?? item.qty ?? 1,
        rarity: item.rarity || "comum",
        type: item.type || "misc",
        can_sell: item.can_sell !== false,
      }));
      setInventory(items);
    } catch (err) {
      console.error("MarkPanel fetch error:", err);
    }
    setLoading(false);
  }, [accountName]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  // Recalculate selected gold value
  useEffect(() => {
    const total = inventory
      .filter(i => selected.has(i.id))
      .reduce((sum, i) => sum + (i.sell_price || i.npcPrice) * i.quantity, 0);
    setTotalSellGold(total);
  }, [selected, inventory]);

  const filtered = inventory.filter(
    i => catFilter === "Todos" || i.category === catFilter
  );

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllLoot = () => {
    const ids = filtered.filter(i => i.can_sell).map(i => i.id);
    setSelected(new Set(ids));
  };

  const clearSelection = () => setSelected(new Set());

  const sellSelected = async () => {
    if (selected.size === 0) return;
    setSelling(true);
    try {
      const items = inventory
        .filter(i => selected.has(i.id))
        .map(i => ({ itemId: Number(i.id), qty: i.quantity }));
      await invoke("bot:sell-items", accountName, items);
      setLastSellResult({ gained: totalSellGold });
      setSelected(new Set());
      await fetchInventory();
    } catch (err) {
      console.error("Sell error:", err);
    }
    setSelling(false);
  };

  const sellByCategory = async (cat: string) => {
    setSelling(true);
    try {
      const items = inventory
        .filter(i => (cat === "all" || i.category === cat) && i.can_sell)
        .map(i => ({ itemId: Number(i.id), qty: i.quantity }));
      if (items.length === 0) { setSelling(false); return; }
      await invoke("bot:sell-items", accountName, items);
      await fetchInventory();
    } catch (err) {
      console.error("Sell category error:", err);
    }
    setSelling(false);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store size={18} className="text-[rgb(var(--accent))]" />
          <h2 className="text-[15px] font-bold text-[rgb(var(--text-primary))]">Mark — Loja de Itens</h2>
        </div>
        <div className="flex items-center gap-3">
          {gold !== undefined && (
            <div className="flex items-center gap-1 text-amber-400 font-semibold">
              <Coins size={14} />
              <span className="text-[13px]">{gold.toLocaleString()}g</span>
            </div>
          )}
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Last sell result */}
      {lastSellResult && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-[12px]">
          <Coins size={13} />
          Vendido! Ganhou +{lastSellResult.gained.toLocaleString()}g
        </div>
      )}

      {/* Quick sell buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => sellByCategory("loot")}
          disabled={selling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-amber-600/20 text-amber-400 border border-amber-600/30 hover:bg-amber-600/30 disabled:opacity-40 transition-colors"
        >
          <ShoppingCart size={12} /> Vender Todo Loot
        </button>
        <button
          onClick={() => sellByCategory("all")}
          disabled={selling}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 disabled:opacity-40 transition-colors"
        >
          <Trash2 size={12} /> Vender Tudo (Vendáveis)
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORY_FILTERS.map(cat => (
          <button
            key={cat}
            onClick={() => setCatFilter(cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors capitalize ${
              catFilter === cat
                ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))]"
                : "bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
            }`}
          >
            {cat === "Todos" ? "Todos" : cat}
          </button>
        ))}
      </div>

      {/* Selection toolbar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-[11px]">
          <button onClick={selectAllLoot} className="flex items-center gap-1 text-[rgb(var(--accent))] hover:brightness-110">
            <CheckSquare size={12} /> Selecionar Todos
          </button>
          <span className="text-[rgb(var(--text-faint))]">|</span>
          <button onClick={clearSelection} className="text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]">
            Limpar Seleção
          </button>
          {selected.size > 0 && (
            <>
              <span className="flex-1" />
              <span className="text-[rgb(var(--text-muted))]">{selected.size} selecionados</span>
              <span className="text-amber-400 font-medium">+{totalSellGold.toLocaleString()}g</span>
              <button
                onClick={sellSelected}
                disabled={selling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] font-medium hover:brightness-110 disabled:opacity-40 transition-all"
              >
                {selling ? <RefreshCw size={11} className="animate-spin" /> : <ShoppingCart size={11} />}
                Vender Selecionados
              </button>
            </>
          )}
        </div>
      )}

      {/* Item grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-[rgb(var(--text-muted))]">
          <RefreshCw size={20} className="animate-spin mb-2" />
          Carregando inventário...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[rgb(var(--text-muted))] italic">
          Nenhum item encontrado.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {filtered.map(item => {
            const isSelected = selected.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => item.can_sell && toggleItem(item.id)}
                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[rgb(var(--accent))]/10 border-[rgb(var(--accent))]/60 shadow-[0_0_8px_rgba(var(--accent),0.15)]"
                    : item.can_sell
                    ? "bg-[rgb(var(--bg-base))] border-[rgb(var(--border))] hover:border-[rgb(var(--text-faint))] hover:bg-[rgb(var(--bg-surface))]/50"
                    : "bg-[rgb(var(--bg-base))]/50 border-[rgb(var(--border))]/50 opacity-60 cursor-not-allowed"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[rgb(var(--accent))] flex items-center justify-center">
                    <span className="text-[8px] text-[rgb(var(--bg-deep))] font-bold">✓</span>
                  </div>
                )}
                <img
                  src={getItemIcon(item.name)}
                  alt={item.name}
                  className="w-8 h-8 object-contain shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">{item.name}</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className={`text-[9px] font-medium ${RARITY_COLORS[item.rarity] || "text-[rgb(var(--text-muted))]"}`}>
                      {item.rarity}
                    </span>
                    <span className="text-[9px] text-[rgb(var(--text-faint))]">×{item.quantity}</span>
                  </div>
                  {item.can_sell && (item.sell_price > 0 || item.npcPrice > 0) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Coins size={9} className="text-amber-400" />
                      <span className="text-[9px] text-amber-400">
                        {((item.sell_price || item.npcPrice) * item.quantity).toLocaleString()}g
                      </span>
                    </div>
                  )}
                  {!item.can_sell && (
                    <span className="text-[9px] text-[rgb(var(--text-faint))]">
                      <Tag size={8} className="inline mr-0.5" />não vendível
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
