const bytenode = require('bytenode');
const fs = require('fs');
const path = require('path');

const mainCjsPath = path.resolve(__dirname, '../main.cjs');
const mainJscPath = path.resolve(__dirname, '../main.jsc');
const bootstrapPath = path.resolve(__dirname, '../bootstrap.cjs');

if (!fs.existsSync(mainCjsPath)) {
  console.error("main.cjs not found!");
  process.exit(1);
}

try {
  // Compile JS to V8 Bytecode
  bytenode.compileFile({
    filename: mainCjsPath,
    output: mainJscPath,
    compileAsModule: true
  });

  // Create a bootstrap file that loads the bytecode
  const bootstrapCode = `
require('bytenode');
require('./main.jsc');
  `.trim();
  
  fs.writeFileSync(bootstrapPath, bootstrapCode);
  console.log("Bytenode compilation successful. Protected main process.");
  process.exit(0);
} catch (error) {
  console.error("Bytenode compilation failed:", error);
  process.exit(1);
}
