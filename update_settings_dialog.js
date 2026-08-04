const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/components/ui/SettingsDialog.tsx', 'utf8');

const injectUI = `
              <Field label="Radar de Shinies (Delay 30m para evitar ban)"><Toggle checked={cfg.hunt_shiny_enabled !== false} onChange={(v) => update("hunt_shiny_enabled", v)} /></Field>
              <div className="flex flex-col gap-1">
                 <span className="text-xs text-[rgb(var(--text-faint))]">Qualidade Mínima para Combate (Radar)</span>
                 <select 
                   value={cfg.hunt_min_quality || 'weak'} 
                   onChange={(e) => update("hunt_min_quality", e.target.value)}
                   className="w-full p-2 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded border border-[rgb(var(--border))] outline-none focus:border-[rgb(var(--accent))]"
                 >
                   <option value="weak">Ignorar Qualidade (Ataca Todos)</option>
                   <option value="common">Common (No mínimo)</option>
                   <option value="rare">Rare (No mínimo)</option>
                   <option value="epic">Epic (No mínimo)</option>
                   <option value="legendary">Legendary (No mínimo)</option>
                 </select>
              </div>
              <div className="flex flex-col gap-1">
                 <span className="text-xs text-[rgb(var(--text-faint))]">IV Total Mínimo (Soma)</span>
                 <input 
                   type="number" 
                   value={cfg.hunt_min_iv || 0} 
                   onChange={(e) => update("hunt_min_iv", parseInt(e.target.value) || 0)}
                   className="w-full p-2 bg-[rgb(var(--bg-card))] text-[rgb(var(--text-primary))] text-xs rounded border border-[rgb(var(--border))] outline-none focus:border-[rgb(var(--accent))]"
                 />
              </div>
`;

code = code.replace(/<Field label="Auto-Soneca \(Farm Offline Extra\)">.*?<\/Field>/, (match) => {
  return injectUI + '\n              ' + match;
});

fs.writeFileSync('src/renderer/src/components/ui/SettingsDialog.tsx', code);
console.log('SettingsDialog.tsx updated');
