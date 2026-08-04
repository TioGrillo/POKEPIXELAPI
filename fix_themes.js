const fs = require('fs');
const file = 'D:/PROJETOS AT/a/PokeIdleBot-Web/src/renderer/src/lib/themes.ts';
let code = fs.readFileSync(file, 'utf8');

const regex = /{[\s\S]*?}/g;

const startString = 'export const THEMES: Theme[] = [';
const startIndex = code.indexOf('export const THEMES: Theme');

if (startIndex === -1) {
    console.error('Could not find THEMES export');
    process.exit(1);
}

// let's grab everything before the THEMES declaration
const beforeThemes = code.slice(0, startIndex);

// let's grab everything after the themes array
const endOfArray = code.indexOf('];', startIndex);
const afterThemes = code.slice(endOfArray + 2);

// Now let's extract all the theme objects. They all match `{ id: ... }` or similar.
const themesArea = code.slice(startIndex, endOfArray);

const themes = [];
let match;
const themeRegex = /{\s*id:\s*["'][^"']+["'][\s\S]*?vars:\s*{[\s\S]*?}\s*}/g;

while ((match = themeRegex.exec(themesArea)) !== null) {
    themes.push(match[0]);
}

console.log(`Found ${themes.length} themes.`);

// We know the generic ones are the ones with formatting like `label: "Meia-Noite"`
// The pokemon ones have `id: "pallet"`, etc.
// Let's just find the generic ones (which we know are 25) and pokemon ones (50)
const generic = [];
const pokemon = [];

themes.forEach(t => {
    if (t.includes('id: "midnight"') || t.includes('id: "ocean"') || t.includes('id: "forest"') || t.includes('id: "violet"') || t.includes('id: "crimson"') || t.includes('id: "amber"') || t.includes('id: "emerald"') || t.includes('id: "rose"') || t.includes('id: "pink"') || t.includes('id: "fuchsia"') || t.includes('id: "purple"') || t.includes('id: "indigo"') || t.includes('id: "blue"') || t.includes('id: "sky"') || t.includes('id: "cyan"') || t.includes('id: "teal"') || t.includes('id: "green"') || t.includes('id: "lime"') || t.includes('id: "yellow"') || t.includes('id: "orange"') || t.includes('id: "slate"') || t.includes('id: "zinc"') || t.includes('id: "neutral"') || t.includes('id: "stone"') || t.includes('id: "aurora"')) {
        generic.push(t);
    } else {
        pokemon.push(t);
    }
});

console.log(`Generic: ${generic.length}, Pokemon: ${pokemon.length}`);

const newThemesCode = `\n${startString}\n  ${pokemon.join(',\n  ')},\n  ${generic.join(',\n  ')}\n];\n`;

const finalCode = beforeThemes + newThemesCode + afterThemes;
fs.writeFileSync(file, finalCode, 'utf8');
console.log('Fixed themes array!');
