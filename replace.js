const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/components/panels/ControlPanel.tsx', 'utf8');

const replacement = `
      {mTab === "general" && (
        <GeneralInventoryView accounts={accounts} sel={sel} stats={stats} />
      )}
`;

code = code.replace(/\{mTab === "general" && \([\s\S]*?<\/div>\s*\)\}/, replacement.trim());

const generalInvComponent = `
function GeneralInventoryView({ accounts, sel, stats }: { accounts: AccountConfig[]; sel: Set<string>; stats: any }) {
  const [itemsMap, setItemsMap] = useState<Record<string, { id: number; name: string }>>({});
  
  useEffect(() => {
    loadJSON<any[]>("items_data.json").then((data) => {
      const map: Record<string, any> = {};
      data.forEach(i => map[i.name] = i);
      setItemsMap(map);
    });
  }, []);

  const aggregated: Record<string, { qty: number; gold: number }> = {};
  accounts.forEach(a => {
    if (sel.has(a.name) && stats[a.name]?.lootDrops) {
      for (const [name, d] of Object.entries(stats[a.name].lootDrops)) {
        if (!aggregated[name]) aggregated[name] = { qty: 0, gold: 0 };
        aggregated[name].qty += (d as any).qty;
        aggregated[name].gold += (d as any).gold;
      }
    }
  });

  const entries = Object.entries(aggregated).sort((a, b) => b[1].qty - a[1].qty);

  return (
    <div className="space-y-3">
      <div className="text-[11px] text-[rgb(var(--text-muted))]">Inventario agregado de {sel.size} conta(s) selecionada(s)</div>
      {entries.length === 0 ? (
        <div className="text-center py-8 text-[12px] text-[rgb(var(--text-faint))] italic">Nenhum item dropado nas contas selecionadas ainda.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto pr-1">
          {entries.map(([name, data]) => {
            const itemDef = itemsMap[name];
            return (
              <div key={name} className="flex items-center gap-2 p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))]">
                {itemDef ? (
                  <img src={\`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/\${itemDef.name.toLowerCase().replace(/\\s+/g, '-')}.png\`} alt={name} className="w-8 h-8 object-contain drop-shadow-sm" onError={(e) => (e.target as any).style.display = 'none'} />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center"><Package size={14} className="text-white/20"/></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate" title={name}>{name}</div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-[rgb(var(--text-secondary))]">{data.qty.toLocaleString()}x</span>
                    <span className="text-amber-400">{data.gold > 0 ? \`\${data.gold.toLocaleString()}g\` : ''}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
`;

if (!code.includes('GeneralInventoryView')) {
  code = code + '\n' + generalInvComponent;
}

// Add stats and sel as props to MarketTab if it doesn't have it
code = code.replace(/function MarketTab\(\{\s*accounts\s*\}\s*:\s*\{\s*accounts\s*:\s*AccountConfig\[\]\s*\}\)/, 'function MarketTab({ accounts, sel, stats }: { accounts: AccountConfig[], sel: Set<string>, stats: any })');
code = code.replace(/<MarketTab accounts=\{accounts\} \/>/, '<MarketTab accounts={accounts} sel={sel} stats={stats} />');

fs.writeFileSync('src/renderer/src/components/panels/ControlPanel.tsx', code);
console.log('ControlPanel updated with GeneralInventoryView');
