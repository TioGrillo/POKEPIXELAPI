const fs = require('fs');
let code = fs.readFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/main/index.ts', 'utf8');

const lines = code.split('\n');
const seen = new Set();
let openBrackets = 0;
let insideDuplicate = false;
const newLines = [];

for(let i=0; i<lines.length; i++) {
  const line = lines[i];
  
  if (insideDuplicate) {
    if (line.includes('{')) openBrackets++;
    if (line.includes('}')) {
      openBrackets--;
      if (openBrackets <= 0) {
        insideDuplicate = false;
      }
    }
    continue;
  }
  
  const m = line.match(/ipcMain\.handle\(['"]([^'"]+)['"]/);
  if (m) {
    const handleName = m[1];
    if (seen.has(handleName)) {
      console.log('Found duplicate:', handleName, 'at line', i+1);
      insideDuplicate = true;
      openBrackets = 0;
      if (line.includes('{')) openBrackets++;
      continue;
    } else {
      seen.add(handleName);
    }
  }
  
  newLines.push(line);
}

const newCode = newLines.join('\n');
fs.writeFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/main/index.ts', newCode);
console.log('Cleared duplicates.');
