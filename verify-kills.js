const { app } = require('electron');

const BASE_URL = "https://pokepixel.nietore.com";
const EMAIL = "damdam5";
const PASSWORD = "Vd522431";

async function login() {
  const r = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login: EMAIL, password: PASSWORD }),
  });
  const data = await r.json();
  return data.access_token || data.token || data.accessToken;
}

async function getHunt(token) {
  const r = await fetch(`${BASE_URL}/api/v1/hunts/current`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (r.status === 404) return null;
  if (!r.ok) return null;
  return await r.json();
}

async function getTrainer(token) {
  const r = await fetch(`${BASE_URL}/api/v1/trainer/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!r.ok) return null;
  const d = await r.json();
  return d.trainer || d;
}

app.whenReady().then(async () => {
  console.log("[CHECK] Fazendo login...");
  const token = await login();
  if (!token) { console.error("Login falhou"); app.exit(1); return; }

  const t1 = await getTrainer(token);
  const h1 = await getHunt(token);
  
  const gen1 = h1?.automation_generation ?? 0;
  const killSeq1 = h1?.kill_seq ?? 0;
  
  console.log(`\n====== SNAPSHOT INICIAL ======`);
  console.log(`Trainer: Lv.${t1?.level} | EXP: ${t1?.exp} | Gold: ${t1?.gold}`);
  console.log(`Hunt: ${h1?.zone_id || 'nenhuma'}`);
  console.log(`automation_generation: ${gen1}`);
  console.log(`kill_seq: ${killSeq1}`);
  if (h1?.summary) {
    console.log(`summary.kills: ${h1.summary.kills}`);
    console.log(`summary.exp_gained: ${h1.summary.exp_gained}`);
  }
  console.log(`\n[INFO] Aguardando 30s de farmagem...\n`);

  await new Promise(r => setTimeout(r, 30000));

  const t2 = await getTrainer(token);
  const h2 = await getHunt(token);

  const gen2 = h2?.automation_generation ?? 0;
  const killSeq2 = h2?.kill_seq ?? 0;

  console.log(`\n====== SNAPSHOT FINAL ======`);
  console.log(`Trainer: Lv.${t2?.level} | EXP: ${t2?.exp} | Gold: ${t2?.gold}`);
  console.log(`Hunt: ${h2?.zone_id || 'nenhuma'}`);
  console.log(`automation_generation: ${gen2}`);
  console.log(`kill_seq: ${killSeq2}`);
  if (h2?.summary) {
    console.log(`summary.kills: ${h2.summary.kills}`);
    console.log(`summary.exp_gained: ${h2.summary.exp_gained}`);
  }

  console.log(`\n====== DIFERENÇA ======`);
  console.log(`EXP ganho: +${(t2?.exp || 0) - (t1?.exp || 0)}`);
  console.log(`Gold ganho: +${(t2?.gold || 0) - (t1?.gold || 0)}`);
  console.log(`automation_generation subiu: +${gen2 - gen1}`);
  console.log(`kill_seq subiu: +${killSeq2 - killSeq1}`);

  if (gen2 > gen1 || killSeq2 > killSeq1 || (t2?.exp || 0) > (t1?.exp || 0)) {
    console.log(`\n✅ KILLS CONFIRMADAS NO SERVIDOR!`);
  } else {
    console.log(`\n⚠️  Sem progresso detectado. Bot pode não estar farmando.`);
  }

  app.exit(0);
});
