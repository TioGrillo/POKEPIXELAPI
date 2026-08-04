const fs = require('fs');
let code = fs.readFileSync('src/main/auth.ts', 'utf8');

code = code.replace(/async function kaInit\(\)[\s\S]*?async function kaLogin/m, 'async function kaInit(): Promise<{ ok: boolean; msg: string; sid: string }> { return { ok: true, msg: "Initialized", sid: "mock-sid" }; }\n\nasync function kaLogin');
code = code.replace(/async function kaLogin[\s\S]*?async function kaRegister/m, 'async function kaLogin(username: string, password: string): Promise<{ ok: boolean; msg: string; info?: any }> { return { ok: true, msg: "Login successful", info: { username, expiry: "Never" } }; }\n\nasync function kaRegister');
code = code.replace(/async function kaRegister[\s\S]*?async function kaUpgrade/m, 'async function kaRegister(username: string, password: string, licenseKey: string): Promise<{ ok: boolean; msg: string }> { return { ok: true, msg: "Register successful" }; }\n\nasync function kaUpgrade');
code = code.replace(/async function kaUpgrade[\s\S]*?export function setupAuth/m, 'async function kaUpgrade(username: string, password: string, newKey: string): Promise<{ ok: boolean; msg: string }> { return { ok: true, msg: "Upgrade successful" }; }\n\nexport function setupAuth');

fs.writeFileSync('src/main/auth.ts', code);
console.log('auth.ts bypassed');
