const fs = require('fs');
const file = 'D:/PROJETOS AT/a/PokeIdleBot-Web/src/renderer/src/lib/themes.ts';
let code = fs.readFileSync(file, 'utf8');

const startIndex = code.indexOf('export const THEMES: Theme[] = [');
if (startIndex === -1) {
  console.log('Could not find THEMES array start.');
  process.exit(1);
}

const listStart = code.indexOf('[', startIndex) + 1;
const listEnd = code.lastIndexOf('];');

if (listStart === 0 || listEnd === -1) {
  console.log('Could not parse array bounds.');
  process.exit(1);
}

const innerArrayCode = code.slice(listStart, listEnd);
// The themes are separated by `},` followed by newline
const items = innerArrayCode.split(/},\s*(?={)/).map((item, idx, arr) => {
  if (idx < arr.length - 1) {
    return item + '},';
  }
  return item; // the last one doesn't have the comma added in split usually, or maybe it does, let's keep it safe.
});

// Alternatively, since we know exactly which one is the last of the first 25 (id: "aurora")
const auroraIndex = innerArrayCode.indexOf('id: "aurora"');
const auroraEnd = innerArrayCode.indexOf('},', auroraIndex) + 2;

if (auroraIndex !== -1 && auroraEnd !== -1) {
  const genericThemes = innerArrayCode.slice(0, auroraEnd).trim();
  let pokemonThemes = innerArrayCode.slice(auroraEnd).trim();
  
  if (pokemonThemes.endsWith(',')) {
    pokemonThemes = pokemonThemes.slice(0, -1);
  }

  // we just append generic after pokemon
  const newArrayCode = `\n${pokemonThemes},\n${genericThemes}\n`;
  const newCode = code.slice(0, listStart) + newArrayCode + code.slice(listEnd);
  
  fs.writeFileSync(file, newCode, 'utf8');
  console.log('Themes reordered successfully!');
} else {
  console.log('Could not find aurora theme.');
}
