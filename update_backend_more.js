const fs = require('fs');

// 1. Update engine.ts
let engineCode = fs.readFileSync('src/bot/engine.ts', 'utf8');

const moreMethods = `
  async storePokemon(pokeId: string) {
    this.wsSend("poke-store", { pokeId });
    this.ok("Pokemon guardado.");
    return { ok: true };
  }

  async equipPokemonId(pokeId: string) {
    const p = this.pokeList.find((x: any) => x.id === pokeId);
    if (!p) {
       this.warn("Pokemon nao encontrado no depot.");
       return null;
    }
    const leader = this.pokeList.find((x: any) => x.leader);
    if (leader) this.wsSend("poke-store", { pokeId: leader.id });
    this.wsSend("poke-withdraw", { pokeId: p.id });
    this.wsSend("poke-summon", { pokeId: p.id });
    this.ok(\`Equipou \${p.species} (score: \${p.score || 0}).\`);
    return { ok: true };
  }
`;

if (!engineCode.includes('async storePokemon')) {
  engineCode = engineCode.replace(/async sellPokemon/, moreMethods.trim() + '\n\n  async sellPokemon');
  fs.writeFileSync('src/bot/engine.ts', engineCode);
  console.log('engine.ts updated with store/equip id');
}

// 2. Update index.ts
let indexCode = fs.readFileSync('src/main/index.ts', 'utf8');

const moreIndexMethods = `
  ipcMain.handle("bot:store-pokemon", (_, name: string, pokeId: string) => {
    const s = sessions.get(name);
    return s ? s.storePokemon(pokeId) : null;
  });

  ipcMain.handle("bot:equip-pokemon-id", (_, name: string, pokeId: string) => {
    const s = sessions.get(name);
    return s ? s.equipPokemonId(pokeId) : null;
  });
`;

if (!indexCode.includes('bot:store-pokemon')) {
  indexCode = indexCode.replace(/ipcMain.handle\("bot:sell-pokemon"/, moreIndexMethods.trim() + '\n\n  ipcMain.handle("bot:sell-pokemon"');
  fs.writeFileSync('src/main/index.ts', indexCode);
  console.log('index.ts updated with store/equip id');
}
