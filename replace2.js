const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/components/layout/AccountPage.tsx', 'utf8');

const replacement = `
          <Section title="Cassino Automatico (Marlon)" icon={<Trophy size={13} />}>
            <CasinoReroll name={account} />
          </Section>
`;

code = code.replace(/<Section title="Cassino Automatico \(Marlon\)" icon=\{<Trophy size=\{13\} \/>\}>[\s\S]*?<\/Section>/, replacement.trim());

const newComponent = `
function CasinoReroll({ name }: { name: string }) {
  const [pokemon, setPokemon] = useState(133);
  const [attempts, setAttempts] = useState(50);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState(0);

  const POKEMON = [{ id: 133, name: "Eevee" }, { id: 122, name: "Mr. Mime" }, { id: 137, name: "Porygon" }];

  useEffect(() => {
    if (!running) return;
    let active = true;
    const run = async () => {
      for (let i = current; i < attempts; i++) {
        if (!active) break;
        setCurrent(i + 1);
        await invoke("bot:casino-reroll", name, pokemon);
        await new Promise(r => setTimeout(r, 1500)); // Delay between rerolls
      }
      if (active) setRunning(false);
    };
    run();
    return () => { active = false; };
  }, [running, attempts, name, pokemon]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-[rgb(var(--text-muted))] mb-1">Pokemon</div>
          <select disabled={running} value={pokemon} onChange={(e) => setPokemon(Number(e.target.value))} className="w-full px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))]">
            {POKEMON.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <div className="text-[10px] text-[rgb(var(--text-muted))] mb-1">Tentativas</div>
          <input disabled={running} type="number" value={attempts} min={1} onChange={(e) => setAttempts(Number(e.target.value))} className="w-full px-2 py-1 rounded bg-[rgb(var(--bg-surface))] border border-[rgb(var(--border))] text-[12px] text-[rgb(var(--text-primary))]" />
        </div>
      </div>
      <div className="flex gap-2 items-center">
        <button 
          onClick={() => {
            if (running) { setRunning(false); }
            else { setCurrent(0); setRunning(true); }
          }} 
          className={\`flex-1 py-1.5 rounded text-[11px] font-medium transition-colors \${running ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}\`}
        >
          {running ? "Parar Reroll" : "Iniciar Reroll"}
        </button>
        <div className="text-[11px] text-[rgb(var(--text-muted))]">
          {current} / {attempts}
        </div>
      </div>
    </div>
  );
}
`;

if (!code.includes('function CasinoReroll')) {
  code = code + '\n' + newComponent;
}

fs.writeFileSync('src/renderer/src/components/layout/AccountPage.tsx', code);
console.log('AccountPage updated with CasinoReroll');
