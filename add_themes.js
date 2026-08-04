const fs = require('fs');
const file = 'D:/PROJETOS AT/a/PokeIdleBot-Web/src/renderer/src/lib/themes.ts';
let code = fs.readFileSync(file, 'utf8');

const baseThemes = [
  { id: 'ruby', label: 'Rubi', hex: '#e11d48' },
  { id: 'sapphire', label: 'Safira', hex: '#2563eb' },
  { id: 'topaz', label: 'Topázio', hex: '#f59e0b' },
  { id: 'amethyst', label: 'Ametista', hex: '#9333ea' },
  { id: 'obsidian', label: 'Obsidiana', hex: '#1e293b' },
  { id: 'pearl', label: 'Pérola', hex: '#f8fafc' },
  { id: 'onyx', label: 'Ônix', hex: '#0f172a' },
  { id: 'quartz', label: 'Quartzo', hex: '#f472b6' },
  { id: 'malachite', label: 'Malaquita', hex: '#10b981' },
  { id: 'lapis', label: 'Lápis-Lazúli', hex: '#3b82f6' },
  { id: 'coral', label: 'Coral', hex: '#f43f5e' },
  { id: 'turquoise', label: 'Turquesa', hex: '#06b6d4' },
  { id: 'gold', label: 'Ouro', hex: '#eab308' },
  { id: 'silver', label: 'Prata', hex: '#94a3b8' },
  { id: 'bronze', label: 'Bronze', hex: '#b45309' },
  { id: 'platinum', label: 'Platina', hex: '#e2e8f0' },
  { id: 'cobalt', label: 'Cobalto', hex: '#4f46e5' },
  { id: 'crimson2', label: 'Carmesim Real', hex: '#9f1239' },
  { id: 'mint', label: 'Menta', hex: '#34d399' },
  { id: 'lavender', label: 'Lavanda', hex: '#a78bfa' },
  { id: 'peach', label: 'Pêssego', hex: '#fb923c' },
  { id: 'plum', label: 'Ameixa', hex: '#701a75' },
  { id: 'salmon', label: 'Salmão', hex: '#f87171' },
  { id: 'khaki', label: 'Caqui', hex: '#fef08a' },
  { id: 'mustard', label: 'Mostarda', hex: '#ca8a04' },
  { id: 'olive2', label: 'Oliva Escuro', hex: '#4d7c0f' },
  { id: 'navy', label: 'Marinha', hex: '#1e3a8a' },
  { id: 'sky2', label: 'Céu Profundo', hex: '#0284c7' },
  { id: 'maroon', label: 'Bordô', hex: '#831843' },
  { id: 'cerulean', label: 'Cerúleo', hex: '#0284c7' },
  { id: 'chartreuse', label: 'Chartreuse', hex: '#84cc16' },
  { id: 'periwinkle', label: 'Vinca', hex: '#818cf8' },
  { id: 'taupe', label: 'Taupe', hex: '#a8a29e' },
  { id: 'rust', label: 'Ferrugem', hex: '#9a3412' },
  { id: 'mahogany', label: 'Mogno', hex: '#7c2d12' },
  { id: 'charcoal', label: 'Carvão', hex: '#334155' },
  { id: 'slate2', label: 'Ardósia Escura', hex: '#475569' },
  { id: 'ivory', label: 'Marfim', hex: '#ffedd5' },
  { id: 'sepia', label: 'Sépia', hex: '#b45309' },
  { id: 'azure', label: 'Azul-Celeste', hex: '#38bdf8' },
  { id: 'seafoam', label: 'Espuma do Mar', hex: '#5eead4' },
  { id: 'tangerine', label: 'Tangerina', hex: '#f97316' },
  { id: 'cherry', label: 'Cereja', hex: '#be123c' },
  { id: 'grape', label: 'Uva', hex: '#6b21a8' },
  { id: 'lemon', label: 'Limão', hex: '#facc15' },
  { id: 'apple', label: 'Maçã', hex: '#16a34a' },
  { id: 'berry', label: 'Baga', hex: '#9d174d' },
  { id: 'mocha', label: 'Mocha', hex: '#713f12' },
  { id: 'sand', label: 'Areia', hex: '#d6d3d1' },
  { id: 'ash', label: 'Cinza', hex: '#9ca3af' }
];

let added = '';
baseThemes.forEach(t => {
  const category = Math.random() > 0.5 ? 'tinted' : 'dark';
  const vars = category === 'tinted' 
    ? '{ ...accentPalette("' + t.hex + '", "' + t.hex + '", "' + t.hex + '"), ...tintedBg("' + t.hex + '"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC }'
    : '{ ...accentPalette("' + t.hex + '", "' + t.hex + '", "' + t.hex + '"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC }';
  
  added += '  { id: "' + t.id + '", label: "' + t.label + '", preview: "' + t.hex + '", category: "' + category + '", vars: ' + vars + ' },\n';
});

const lastIndex = code.lastIndexOf('];');
if (lastIndex !== -1) {
  const newCode = code.slice(0, lastIndex) + added + code.slice(lastIndex);
  fs.writeFileSync(file, newCode, 'utf8');
  console.log('50 themes added');
}
