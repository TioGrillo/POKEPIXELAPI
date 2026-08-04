function MarketShopView({ accounts, sel, stats }: { accounts: AccountConfig[], sel: Set<string>, stats: any }) {
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});
  const [targetGold, setTargetGold] = useState<number>(0);
  const [buying, setBuying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchShop = useCallback(async () => {
    if (accounts.length === 0) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let data = null;
      // Try to get data from a selected account first
      const selectedNames = Array.from(sel);
      for (const name of selectedNames) {
         data = await invoke<any>("bot:get-shop", name);
         if (data) break;
      }
      // If still no data, try any account
      if (!data) {
        for (const acc of accounts) {
           if (selectedNames.includes(acc.name)) continue;
           data = await invoke<any>("bot:get-shop", acc.name);
           if (data) break;
        }
      }

      if (!data) {
        setShop(null);
        setErrorMsg("Bot parado ou erro ao obter loja (nenhuma das contas conectadas retornou dados).");
      } else {
        const normalized = {
          balls: (Array.isArray(data.balls) ? data.balls : []).map((b: any) => ({
            id: String(b.id), name: b.name || `Ball ${b.id}`, priceGold: b.priceGold ?? 0, catchRate: b.catchRate ?? 0
          })),
          items: (Array.isArray(data.items) ? data.items : []).map((i: any) => ({
            id: String(i.id), name: i.name || `Item ${i.id}`, priceGold: i.priceGold ?? i.price ?? 0, category: i.category || "item"
          })),
        };
        setShop(normalized);
        const initialQty: Record<string, number> = {};
        normalized.balls.forEach((b: any) => { initialQty[b.id] = 1; });
        normalized.items.forEach((i: any) => { initialQty[i.id] = 1; });
        setBuyQuantities(initialQty);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro: ${err.message || String(err)}`);
    }
    setLoading(false);
  }, [accounts, sel]);

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleMassBuy = async (itemId: string, basePrice: number, mode: "fixed" | "max" | "upToTarget") => {
    if (!shop || sel.size === 0 || basePrice <= 0) return;
    setBuying(true);
    const names = Array.from(sel);
    for (const accName of names) {
      const s = stats[accName];
      const accGold = s?.gold || 0;
      let qtyToBuy = 0;

      if (mode === "fixed") {
        const reqQty = buyQuantities[itemId] || 1;
        qtyToBuy = Math.min(reqQty, Math.floor(accGold / basePrice));
      } else if (mode === "max") {
        qtyToBuy = Math.floor(accGold / basePrice);
      } else if (mode === "upToTarget") {
        if (targetGold > 0) {
          const spendAmount = Math.min(accGold, targetGold);
          qtyToBuy = Math.floor(spendAmount / basePrice);
        }
      }

      if (qtyToBuy > 0) {
        try {
          await invoke("bot:buy-item", accName, Number(itemId), qtyToBuy);
        } catch (e) {
          console.error(`Erro ao comprar para ${accName}:`, e);
        }
      }
    }
    setBuying(false);
  };

  const allItems = [
    ...(shop?.balls || []).map((b: any) => ({ ...b, type: "ball" as const })),
    ...(shop?.items || []).map((i: any) => ({ ...i, type: "item" as const })),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[12px] font-semibold text-[rgb(var(--text-primary))]">Comprar para {sel.size} conta(s) selecionada(s)</h4>
        <button onClick={fetchShop} disabled={loading} className="p-1.5 rounded-md bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[rgb(var(--text-muted))] hover:text-[rgb(var(--text-primary))] disabled:opacity-40">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {shop && (
        <div className="bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))] rounded-lg p-3 flex items-center gap-4">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[rgb(var(--text-muted))]">Comprar ate:</span>
            <input type="number" min={0} value={targetGold} onChange={(e) => setTargetGold(Math.max(0, Number(e.target.value)))} className="w-20 px-2 py-1 rounded bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]" />
            <span className="text-[11px] text-[rgb(var(--text-muted))]">g de gasto</span>
          </div>
        </div>
      )}

      {shop && shop.balls && shop.balls.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[rgb(var(--text-primary))] mb-2"><CircleDot size={12} /> Pokebolas</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {shop.balls.map((ball: any) => {
              const qty = buyQuantities[ball.id] || 1;
              const totalCost = ball.priceGold * qty;
              return (
                <div key={ball.id} className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src={getItemIcon(ball.name)} alt="" className="w-5 h-5 object-contain" />
                      <span className="text-[11px] font-medium text-[rgb(var(--text-primary))]">{ball.name}</span>
                    </div>
                    <span className="text-[10px] text-amber-400">{ball.priceGold}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={qty} onChange={(e) => setBuyQuantities((prev) => ({ ...prev, [ball.id]: Math.max(1, Number(e.target.value)) }))} className="w-12 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]" />
                    <span className="text-[9px] text-[rgb(var(--text-muted))] w-14 text-right">{totalCost.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleMassBuy(ball.id, ball.priceGold, "fixed")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-green-600/20 text-green-400 text-[9px] font-medium hover:bg-green-600/30 disabled:opacity-40"><ShoppingCart size={9} /> Comprar</button>
                    <button onClick={() => handleMassBuy(ball.id, ball.priceGold, "max")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 text-blue-400 text-[9px] font-medium hover:bg-blue-600/30 disabled:opacity-40"><Zap size={9} /> Max</button>
                  </div>
                  {targetGold > 0 && (
                    <button onClick={() => handleMassBuy(ball.id, ball.priceGold, "upToTarget")} disabled={buying} className="w-full flex items-center justify-center gap-1 py-1 rounded bg-purple-600/20 text-purple-400 text-[9px] font-medium hover:bg-purple-600/30 disabled:opacity-40">Ate {targetGold.toLocaleString()}g</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shop && shop.items && shop.items.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[rgb(var(--text-primary))] mb-2"><Package size={12} /> Itens</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {shop.items.map((item: any) => {
              const qty = buyQuantities[item.id] || 1;
              const totalCost = item.priceGold * qty;
              return (
                <div key={item.id} className="bg-[rgb(var(--bg-base))] border border-[rgb(var(--border))] rounded-lg p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={getItemIcon(item.name)} alt="" className="w-5 h-5 object-contain shrink-0" />
                      <span className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">{item.name}</span>
                    </div>
                    <span className="text-[10px] text-amber-400 shrink-0">{item.priceGold}g</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input type="number" min={1} value={qty} onChange={(e) => setBuyQuantities((prev) => ({ ...prev, [item.id]: Math.max(1, Number(e.target.value)) }))} className="w-12 px-1 py-0.5 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[10px] text-[rgb(var(--text-primary))] text-center focus:outline-none focus:border-[rgb(var(--accent))]" />
                    <span className="text-[9px] text-[rgb(var(--text-muted))] w-14 text-right">{totalCost.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleMassBuy(item.id, item.priceGold, "fixed")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-green-600/20 text-green-400 text-[9px] font-medium hover:bg-green-600/30 disabled:opacity-40"><ShoppingCart size={9} /> Comprar</button>
                    <button onClick={() => handleMassBuy(item.id, item.priceGold, "max")} disabled={buying} className="flex-1 flex items-center justify-center gap-1 py-1 rounded bg-blue-600/20 text-blue-400 text-[9px] font-medium hover:bg-blue-600/30 disabled:opacity-40"><Zap size={9} /> Max</button>
                  </div>
                  {targetGold > 0 && (
                    <button onClick={() => handleMassBuy(item.id, item.priceGold, "upToTarget")} disabled={buying} className="w-full flex items-center justify-center gap-1 py-1 rounded bg-purple-600/20 text-purple-400 text-[9px] font-medium hover:bg-purple-600/30 disabled:opacity-40">Ate {targetGold.toLocaleString()}g</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {shop && allItems.length === 0 && !loading && (
        <div className="text-center py-6 text-[11px] text-[rgb(var(--text-muted))] italic">Nenhum item disponivel</div>
      )}
      {loading && <div className="text-center py-6 text-[11px] text-[rgb(var(--text-muted))]"><RefreshCw size={14} className="animate-spin mx-auto mb-1" /> Carregando loja...</div>}
      {!shop && !loading && (
        <div className="text-center py-6 text-[11px] text-[rgb(var(--text-muted))] italic">
          Falha ao carregar itens da loja.
          {errorMsg && <div className="text-red-400 mt-1">{errorMsg}</div>}
        </div>
      )}
    </div>
  );
}
