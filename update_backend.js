const fs = require('fs');

// 1. Update engine.ts
let engineCode = fs.readFileSync('src/bot/engine.ts', 'utf8');

const engineMethods = `
  getPokemons() {
    return this.pokeList || [];
  }

  async sellItems(categories: string[] = ["loot"]) {
    const res = await this.httpPost("/api/game/shop/sell", { categories });
    if (res?.ok) this.ok("Itens vendidos com sucesso.");
    else this.warn("Falha ao vender itens.");
    return res;
  }

  async sellPokemon(pokeIds: string[]) {
    const res = await this.httpPost("/api/game/pokemon/sell", { pokeIds });
    if (res?.ok) this.ok(\`\${pokeIds.length} Pokemon(s) vendidos.\`);
    else this.warn("Falha ao vender Pokemon(s).");
    return res;
  }
  
  async buyItem(itemId: number, qty: number) {
    const res = await this.httpPost("/api/game/shop/buy", { itemId, quantity: qty });
    if (res?.ok) this.ok(\`Comprou \${qty}x do item \${itemId}.\`);
    else this.warn(\`Falha ao comprar item \${itemId}.\`);
    return res;
  }
`;

if (!engineCode.includes('getPokemons() {')) {
  engineCode = engineCode.replace(/async lockPokemon/, engineMethods.trim() + '\n\n  async lockPokemon');
  fs.writeFileSync('src/bot/engine.ts', engineCode);
  console.log('engine.ts updated');
}

// 2. Update index.ts
let indexCode = fs.readFileSync('src/main/index.ts', 'utf8');

const indexMethods = `
  ipcMain.handle("bot:get-pokemons", (_, name: string) => {
    const s = sessions.get(name);
    return s ? s.getPokemons() : [];
  });

  ipcMain.handle("bot:sell-items", (_, name: string, categories?: string[]) => {
    const s = sessions.get(name);
    return s ? s.sellItems(categories) : null;
  });

  ipcMain.handle("bot:sell-pokemon", (_, name: string, pokeIds: string[]) => {
    const s = sessions.get(name);
    return s ? s.sellPokemon(pokeIds) : null;
  });

  ipcMain.handle("bot:buy-item", (_, name: string, itemId: number, qty: number) => {
    const s = sessions.get(name);
    return s ? s.buyItem(itemId, qty) : null;
  });
`;

if (!indexCode.includes('bot:get-pokemons')) {
  indexCode = indexCode.replace(/ipcMain.handle\("bot:lock-pokemon"/, indexMethods.trim() + '\n\n  ipcMain.handle("bot:lock-pokemon"');
  fs.writeFileSync('src/main/index.ts', indexCode);
  console.log('index.ts updated');
}
