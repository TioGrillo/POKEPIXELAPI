const fs = require('fs');
let code = fs.readFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/renderer/src/components/layout/AccountPage.tsx', 'utf8');

if (!code.includes('import itemsData')) {
  code = code.replace('import { useState', 'import itemsData from \'@shared/items_data.json\';\nimport { useState');
}

if (!code.includes('function getItemIcon')) {
  const getItemIconFn = `
function getItemIcon(name: string) {
  if (!name) return "";
  const found = itemsData.find((i: any) => i.name.toLowerCase() === name.toLowerCase());
  if (found && found.icon) return found.icon;
  return \`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/\${name.toLowerCase().replace(/\\s+/g, '-')}.png\`;
}
`;
  code = code.replace('function getSpriteUrl', getItemIconFn + 'function getSpriteUrl');
}

code = code.replace(/function TeamSection\(\{ name, team \}: \{ name: string; team: any\[\] \}\)/g, 'function TeamSection({ name, team, dexMap }: { name: string; team: any[]; dexMap: Record<string, number> })');
code = code.replace(/<TeamSection name=\{account.name\} team=\{s\?\.team \|\| \[\]\} \/>/g, '<TeamSection name={account.name} team={s?.team || []} dexMap={dexMap} />');

code = code.replace(/function PokemonBoxSection\(\{ name \}: \{ name: string \}\)/g, 'function PokemonBoxSection({ name, dexMap }: { name: string; dexMap: Record<string, number> })');
code = code.replace(/<PokemonBoxSection name=\{account.name\} \/>/g, '<PokemonBoxSection name={account.name} dexMap={dexMap} />');

code = code.replace(/<img src=\{`https:\/\/raw.githubusercontent.com\/PokeAPI\/sprites\/master\/sprites\/pokemon\/\$\{p.dex \|\| 0\}.png`\} alt=\{p.species\}/g, '<img src={getSpriteUrl(p.species || "", dexMap)} alt={p.species}');

code = code.replace(/<img src=\{`https:\/\/raw.githubusercontent.com\/PokeAPI\/sprites\/master\/sprites\/items\/\$\{\(i.name \|\| ''\).toLowerCase\(\).replace\(\/\\s\+\/g, '-'\)\}.png`\} alt=\{i.name\}/g, '<img src={getItemIcon(i.name || "")} alt={i.name}');
code = code.replace(/<img src=\{`https:\/\/raw.githubusercontent.com\/PokeAPI\/sprites\/master\/sprites\/items\/\$\{i.name.toLowerCase\(\).replace\(\/\\s\+\/g, '-'\)\}.png`\} alt=\{i.name\}/g, '<img src={getItemIcon(i.name || "")} alt={i.name}');

fs.writeFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/renderer/src/components/layout/AccountPage.tsx', code);
console.log('Fixed AccountPage!');
