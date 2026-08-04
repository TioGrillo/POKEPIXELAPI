const fs = require('fs');
let code = fs.readFileSync('src/bot/engine.ts', 'utf8');

if (!code.includes('userStartedHunt')) {
  code = code.replace(/public inHunt = false;/, 'public inHunt = false;\n  public userStartedHunt = false;');
  
  code = code.replace(/async startHunt\(slug\?: string\) {/, 'async startHunt(slug?: string) {\n    this.userStartedHunt = true;');
  
  code = code.replace(/stopHunt\(\) {/, 'stopHunt() {\n    this.userStartedHunt = false;');
  
  code = code.replace(/private async checkRoutes\(\) {/, 'private async checkRoutes() {\n    if (!this.userStartedHunt) return;');
  
  fs.writeFileSync('src/bot/engine.ts', code);
  console.log('engine.ts updated for userStartedHunt');
}
