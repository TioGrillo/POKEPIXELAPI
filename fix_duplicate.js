const fs = require('fs');
let code = fs.readFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/main/index.ts', 'utf8');

const match1 = code.indexOf('ipcMain.handle("bot:sell-pokemon"');
if (match1 !== -1) {
  const match2 = code.indexOf('ipcMain.handle("bot:sell-pokemon"', match1 + 10);
  if (match2 !== -1) {
    const end = code.indexOf('});', match2) + 3;
    code = code.substring(0, match2) + code.substring(end);
    fs.writeFileSync('D:/PROJETOS AT/a/PokeIdleBot-Web/src/main/index.ts', code);
    console.log('Fixed duplicate bot:sell-pokemon handler');
  } else {
    console.log('Only found one!');
  }
}
