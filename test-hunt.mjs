import fetch from "node-fetch";
import WebSocket from "ws";

const EMAIL = "damdam5";
const PASSWORD = "Vd522431";
const BASE_URL = "https://pokepixel.nietore.com";
const WS_BASE = "wss://pokepixel.nietore.com/api/v1/ws";
const HUNT_SLUG = "hunt_abra";

async function login() {
  console.log(`[TESTE] Fazendo login como ${EMAIL}...`);
  const r = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: EMAIL, password: PASSWORD }),
  });
  const data = await r.json();
  const token = data.access_token || data.token || data.accessToken;
  if (!token) {
    console.error("[ERRO] Login falhou:", JSON.stringify(data));
    process.exit(1);
  }
  console.log(`[OK] Login bem sucedido! Token: ${token.substring(0,30)}...`);
  return token;
}

(async () => {
  const token = await login();
  const wsUrl = `${WS_BASE}?token=${token}`;
  console.log(`[TESTE] Conectando WS: ${wsUrl.substring(0, 50)}...`);
  
  const ws = new WebSocket(wsUrl);
  let kills = 0;
  let done = false;
  
  ws.on("open", async () => {
    console.log(`[OK] WebSocket conectado! Enviando auth...`);
    ws.send(JSON.stringify({ type: "auth", token: token }));
    
    console.log(`[TESTE] Buscando map-markers na URL exata do engine...`);
    const mapRes = await fetch(`${BASE_URL}/api/v1/api/game/map-markers`, {
      headers: { "Authorization": `Bearer ${token}` }
    });
    const txt = await mapRes.text();
    console.log(`[TESTE] map-markers status: ${mapRes.status}, body:`, txt.substring(0, 150));
    
    // Simulate engine.ts behavior
    setTimeout(() => {
      console.log(`[TESTE] Saindo da hunt atual (se houver)...`);
      ws.send(JSON.stringify({ type: "leave-hunt" }));
      
      setTimeout(() => {
        console.log(`[TESTE] Entrando na hunt: ${HUNT_SLUG}`);
        ws.send(JSON.stringify({ type: "enter-hunt", slug: HUNT_SLUG }));
      }, 1000);
    }, 500);
  });
  
  ws.on("message", (data) => {
    try {
      const str = data.toString();
      const msg = JSON.parse(str);
      
      if (msg.type !== "chat.message") {
         console.log(`[WS_RECV] ${msg.type}`);
      }
      
      if (msg.type === "auth.success") {
        console.log(`[OK] Auth websocket aceito!`);
      }
      
      if (msg.type === "field-init") {
        console.log(`[OK] Hunt iniciada com sucesso! Field size: ${msg.field?.length}`);
      }
      if (msg.type === "field-kill") {
        kills++;
        console.log(`[OK] Monstro abatido! Total: ${kills}`);
        if (kills >= 1) {
          done = true;
          ws.close();
          console.log(`[SUCESSO] Teste concluído com sucesso. Script saindo.`);
          process.exit(0);
        }
      }
    } catch {}
  });
  
  ws.on("error", console.error);
  
  setTimeout(() => {
    if (!done) {
      console.log(`[ERRO] Timeout. Nenhuma kill recebida em 20 segundos.`);
      process.exit(1);
    }
  }, 20000);
})();
