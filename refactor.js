const fs = require('fs');
let code = fs.readFileSync('src/bot/engine.ts', 'utf8');

// 1. Add pokePixelHuntLoop property
if (!code.includes('_huntLoopTimer')) {
  code = code.replace('private inHunt: boolean = false;', 'private inHunt: boolean = false;\n  private _huntLoopTimer: any = null;');
}

// 2. Add pokePixelHuntLoop method
const loopMethod = `
  private async pokePixelHuntLoop() {
    if (!this.inHunt || !this.running) return;

    try {
      if (!this.huntSlug) return;
      
      // 1. Prepare
      await this.httpPost('/api/v1/hunts/prepare', { zone_id: this.huntSlug }).catch(() => {});
      
      // 2. Fetch monsters
      const huntInfo = this._cachedHunts.find(h => h.id === this.huntSlug || h.name === this.huntSlug);
      const mapId = huntInfo ? (huntInfo.map_id || 7) : 7;
      const level = huntInfo && huntInfo.encounters ? huntInfo.encounters[0].min_level : 1;
      
      // Event generation for wild-monsters (1 to 45 usually)
      const eventsStr = Array.from({length: 45}, (_, i) => \`\${i+1}:oddish\`).join('%2C');
      
      const wildUrl = \`/api/v1/wild-monsters?zone_id=\${this.huntSlug}&map_id=\${mapId}&events=\${eventsStr}&level=\${level}\`;
      const res = await this.httpGet(wildUrl);
      
      if (res && res.data && res.data.length > 0) {
        const monsters = res.data;
        
        // ORDENAR: Shiny > Qualidade Alta > Nivel
        const qualityVal = { 'weak': 0, 'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4 };
        monsters.sort((a, b) => {
          if (a.is_shiny && !b.is_shiny) return -1;
          if (!a.is_shiny && b.is_shiny) return 1;
          const qa = qualityVal[a.quality] || 0;
          const qb = qualityVal[b.quality] || 0;
          if (qa !== qb) return qb - qa;
          return b.level - a.level;
        });
        
        const target = monsters[0];
        
        // 3. Engage!
        this.info(\`Engajando: \${target.species_id} Lv.\${target.level} (\${target.quality})\${target.is_shiny?' SHINY!':''}\`);
        await this.httpPost('/api/v1/hunts/current/engage', {
          zone_id: this.huntSlug,
          wild_monster_id: target.species_id,
          map_id: mapId,
          event_id: target.event_id,
          level: target.level
        });
        
        // 4. Se o auto-capture tiver habilitado no servidor, a gente nao precisa atacar!
        await new Promise(r => setTimeout(r, 4000));
        
        if (this.cfg.auto_capture !== false) {
           await this.httpPost('/api/v1/hunts/current/capture', {
             capsule_item_id: 'capsule_basic',
             wild_monster_id: target.id
           }).catch(() => {});
        }
      }
    } catch(e) {
      // ignore
    }

    // Schedule next
    this._huntLoopTimer = setTimeout(() => this.pokePixelHuntLoop(), 4500);
  }
`;

if (!code.includes('pokePixelHuntLoop')) {
  code = code.replace(/async startHunt[\s\S]*?inHunt = true;[\s\S]*?this\.info[\s\S]*?;/m, (match) => {
    return match + '\n        clearTimeout(this._huntLoopTimer);\n        this._huntLoopTimer = setTimeout(() => this.pokePixelHuntLoop(), 1000);';
  });
  
  code = code.replace('private onMessage(', loopMethod + '\n  private onMessage(');
}

code = code.replace(/this\.wsSend\(\"enter-hunt\"/g, '// this.wsSend("enter-hunt"');
code = code.replace(/this\.wsSend\(\"leave-hunt\"/g, 'clearTimeout(this._huntLoopTimer); // this.wsSend("leave-hunt"');

fs.writeFileSync('src/bot/engine.ts', code);
console.log('engine.ts refactored successfully.');
