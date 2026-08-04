const fs = require('fs');
let code = fs.readFileSync('src/bot/engine.ts', 'utf8');

const replacement = `
    let rules = this.cfg.route_rules || [];
    
    const leader = this.pokeList.find((p: any) => p.leader);
    const leaderName = leader ? (leader.species?.toLowerCase() || leader.name?.toLowerCase()) : null;
    let targetRule: any = null;
    
    let foundMounted = false;
    let mountedName = "";
    if (leaderName && this.cfg.mounted_routes) {
      for (const rid of Object.keys(this.cfg.mounted_routes)) {
        const rdata = this.cfg.mounted_routes[rid];
        if (rdata.pokemon?.toLowerCase() === leaderName) {
          rules = rdata.rules || rules;
          foundMounted = true;
          mountedName = rdata.name || rid;
          break;
        }
      }
    }
    
    if (this.cfg.mounted_routes_only && !foundMounted) return;
`;

code = code.replace(/let rules = this\.cfg\.route_rules \|\| \[\];[\s\S]*?if \(!rules \|\| !rules\.length\) return;/, replacement.trim() + '\n\n    if (!rules || !rules.length) return;');

fs.writeFileSync('src/bot/engine.ts', code);
console.log('engine.ts checkRoutes updated with mounted_routes_only');
