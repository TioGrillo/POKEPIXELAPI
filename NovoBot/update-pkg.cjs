const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('D:/PROJETOS AT/a/POKEPIXELAPI/NovoBot/package.json', 'utf8'));
pkg.main = 'main.js';
pkg.scripts['electron'] = 'electron .';
pkg.scripts['dev'] = 'concurrently "vite" "wait-on tcp:5173 && npm run electron"';
fs.writeFileSync('D:/PROJETOS AT/a/POKEPIXELAPI/NovoBot/package.json', JSON.stringify(pkg, null, 2));
