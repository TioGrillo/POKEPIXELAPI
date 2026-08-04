const fs = require('fs');
const file = 'D:/PROJETOS AT/a/PokeIdleBot-Web/src/renderer/src/lib/themes.ts';
let code = fs.readFileSync(file, 'utf8');

// Find the original end of the 25 themes. The 25th theme was 'aurora'
const auroraIndex = code.indexOf('id: "aurora"');
if (auroraIndex === -1) {
  console.log('Could not find aurora theme to truncate.');
  process.exit(1);
}

// Find the closing brace of aurora
const auroraEndIndex = code.indexOf('},', auroraIndex);
let cleanCode = code.slice(0, auroraEndIndex + 2) + '\n];\n\n' + code.slice(code.indexOf('export function applyTheme'));

const baseThemes = [
  // 10 Cities
  { id: 'pallet', label: 'Pallet Town', hex: '#f8fafc', category: 'dark' },
  { id: 'cerulean', label: 'Cerulean City', hex: '#0ea5e9', category: 'tinted' },
  { id: 'vermilion', label: 'Vermilion City', hex: '#f97316', category: 'tinted' },
  { id: 'lavender_town', label: 'Lavender Town', hex: '#a78bfa', category: 'tinted' },
  { id: 'celadon', label: 'Celadon City', hex: '#22c55e', category: 'tinted' },
  { id: 'fuchsia_city', label: 'Fuchsia City', hex: '#ec4899', category: 'tinted' },
  { id: 'saffron', label: 'Saffron City', hex: '#eab308', category: 'tinted' },
  { id: 'cinnabar', label: 'Cinnabar Island', hex: '#ef4444', category: 'tinted' },
  { id: 'viridian', label: 'Viridian City', hex: '#10b981', category: 'tinted' },
  { id: 'goldenrod', label: 'Goldenrod City', hex: '#fbbf24', category: 'tinted' },

  // 10 Characters
  { id: 'ash', label: 'Ash Ketchum', hex: '#2563eb', category: 'tinted' },
  { id: 'misty', label: 'Líder Misty', hex: '#f97316', category: 'tinted' },
  { id: 'brock', label: 'Líder Brock', hex: '#b45309', category: 'dark' },
  { id: 'jessie', label: 'Equipe Rocket Jessie', hex: '#be123c', category: 'tinted' },
  { id: 'james', label: 'Equipe Rocket James', hex: '#4f46e5', category: 'tinted' },
  { id: 'prof_oak', label: 'Prof. Carvalho', hex: '#94a3b8', category: 'dark' },
  { id: 'giovanni', label: 'Chefe Giovanni', hex: '#1e293b', category: 'dark' },
  { id: 'cynthia', label: 'Campeã Cynthia', hex: '#fef08a', category: 'dark' },
  { id: 'leon', label: 'Campeão Leon', hex: '#ef4444', category: 'tinted' },
  { id: 'red', label: 'Mestre Red', hex: '#dc2626', category: 'dark' },

  // 30 Pokémons
  { id: 'pikachu', label: 'Pikachu', hex: '#facc15', category: 'tinted' },
  { id: 'charizard', label: 'Charizard', hex: '#ea580c', category: 'tinted' },
  { id: 'bulbasaur', label: 'Bulbasaur', hex: '#14b8a6', category: 'tinted' },
  { id: 'squirtle', label: 'Squirtle', hex: '#38bdf8', category: 'tinted' },
  { id: 'gengar', label: 'Gengar', hex: '#9333ea', category: 'dark' },
  { id: 'mewtwo', label: 'Mewtwo', hex: '#c084fc', category: 'tinted' },
  { id: 'snorlax', label: 'Snorlax', hex: '#0f766e', category: 'dark' },
  { id: 'dragonite', label: 'Dragonite', hex: '#fbbf24', category: 'tinted' },
  { id: 'lucario', label: 'Lucario', hex: '#3b82f6', category: 'dark' },
  { id: 'rayquaza', label: 'Rayquaza', hex: '#10b981', category: 'dark' },
  { id: 'umbreon', label: 'Umbreon', hex: '#fef08a', category: 'dark' },
  { id: 'espeon', label: 'Espeon', hex: '#d946ef', category: 'tinted' },
  { id: 'sylveon', label: 'Sylveon', hex: '#f472b6', category: 'tinted' },
  { id: 'gardevoir', label: 'Gardevoir', hex: '#34d399', category: 'tinted' },
  { id: 'greninja', label: 'Greninja', hex: '#1e3a8a', category: 'dark' },
  { id: 'tyranitar', label: 'Tyranitar', hex: '#4d7c0f', category: 'dark' },
  { id: 'metagross', label: 'Metagross', hex: '#64748b', category: 'dark' },
  { id: 'garchomp', label: 'Garchomp', hex: '#0284c7', category: 'dark' },
  { id: 'lugia', label: 'Lugia', hex: '#93c5fd', category: 'tinted' },
  { id: 'ho_oh', label: 'Ho-Oh', hex: '#f59e0b', category: 'tinted' },
  { id: 'suicune', label: 'Suicune', hex: '#22d3ee', category: 'tinted' },
  { id: 'entei', label: 'Entei', hex: '#b45309', category: 'dark' },
  { id: 'raikou', label: 'Raikou', hex: '#eab308', category: 'dark' },
  { id: 'celebi', label: 'Celebi', hex: '#84cc16', category: 'tinted' },
  { id: 'jirachi', label: 'Jirachi', hex: '#fde047', category: 'tinted' },
  { id: 'deoxys', label: 'Deoxys', hex: '#f97316', category: 'tinted' },
  { id: 'darkrai', label: 'Darkrai', hex: '#e11d48', category: 'dark' },
  { id: 'arceus', label: 'Arceus', hex: '#fef08a', category: 'tinted' },
  { id: 'zekrom', label: 'Zekrom', hex: '#06b6d4', category: 'dark' },
  { id: 'reshiram', label: 'Reshiram', hex: '#f8fafc', category: 'tinted' }
];

let added = '';
baseThemes.forEach(t => {
  const vars = t.category === 'tinted' 
    ? '{ ...accentPalette("' + t.hex + '", "' + t.hex + '", "' + t.hex + '"), ...tintedBg("' + t.hex + '"), ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC }'
    : '{ ...accentPalette("' + t.hex + '", "' + t.hex + '", "' + t.hex + '"), ...DARK_SLATE, ...DEFAULT_TEXT, ...DEFAULT_SEMANTIC }';
  
  added += '  { id: "' + t.id + '", label: "' + t.label + '", preview: "' + t.hex + '", category: "' + t.category + '", vars: ' + vars + ' },\n';
});

const lastIndex = cleanCode.lastIndexOf('];');
if (lastIndex !== -1) {
  const finalCode = cleanCode.slice(0, lastIndex) + added + cleanCode.slice(lastIndex);
  fs.writeFileSync(file, finalCode, 'utf8');
  console.log('50 Pokemon/City themes added');
}
