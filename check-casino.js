const fs = require('fs');
const engine = fs.readFileSync('src/bot/engine.ts', 'utf8');
if (engine.includes('casino-reroll')) console.log('Yes in engine');
else console.log('No in engine');

const index = fs.readFileSync('src/main/index.ts', 'utf8');
if (index.includes('casino-reroll')) console.log('Yes in index');
else console.log('No in index');
