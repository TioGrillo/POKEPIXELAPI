const fs = require('fs');
const path = require('path');

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('avoidNumbers') || content.includes('usePrefix') || content.includes('Evitar Números') || content.includes('Ativar Prefixo') || content.includes('generateNick')) {
        console.log(`FOUND IN: ${fullPath}`);
      }
    }
  }
}

searchDir('D:\\PROJETOS AT\\a\\POKEPIXELAPI\\NovoBot\\src');
