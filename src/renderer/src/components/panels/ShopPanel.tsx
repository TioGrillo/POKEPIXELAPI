import { useState, useEffect, useCallback } from "react";
import { invoke } from "../../lib/ipc";
import { Store, Coins, ShoppingCart, RefreshCw, CircleDot, Package, Zap } from "lucide-react";
import { getItemIcon } from "../../lib/itemUtils";

interface Ball {
  id: string;
  name: string;
  priceGold: number;
  catchRate: number;
}

interface ShopItem {
  id: string;
  name: string;
  priceGold: number;
  category: string;
}

interface ShopData {
  gold: number;
  balls: Ball[];
  items: ShopItem[];
}

interface Props {
  accountName: string;
  onRefresh?: () => void;
}

export function ShopPanel({ accountName, onRefresh }: Props) {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loading, setLoading] = useState(false);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [buying, setBuying] = useState(false);
  const [targetGold, setTargetGold] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await invoke<any>("bot:get-shop", accountName);
      if (!data) { 
        setShop(null); 
        setErrorMsg("Bot parado ou erro ao obter dados (API retornou nulo).");
        setLoading(false); 
        return; 
      }
      const normalized: ShopData = {
        gold: data.gold ?? 0,
        balls: (Array.isArray(data.balls) ? data.balls : []).map((b: any) => ({ 
          id: String(b.id), name: b.name || `Ball ${b.id}`, priceGold: b.priceGold ?? 0, catchRate: b.catchRate ?? 0 
        })),
        items: (Array.isArray(data.items) ? data.items : []).map((i: any) => ({ 
          id: String(i.id), name: i.name || `Item ${i.id}`, priceGold: i.priceGold ?? i.price ?? 0, category: i.category || "item" 
        })),
      };
      setShop(normalized);
      const initialQty: Record<string, number> = {};
      normalized.balls.forEach((b) => { initialQty[b.id] = 1; });
      normalized.items.forEach((i) => { initialQty[i.id] = 1; });
      setBuyQuantities(initialQty);
    } catch (err: any) {
      console.error("fetchShop error", err);
      setErrorMsg(`Erro de código: ${err.message || String(err)}`);
      setShop(null);
    }
    setLoading(false);
  }, [accountName]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleBuy = async (itemId: string, qty: number) => {
    if (qty < 1 || !shop) return;
    setBuying(true);
    try {
      await invoke("bot:buy-item", accountName, String(itemId), qty);
      await fetchShop();
      onRefresh?.();
    } catch (err) {
      console.error("Failed to buy item:", err);
    }
    setBuying(false);
  };

  const handleBuyMax = async (itemId: string, price: number) => {
    if (!shop || price <= 0) return;
    const maxQty = Math.floor(shop.gold / price);
    if (maxQty < 1) return;
    await handleBuy(itemId, maxQty);
  };

  const handleBuyUpToGold = async (itemId: string, price: number) => {
    if (!shop || price <= 0 || targetGold < 0) return;
    const spendable = shop.gold - targetGold;
    if (spendable < price) return;
    const qty = Math.floor(spendable / price);
    if (qty < 1) return;
    await handleBuy(itemId, qty);
  };

  const allItems = [
    ...(shop?.balls || []).map((b) => ({ ...b, type: "ball" as const })),
    ...(shop?.items || []).map((i) => ({ ...i, type: "item" as const })),
  ];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-bold text-[rgb(var(--text-primary))]">
          <Store size={18} /> Loja - {accountName}
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-400">
            <Coins size={16} />
            <span className="text-base font-bold">{(shop?.gold || 0).toLocaleString()}g</span>
          </div>
          <button
            onClick={fetchShop}
            disabled={loading}
            className="p-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {shop && (
        <div className="bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))] rounded-lg p-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[12px] text-[rgb(var(--text-muted))]">
            <Coins size={13} className="text-amber-400" />
            Ouro disponivel:
            <span className="font-bold text-amber-400">{shop.gold.toLocaleString()}g</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[rgb(var(--text-muted))]">Comprar ate:</span>
            <input
              type="number"
              min={0}
              value={targetGold}
              onChange={(e) => setTargetGold(Math.max(0, Number(e.target.value)))}
              className="w-20 px-2 py-1 rounded bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]"
            />
            <span className="text-[11px] text-[rgb(var(--text-muted))]">g restante</span>
          </div>
        </div>
      )}

      {shop && shop.balls && shop.balls.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))] mb-2">
            <CircleDot size={14} /> Pokebolas
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {shop.balls.map((ball) => {
              const qty = buyQuantities[ball.id] || 1;
              const totalCost = ball.priceGold * qty;
              const maxAffordable = Math.floor((shop?.gold || 0) / ball.priceGold);
              return (
                <div key={ball.id} className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={getItemIcon(ball.name)} alt="" className="w-6 h-6 object-contain" />
                      <span className="text-[12px] font-medium text-[rgb(var(--text-primary))]">{ball.name}</span>
                    </div>
                    <span className="text-[11px] text-amber-400">{ball.priceGold}g</span>
                  </div>
                  <div className="text-[10px] text-[rgb(var(--text-muted))]">
                    Catch Rate: <span className="text-green-400">{ball.catchRate}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) =>
                        setBuyQuantities((prev) => ({ ...prev, [ball.id]: Math.max(1, Number(e.target.value)) }))
                      }
                      className="w-14 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]"
                    />
                    <span className="text-[10px] text-[rgb(var(--text-muted))] w-16 text-right">{totalCost.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleBuy(ball.id, qty)}
                      disabled={buying || totalCost > (shop?.gold || 0)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-green-600/20 text-green-400 text-[10px] font-medium hover:bg-green-600/30 disabled:opacity-40 transition-colors"
                    >
                      <ShoppingCart size={10} /> Comprar
                    </button>
                    <button
                      onClick={() => handleBuyMax(ball.id, ball.priceGold)}
                      disabled={buying || maxAffordable < 1}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 text-blue-400 text-[10px] font-medium hover:bg-blue-600/30 disabled:opacity-40 transition-colors"
                    >
                      <Zap size={10} /> Max
                    </button>
                  </div>
                  {targetGold > 0 && (
                    <button
                      onClick={() => handleBuyUpToGold(ball.id, ball.priceGold)}
                      disabled={buying || (shop?.gold || 0) - targetGold < ball.priceGold}
                      className="w-full flex items-center justify-center gap-1 py-1 rounded bg-purple-600/20 text-purple-400 text-[10px] font-medium hover:bg-purple-600/30 disabled:opacity-40 transition-colors"
                    >
                      Ate {targetGold.toLocaleString()}g
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shop && shop.items && shop.items.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[rgb(var(--text-primary))] mb-2">
            <Package size={14} /> Itens
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {shop.items.map((item) => {
              const qty = buyQuantities[item.id] || 1;
              const totalCost = item.priceGold * qty;
              const maxAffordable = Math.floor((shop?.gold || 0) / item.priceGold);
              return (
                <div key={item.id} className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={getItemIcon(item.name)} alt="" className="w-6 h-6 object-contain shrink-0" />
                      <span className="text-[12px] font-medium text-[rgb(var(--text-primary))] truncate">{item.name}</span>
                    </div>
                    <span className="text-[11px] text-amber-400 shrink-0">{item.priceGold}g</span>
                  </div>
                  <div className="text-[10px] text-[rgb(var(--text-muted))]">
                    <span className={`px-1.5 py-0.5 rounded ${
                      item.category === "Heal" ? "bg-green-500/20 text-green-400" :
                      item.category === "Revive" ? "bg-blue-500/20 text-blue-400" :
                      item.category === "Stone" ? "bg-purple-500/20 text-purple-400" :
                      "bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-muted))]"
                    }`}>
                      {item.category || "Geral"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      value={qty}
                      onChange={(e) =>
                        setBuyQuantities((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value)) }))
                      }
                      className="w-14 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[11px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]"
                    />
                    <span className="text-[10px] text-[rgb(var(--text-muted))] w-16 text-right">{totalCost.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleBuy(item.id, qty)}
                      disabled={buying || totalCost > (shop?.gold || 0)}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-green-600/20 text-green-400 text-[10px] font-medium hover:bg-green-600/30 disabled:opacity-40 transition-colors"
                    >
                      <ShoppingCart size={10} /> Comprar
                    </button>
                    <button
                      onClick={() => handleBuyMax(item.id, item.priceGold)}
                      disabled={buying || maxAffordable < 1}
                      className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 text-blue-400 text-[10px] font-medium hover:bg-blue-600/30 disabled:opacity-40 transition-colors"
                    >
                      <Zap size={10} /> Max
                    </button>
                  </div>
                  {targetGold > 0 && (
                    <button
                      onClick={() => handleBuyUpToGold(item.id, item.priceGold)}
                      disabled={buying || (shop?.gold || 0) - targetGold < item.priceGold}
                      className="w-full flex items-center justify-center gap-1 py-1 rounded bg-purple-600/20 text-purple-400 text-[10px] font-medium hover:bg-purple-600/30 disabled:opacity-40 transition-colors"
                    >
                      Ate {targetGold.toLocaleString()}g
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shop && allItems.length === 0 && !loading && (
        <div className="text-center py-12 text-[rgb(var(--text-muted))] italic">
          Nenhum item disponivel na loja
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-[rgb(var(--text-muted))]">
          <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
          Carregando loja...
        </div>
      )}

      {!shop && !loading && (
        <div className="text-center py-12 text-[rgb(var(--text-muted))] italic">
          Falha ao carregar loja. Clique para tentar novamente.
          {errorMsg && <div className="mt-2 text-red-400 text-[11px] not-italic">{errorMsg}</div>}
          <br />
          <button onClick={fetchShop} className="mt-2 px-4 py-1.5 rounded-lg bg-[rgb(var(--accent))] text-[rgb(var(--bg-deep))] text-[12px] font-medium hover:brightness-110 transition-colors">
            <RefreshCw size={12} className="inline mr-1" /> Tentar Novamente
          </button>
        </div>
      )}
    </div>
  );
}
