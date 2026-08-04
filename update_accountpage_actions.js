const fs = require('fs');

let code = fs.readFileSync('src/renderer/src/components/layout/AccountPage.tsx', 'utf8');

const replacementTeam = `
function TeamSection({ name, team }: { name: string; team: any[] }) {
  const handleStore = async (id: string) => {
    await invoke("bot:store-pokemon", name, id);
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
              <button onClick={() => handleStore(p.id)} className="px-2 py-1 rounded bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] text-[10px] hover:bg-[rgb(var(--accent))]/20">Guardar</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
`;

const replacementBox = `
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
    setTimeout(load, 1500);
  };

  const sellByRarity = async (rarities: string[]) => {
    const toSell = pokemons.filter(p => rarities.includes(p.rarity)).map(p => p.id);
    if (toSell.length === 0 || !confirm(\`Vender \${toSell.length} Pokemons das raridades selecionadas?\`)) return;
    await invoke("bot:sell-pokemon", name, toSell);
    setTimeout(load, 1500);
  };

  const handleEquip = async (id: string) => {
    await invoke("bot:equip-pokemon-id", name, id);
    setTimeout(load, 1500);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button onClick={load} disabled={loading} className="px-3 py-1.5 rounded bg-[rgb(var(--bg-surface))] text-[rgb(var(--text-primary))] text-[11px] font-medium hover:brightness-110 disabled:opacity-40">{loading ? 'Carregando...' : 'Recarregar Box'}</button>
        <button onClick={() => sellByScore(100)} className="px-3 py-1.5 rounded bg-amber-600 text-white text-[11px] font-medium hover:brightness-110">Vender (Score <= 100)</button>
        <button onClick={() => sellByScore(150)} className="px-3 py-1.5 rounded bg-amber-600 text-white text-[11px] font-medium hover:brightness-110">Vender (Score <= 150)</button>
        <button onClick={() => sellByRarity(['Common', 'Uncommon'])} className="px-3 py-1.5 rounded bg-amber-600 text-white text-[11px] font-medium hover:brightness-110">Vender C e UC</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
        {pokemons.map(p => (
          <div key={p.id} className="flex flex-col gap-2 p-2 rounded bg-[rgb(var(--bg-surface))]/50 border border-[rgb(var(--border))] relative">
            <div className="flex items-center gap-2">
              <img src={\`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/\${p.dex || 0}.png\`} alt={p.species} className="w-8 h-8 object-contain" onError={(e) => (e.target as any).style.display = 'none'} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-[rgb(var(--text-primary))] truncate">{p.species}</div>
                <div className="text-[10px] text-[rgb(var(--text-muted))]">Score: {p.score || 0}</div>
                <div className="text-[10px] text-[rgb(var(--text-muted))]">{p.rarity || 'Common'}</div>
              </div>
            </div>
            <button onClick={() => handleEquip(p.id)} className="w-full px-2 py-1 rounded bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] text-[10px] hover:bg-[rgb(var(--accent))]/20">Definir Ativo</button>
          </div>
        ))}
        {pokemons.length === 0 && !loading && <div className="text-[11px] text-[rgb(var(--text-faint))] col-span-full py-4 text-center">Nenhum pokemon no depot.</div>}
      </div>
    </div>
  );
}
`;

code = code.replace(/function TeamSection[\s\S]*?\}\n/, replacementTeam.trim() + '\n\n');
code = code.replace(/function PokemonBoxSection[\s\S]*?\}\n/, replacementBox.trim() + '\n\n');

fs.writeFileSync('src/renderer/src/components/layout/AccountPage.tsx', code);
console.log('TeamSection and PokemonBoxSection updated with correct actions');
