const fs = require('fs');

let code = fs.readFileSync('src/renderer/src/components/layout/AccountPage.tsx', 'utf8');

const newComponents = `
function TeamSection({ name, team }: { name: string; team: any[] }) {
  const handleStore = async (id: string) => {
    await invoke("bot:equip-pokemon", name, "", "min_score", 99999); // Trick to store leader by not finding a match
  };
  return (
    <div className="space-y-2">
      <div className="text-[11px] text-[rgb(var(--text-muted))]">Pokemons Ativos</div>
      {team.length === 0 ? <div className="text-[11px] text-[rgb(var(--text-faint))]">Nenhum pokemon na equipe.</div> : (
        <div className="grid grid-cols-2 gap-2">
          {team.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))]">
              <div className="flex items-center gap-2">
                <img src={\`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/\${p.dex || 0}.png\`} alt={p.species} className="w-8 h-8 object-contain" onError={(e) => (e.target as any).style.display = 'none'} />
                <div>
                  <div className="text-[12px] font-medium text-[rgb(var(--text-primary))]">{p.species}</div>
                  <div className="text-[10px] text-[rgb(var(--text-muted))]">Score: {p.score || 0} | Lvl: {p.level || 0}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PokemonBoxSection({ name }: { name: string }) {
  const [pokemons, setPokemons] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await invoke<any[]>("bot:get-pokemons", name);
    setPokemons((data || []).filter(p => !p.leader));
    setLoading(false);
  };

  useEffect(() => { load(); }, [name]);

  const sellByScore = async (maxScore: number) => {
    const toSell = pokemons.filter(p => (p.score || 0) <= maxScore).map(p => p.id);
    if (toSell.length === 0 || !confirm(\`Vender \${toSell.length} Pokemons?\`)) return;
    await invoke("bot:sell-pokemon", name, toSell);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] text-[11px] font-medium hover:brightness-110 disabled:opacity-40">{loading ? 'Carregando...' : 'Recarregar Box'}</button>
        <button onClick={() => sellByScore(100)} className="px-3 py-1.5 rounded bg-amber-600 text-white text-[11px] font-medium hover:brightness-110">Vender (Score <= 100)</button>
        <button onClick={() => sellByScore(150)} className="px-3 py-1.5 rounded bg-amber-600 text-white text-[11px] font-medium hover:brightness-110">Vender (Score <= 150)</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
        {pokemons.map(p => (
          <div key={p.id} className="flex items-center gap-2 p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))]">
            <img src={\`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/\${p.dex || 0}.png\`} alt={p.species} className="w-8 h-8 object-contain" onError={(e) => (e.target as any).style.display = 'none'} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">{p.species}</div>
              <div className="text-[10px] text-[rgb(var(--text-muted))]">Score: {p.score || 0}</div>
            </div>
          </div>
        ))}
        {pokemons.length === 0 && !loading && <div className="text-[11px] text-[rgb(var(--text-faint))] col-span-full py-4 text-center">Nenhum pokemon no depot.</div>}
      </div>
    </div>
  );
}

function InventorySection({ name }: { name: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await invoke<any[]>("bot:get-inventory", name);
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [name]);

  const sellLoot = async () => {
    await invoke("bot:sell-items", name, ["loot"]);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] text-[11px] font-medium hover:brightness-110 disabled:opacity-40">{loading ? 'Carregando...' : 'Recarregar Inventario'}</button>
        <button onClick={sellLoot} className="px-3 py-1.5 rounded bg-amber-600 text-white text-[11px] font-medium hover:brightness-110">Vender todo Loot</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
        {items.map((i, idx) => (
          <div key={idx} className="flex items-center gap-2 p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))]">
            <img src={\`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/\${(i.name || '').toLowerCase().replace(/\\s+/g, '-')}.png\`} alt={i.name} className="w-8 h-8 object-contain" onError={(e) => (e.target as any).style.display = 'none'} />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">{i.name || i.itemId}</div>
              <div className="text-[10px] text-[rgb(var(--text-muted))]">Qtd: {i.quantity || i.qty || 0}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && <div className="text-[11px] text-[rgb(var(--text-faint))] col-span-full py-4 text-center">Inventario vazio.</div>}
      </div>
    </div>
  );
}

function ShopSection({ name }: { name: string }) {
  const buy = async (itemId: number, qty: number) => {
    await invoke("bot:buy-item", name, itemId, qty);
  };

  const ITEMS = [
    { id: 4, name: "Poke Ball", price: 100 },
    { id: 3, name: "Great Ball", price: 300 },
    { id: 2, name: "Ultra Ball", price: 1000 },
    { id: 205, name: "Potion", price: 100 },
    { id: 204, name: "Super Potion", price: 300 },
    { id: 203, name: "Hyper Potion", price: 1200 },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {ITEMS.map(i => (
        <div key={i.id} className="flex items-center justify-between p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))]">
          <div className="flex items-center gap-2">
            <img src={\`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/\${i.name.toLowerCase().replace(/\\s+/g, '-')}.png\`} alt={i.name} className="w-8 h-8 object-contain" onError={(e) => (e.target as any).style.display = 'none'} />
            <div>
              <div className="text-[11px] font-medium text-[rgb(var(--text-primary))]">{i.name}</div>
              <div className="text-[10px] text-amber-400">{i.price}g</div>
            </div>
          </div>
          <button onClick={() => buy(i.id, 100)} className="px-2 py-1 rounded bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] text-[10px] hover:bg-[rgb(var(--accent))]/20">Comprar x100</button>
        </div>
      ))}
    </div>
  );
}
`;

if (!code.includes('function TeamSection')) {
  code = code + '\n' + newComponents;
}

const injection = `
          <Section title="Minha Equipe" icon={<Box size={13} />} defaultOpen={false}>
            <TeamSection name={account} team={sessionStats?.team || []} />
          </Section>

          <Section title="Meus Pokemons" icon={<Box size={13} />} defaultOpen={false}>
            <PokemonBoxSection name={account} />
          </Section>

          <Section title="Inventario" icon={<Box size={13} />} defaultOpen={false}>
            <InventorySection name={account} />
          </Section>
          
          <Section title="Loja (Comprar Itens)" icon={<Box size={13} />} defaultOpen={false}>
            <ShopSection name={account} />
          </Section>
`;

if (!code.includes('<TeamSection')) {
  code = code.replace(/<Section title="Cassino Automatico \(Marlon\)"/g, injection.trim() + '\n\n          <Section title="Cassino Automatico (Marlon)"');
}

fs.writeFileSync('src/renderer/src/components/layout/AccountPage.tsx', code);
console.log('AccountPage updated with Team, PokemonBox, Inventory and Shop');
