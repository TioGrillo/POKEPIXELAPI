const fs = require('fs');
let code = fs.readFileSync('src/bot/engine.ts', 'utf8');

if (!code.includes('static lastShinyCaptureTime = 0;')) {
  code = code.replace(/class BotSession[\s\S]*?\{/, (match) => match + '\n  static lastShinyCaptureTime = 0;\n');
}

// Rewriting pokePixelHuntLoop inside engine.ts
const newHuntLoop = `
  private async pokePixelHuntLoop() {
    if (!this.inHunt || !this.running) return;

    try {
      if (!this.huntSlug) return;
      
      await this.httpPost('/api/v1/hunts/prepare', { zone_id: this.huntSlug }).catch(() => {});
      
      const huntInfo = (this._cachedHunts || []).find(h => h.id === this.huntSlug || h.name === this.huntSlug);
      const mapId = huntInfo ? (huntInfo.map_id || 7) : 7;
      const level = huntInfo && huntInfo.encounters && huntInfo.encounters.length > 0 ? huntInfo.encounters[0].min_level : 1;
      
      const eventsStr = Array.from({length: 45}, (_, i) => \`\${i+1}:oddish\`).join('%2C');
      const wildUrl = \`/api/v1/wild-monsters?zone_id=\${this.huntSlug}&map_id=\${mapId}&events=\${eventsStr}&level=\${level}\`;
      const res = await this.httpGet(wildUrl);
      
      if (res && res.data && res.data.length > 0) {
        let monsters = res.data;
        const qualityVal: any = { 'weak': 0, 'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4 };
        
        // Shiny Cooldown Logic (30 minutes = 1800000 ms)
        const cfg = this.cfg as any;
        const SHINY_COOLDOWN = 1800000;
        const canCatchShiny = cfg.hunt_shiny_enabled !== false && (Date.now() - BotSession.lastShinyCaptureTime > SHINY_COOLDOWN);
        
        const minQ = cfg.hunt_min_quality ? qualityVal[cfg.hunt_min_quality.toLowerCase()] : 0;
        const minIv = cfg.hunt_min_iv || 0;
        
        // Filter valid targets
        monsters = monsters.filter((m: any) => {
           if (m.is_shiny) return canCatchShiny;
           const q = qualityVal[m.quality] || 0;
           const ivTotal = Object.values(m.ivs || {}).reduce((a: any, b: any) => a + b, 0) as number;
           if (q < (minQ || 0)) return false;
           if (ivTotal < (minIv || 0)) return false;
           return true;
        });
        
        if (monsters.length === 0) {
           // Skip if no good targets
           this._huntLoopTimer = setTimeout(() => this.pokePixelHuntLoop(), 4500);
           return;
        }

        // ORDENAR: Shiny > Qualidade Alta > Nivel
        monsters.sort((a: any, b: any) => {
          if (a.is_shiny && !b.is_shiny) return -1;
          if (!a.is_shiny && b.is_shiny) return 1;
          const qa = qualityVal[a.quality] || 0;
          const qb = qualityVal[b.quality] || 0;
          if (qa !== qb) return qb - qa;
          return b.level - a.level;
        });
        
        const target = monsters[0];
        if (target.is_shiny) {
           BotSession.lastShinyCaptureTime = Date.now();
        }
        
        const ivsT = Object.values(target.ivs || {}).reduce((a: any, b: any) => a + b, 0);
        this.info(\`Engajando: \${target.species_id} Lv.\${target.level} (\${target.quality} | IV:\${ivsT})\${target.is_shiny?' SHINY!':''}\`);
        
        await this.httpPost('/api/v1/hunts/current/engage', {
          zone_id: this.huntSlug,
          wild_monster_id: target.species_id,
          map_id: mapId,
          event_id: target.event_id,
          level: target.level
        });
        
        await new Promise(r => setTimeout(r, 4000));
        
        if (cfg.auto_capture !== false) {
           await this.httpPost('/api/v1/hunts/current/capture', {
             capsule_item_id: 'capsule_basic',
             wild_monster_id: target.id
           }).catch(() => {});
        }
      }
    } catch(e) { }

    this._huntLoopTimer = setTimeout(() => this.pokePixelHuntLoop(), 4500);
  }
`;

// replace old pokePixelHuntLoop
const startIdx = code.indexOf('private async pokePixelHuntLoop() {');
const endIdx = code.indexOf('private onMessage(', startIdx);
if (startIdx > -1 && endIdx > -1) {
   code = code.substring(0, startIdx) + newHuntLoop + '\n  ' + code.substring(endIdx);
}

fs.writeFileSync('src/bot/engine.ts', code);
console.log('engine.ts updated with filters');
