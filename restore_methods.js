const fs = require('fs');
let code = fs.readFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/bot/engine.ts', 'utf8');

const missingMethods = `
  async sellPokemonFiltered(opts: any) {
    const res = await this.httpPost("/api/game/pokemon/sell", { ...opts });
    return res;
  }
  
  async buyMax(itemId: number) {
    return this.httpPost("/api/game/shop/buy", { itemId, quantity: 100 });
  }

  async claimStreak() {
    return this.httpPost("/api/game/streak/claim", {});
  }

  async claimGifts() {
    return this.httpPost("/api/game/gifts/claim-all", {});
  }

  async claimBattlepass() {
    return this.httpPost("/api/game/battlepass/claim", {});
  }

  async claimAll() {
    await this.claimStreak();
    await this.claimGifts();
    await this.claimBattlepass();
  }

  async casinoReroll(speciesId: number) {
    this.wsSend("pokes-get");
    const res = await this.httpPost("/api/game/marlon/buy", { speciesId });
    if (res?.ok) this.ok(\`Reroll \${speciesId} concluido.\`);
    else this.warn(\`Falha no reroll \${speciesId}.\`);
    return res;
  }

  async setProfession(profession: string = 'prestige') {
    const res = await this.httpPost("/api/game/professions/choose", { profession });
    if (res?.ok) this.ok(\`Profissao "\${profession}" definida.\`);
    else this.warn(\`Falha ao definir profissao.\`);
    return res;
  }

  async rankupProfession() {
    const res = await this.httpPost("/api/game/professions/rankup", {});
    if (res?.ok) this.ok("Profissao evoluida!");
    else this.warn("Falha ao evoluir profissao.");
    return res;
  }

  equipBestPokemon() {
    const leader = this.pokeList.find((p: any) => p.leader);
    const candidates = this.pokeList.filter((p: any) => !p.leader);
    candidates.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    const target = candidates[0];
    if (target) {
      if (leader) this.wsSend("poke-store", { pokeId: leader.id });
      this.wsSend("poke-withdraw", { pokeId: target.id });
      this.wsSend("poke-summon", { pokeId: target.id });
      this.ok(\`Equipou melhor Pokemon: \${target.species || target.name} (score: \${target.score || 0}).\`);
    }
  }

  equipPokemon(species: string, mode: string = "highest_score", minScore: number = 0) {
    const leader = this.pokeList.find((p: any) => p.leader);
    let target: any = null;
    const candidates = this.pokeList.filter((p: any) => {
      if (p.leader) return false;
      if (p.species?.toLowerCase() !== species.toLowerCase()) return false;
      if (mode === "min_score" && (p.score || 0) < minScore) return false;
      return true;
    });
    if (mode === "highest_score") {
      candidates.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    }
    target = candidates[0];
    if (!target) {
      this.warn(\`Pokemon "\${species}" nao encontrado no depot.\`);
      return null;
    }
    if (leader) this.wsSend("poke-store", { pokeId: leader.id });
    this.wsSend("poke-withdraw", { pokeId: target.id });
    this.wsSend("poke-summon", { pokeId: target.id });
    this.ok(\`Equipou \${species} (score: \${target.score || 0}).\`);
    return { ok: true };
  }
  
  getPokemons() {
    return this.pokeList || [];
  }
`;

if (!code.includes('async claimStreak()')) {
  code = code.replace(/async storePokemon/, missingMethods.trim() + '\\n\\n  async storePokemon');
  fs.writeFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/bot/engine.ts', code);
  console.log('Restored missing methods.');
}
