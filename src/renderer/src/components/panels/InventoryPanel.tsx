import { useState, useEffect, useCallback } from "react";
import { invoke } from "../../lib/ipc";
import { Package, Coins, ShoppingCart, Search, Filter, RefreshCw } from "lucide-react";
import { getItemIcon } from "../../lib/itemUtils";

interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  npcPrice: number;
  quantity: number;
}

interface Props {
  accountName: string;
  onRefresh?: () => void;
}

export function InventoryPanel({ accountName, onRefresh }: Props) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [selling, setSelling] = useState(false);

  const categories = ["all", "Loot", "Stone", "Heal", "Revive"];

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<{ inventory: InventoryItem[] }>("bot:get-depot", accountName);
      setInventory(data.inventory || []);
      const initialQty: Record<string, number> = {};
      (data.inventory || []).forEach((item) => {
        initialQty[item.id] = 1;
      });
      setSellQuantities(initialQty);
    } catch (err) {
      console.error("Failed to fetch inventory:", err);
      setInventory([]);
    }
    setLoading(false);
  }, [accountName]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const filtered = inventory.filter((item) => {
    const matchesCategory = categoryFilter === "all" || (item.category || "").toLowerCase() === categoryFilter.toLowerCase();
    const matchesSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || item.id === search;
    return matchesCategory && matchesSearch;
  });

  const totalGoldValue = filtered.reduce((sum, item) => sum + item.npcPrice * item.quantity, 0);

  const handleSellItem = async (item: InventoryItem) => {
    const qty = sellQuantities[item.id] || 1;
    if (qty < 1 || qty > item.quantity) return;
    setSelling(true);
    try {
      await invoke("bot:sell-items", accountName, [{ itemId: Number(item.id), qty }]);
      await fetchInventory();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to sell item:", err);
    }
    setSelling(false);
  };

  const handleSellAll = async () => {
    setSelling(true);
    try {
      const items = filtered.map((item) => ({ itemId: Number(item.id), qty: item.quantity }));
      await invoke("bot:sell-items", accountName, items);
      await fetchInventory();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to sell all items:", err);
    }
    setSelling(false);
  };

  const handleSellCategory = async (category: string) => {
    setSelling(true);
    try {
      const items = inventory
        .filter((item) => category === "all" || (item.category || "").toLowerCase() === category.toLowerCase())
        .map((item) => ({ itemId: Number(item.id), qty: item.quantity }));
      await invoke("bot:sell-items", accountName, items);
      await fetchInventory();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to sell category:", err);
    }
    setSelling(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]">
          <Package size={18} /> Inventario - {accountName}
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-amber-400">
            <Coins size={14} />
            <span className="text-sm font-semibold">{totalGoldValue.toLocaleString()}g</span>
          </div>
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-faint))]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar item..."
            className="w-full pl-7 pr-2 py-1.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] placeholder-[rgb(var(--text-faint))] focus:outline-none focus:border-[rgb(var(--accent))]"
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              categoryFilter === cat
                ? "bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))]"
                : "bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))]"
            }`}
          >
            <Filter size={10} />
            {cat === "all" ? "Todos" : cat}
            {cat !== "all" && (
              <span className="ml-0.5 opacity-70">
                {inventory.filter((i) => (i.category || "").toLowerCase() === cat.toLowerCase()).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg overflow-hidden">
        <table className="w-full text-[12px]">
          <thead className="bg-[rgb(var(--bg-surface))]">
            <tr className="text-left text-[rgb(var(--text-muted))]">
              <th className="px-3 py-1.5 font-medium">Icone</th>
              <th className="px-3 py-1.5 font-medium">Nome</th>
              <th className="px-3 py-1.5 font-medium">Categoria</th>
              <th className="px-3 py-1.5 font-medium">Qtd</th>
              <th className="px-3 py-1.5 font-medium">Preco NPC</th>
              <th className="px-3 py-1.5 font-medium">Vender</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t border-[rgb(var(--border))] hover:bg-[rgb(var(--bg-surface))]/30 transition-colors">
                <td className="px-3 py-1.5">
                  <img src={getItemIcon(item.name)} alt={item.name} className="w-5 h-5 object-contain"
                       onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </td>
                <td className="px-3 py-1.5 text-[rgb(var(--text-primary))]">{item.name}</td>
                <td className="px-3 py-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    item.category === "Loot" ? "bg-orange-500/20 text-orange-400" :
                    item.category === "Stone" ? "bg-purple-500/20 text-purple-400" :
                    item.category === "Heal" ? "bg-green-500/20 text-green-400" :
                    item.category === "Revive" ? "bg-blue-500/20 text-blue-400" :
                    "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))]"
                  }`}>
                    {item.category || "-"}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-[rgb(var(--text-secondary))]">{item.quantity}</td>
                <td className="px-3 py-1.5 text-amber-400">{item.npcPrice}g</td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={sellQuantities[item.id] || 1}
                      onChange={(e) =>
                        setSellQuantities((prev) => ({
                          ...prev,
                          [item.id]: Math.min(Math.max(1, Number(e.target.value)), item.quantity),
                        }))
                      }
                      className="w-14 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]"
                    />
                    <button
                      onClick={() => handleSellItem(item)}
                      disabled={selling}
                      className="px-2 py-0.5 rounded bg-amber-600/20 text-amber-400 text-[10px] font-medium hover:bg-amber-600/30 disabled:opacity-40 transition-colors"
                    >
                      Vender
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[rgb(var(--text-muted))] italic">
                  {loading ? "Carregando inventario..." : "Nenhum item encontrado"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-[rgb(var(--text-muted))]">
            {filtered.length} item(ns) | Total: <span className="text-amber-400 font-semibold">{totalGoldValue.toLocaleString()}g</span>
          </div>
          <button
            onClick={handleSellAll}
            disabled={selling}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 text-white text-[12px] font-medium hover:bg-red-500 disabled:opacity-40 transition-colors"
          >
            <ShoppingCart size={12} />
            Vender Tudo
          </button>
        </div>
      )}

      <div className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3">
        <div className="text-[11px] uppercase tracking-wider text-[rgb(var(--text-muted))] mb-2 font-semibold">Vender por Categoria</div>
        <div className="flex gap-2 flex-wrap">
          {categories.filter((c) => c !== "all").map((cat) => {
            const catItems = inventory.filter((i) => (i.category || "").toLowerCase() === cat.toLowerCase());
            const catValue = catItems.reduce((sum, i) => sum + i.npcPrice * i.quantity, 0);
            if (catItems.length === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => handleSellCategory(cat)}
                disabled={selling}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))] text-[11px] font-medium text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-surface))]/50 disabled:opacity-40 transition-colors"
              >
                {cat} ({catItems.length}) - {catValue.toLocaleString()}g
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
