const fs = require('fs');
let c = fs.readFileSync('src/bot/engine.ts', 'utf8');

const normalizeStr = `private normalizePokemon(p: any): any {
    if (!p) return p;
    if (p.species_id) { p.slug = p.species_id; p.species = p.species_id; }
    if (p.species_name) { p.name = p.nickname || p.species_name; }
    if (p.ivs) { p.ivTotal = Object.values(p.ivs).reduce((a, b) => (a||0) + (b||0), 0); }
    if (p.quality_multiplier !== undefined) { p.quality_modifier = p.quality_multiplier; }
    const qMultiplier = this.getMultiplier(p);
    p.score = Math.round((qMultiplier || 0) * (p.ivTotal || 0) * 10) / 10;
    if (p.level !== undefined && p.lv === undefined) { p.lv = p.level; }
    return p;
  }

  private getMultiplier(p: any): number {`;

c = c.replace('private getMultiplier(p: any): number {', normalizeStr);

c = c.replace('const qMultiplier = this.getMultiplier(p);\r\n          p.score = Math.round((qMultiplier || 0) * (p.ivTotal || 0) * 10) / 10;', 'this.normalizePokemon(p);');
c = c.replace('const qMultiplier = this.getMultiplier(p);\n          p.score = Math.round((qMultiplier || 0) * (p.ivTotal || 0) * 10) / 10;', 'this.normalizePokemon(p);');

c = c.replace('pk.score = Math.round((pk.quality || 0) * (pk.ivTotal || 0) * 10) / 10;', 'this.normalizePokemon(pk);');

// fix getAllPokemon
const getAllPokemonRegex = /async getAllPokemon\(\): Promise<any\[\]> \{[\s\S]*?return list \|\| \[\];\s*\}/;
const getAllPokemonRepl = `async getAllPokemon(): Promise<any[]> {
    let list = await this._waitForPokes(2000);
    if (!list || list.length === 0) {
      const httpRes = await this.httpGet("/api/v1/creatures");
      if (httpRes && httpRes.data) list = httpRes.data;
    }
    list = (list || []).map((p: any) => this.normalizePokemon(p));
    this.pokeList = list;
    this.team = this.pokeList.filter((p: any) => p.leader || p.team || p.location === "team");
    return this.pokeList;
  }`;
c = c.replace(getAllPokemonRegex, getAllPokemonRepl);

// fix getDepot API endpoint just in case
c = c.replace('let data = await this.httpGet("/api/game/depot");', 'let data = await this.httpGet("/api/v1/inventory").catch(()=>null);');
c = c.replace('data = await this.httpGet("/api/game/depot");', 'data = await this.httpGet("/api/v1/inventory").catch(()=>null);');

fs.writeFileSync('src/bot/engine.ts', c);
console.log('Fixed engine.ts!');
