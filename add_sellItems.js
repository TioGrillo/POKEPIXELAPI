const fs = require('fs');
let code = fs.readFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/bot/engine.ts', 'utf8');

const missingSell = `
  async sellItems(categories: string[] = ['loot']) {
    const res = await this.httpPost('/api/game/shop/sell', { categories });
    if (res?.ok) this.ok('Itens vendidos com sucesso.');
    else this.warn('Falha ao vender itens.');
    return res;
  }
`;

if (!code.includes('async sellItems')) {
  code = code.replace(/async storePokemon/, missingSell.trim() + '\n\n  async storePokemon');
  fs.writeFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/bot/engine.ts', code);
  console.log("sellItems added");
}
