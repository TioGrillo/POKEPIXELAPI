/**
 * Teste de hunt com captura seletiva de raros+
 * Replica o fluxo exato do bot:
 *   prepare → create hunt → engage → PATCH settings → WebSocket (token em query param)
 */
import https from "https";
import { WebSocket } from "ws";
import { randomUUID } from "crypto";

const BASE = "https://pokepixel.nietore.com";
const WS   = "wss://pokepixel.nietore.com/api/v1/ws";
const CREDS = { login: "damdam", password: "Vd522431" };
const HUNT_ZONE   = "hunt_abra";
const MIN_QUALITY = "rare";
const MAX_COMBATS = 30;

const QUALITY_RANK = { weak:0, common:1, uncommon:2, rare:3, epic:4, legendary:5 };
const MIN_RANK = QUALITY_RANK[MIN_QUALITY];

// ── HTTP helper ────────────────────────────────────────────────────────────
function api(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: "pokepixel.nietore.com",
      port: 443,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };
    const r = https.request(opts, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on("error", reject);
    if (payload) r.write(payload);
    r.end();
  });
}

const C = {
  INFO:"\x1b[36m", OK:"\x1b[32m", WARN:"\x1b[33m",
  ERR:"\x1b[31m", CAP:"\x1b[35;1m", KILL:"\x1b[90m", R:"\x1b[0m"
};
function log(tag, msg) {
  const t = new Date().toLocaleTimeString("pt-BR");
  const c = { INFO:C.INFO, OK:C.OK, WARN:C.WARN, ERR:C.ERR, CAP:C.CAP, KILL:C.KILL }[tag] || "";
  console.log(`[${t}] ${c}[${tag}]${C.R} ${msg}`);
}

const stats = { kills:0, captures:0, total:0, errors:0 };

async function main() {
  console.log(`\n${"=".repeat(55)}`);
  console.log(" TESTE HUNT — CAPTURA SELETIVA RARE+ (damdam)");
  console.log(`${"=".repeat(55)}\n`);

  // 1. Auth
  log("INFO", "Autenticando com damdam...");
  const lr = await api("POST", "/api/v1/auth/login", CREDS, null);
  const token = lr.body?.access_token;
  if (!token) { log("ERR", `Login falhou: ${JSON.stringify(lr.body)}`); process.exit(1); }
  log("OK", "Autenticado!");

  // 2. Parar hunt ativa
  await api("POST", "/api/v1/hunts/current/stop", {}, token).catch(() => {});
  await new Promise(r => setTimeout(r, 800));

  // 3. Prepare — obtém allocation (mesmo fluxo do bot)
  log("INFO", `Preparando zona ${HUNT_ZONE}...`);
  const prepRes = await api("POST", "/api/v1/hunts/prepare", { zone_id: HUNT_ZONE }, token);
  if (!prepRes.body?.allocation) {
    log("ERR", `Prepare falhou: ${JSON.stringify(prepRes.body)}`);
    process.exit(1);
  }
  const alloc = prepRes.body.allocation;
  const speciesId = alloc.species_id;
  const mapId = alloc.map_id;
  const level = alloc.level;
  let eventId = alloc.target_event_id;
  if (!eventId && alloc.events?.length > 0) eventId = alloc.events[0].id || alloc.events[0];
  if (!eventId) eventId = 1;
  log("OK", `Allocation: species=${speciesId} map=${mapId} level=${level} event=${eventId}`);

  // 4. Buscar wild monsters vivos para pegar event_id válido
  log("INFO", "Buscando wild monsters vivos na zona...");
  const eventsParam = Array.from({ length: 20 }, (_, i) => `${i+1}:${speciesId}`).join(",");
  const wmUrl = `/api/v1/wild-monsters?zone_id=${HUNT_ZONE}&map_id=${mapId}&level=${level}&events=${encodeURIComponent(eventsParam)}`;
  const wmRes = await api("GET", wmUrl, null, token);
  const wildMobs = wmRes.body?.data || [];

  // Prefere rare+, mas aceita qualquer um vivo
  const qualityOrder2 = { legendary:4, epic:3, rare:2, uncommon:1, common:0, weak:-1 };
  wildMobs.sort((a,b) => (qualityOrder2[b.quality]||0) - (qualityOrder2[a.quality]||0));

  log("INFO", `Wild monsters encontrados: ${wildMobs.length} | qualidades: ${JSON.stringify(wildMobs.reduce((acc,m)=>{const q=m.quality||"?";acc[q]=(acc[q]||0)+1;return acc},{}) )}`);

  // Tenta criar hunt iterando pelos mobs disponíveis até ter sucesso
  let huntCreated = false;
  const usedEventId = eventId;
  let engageBody = { zone_id: HUNT_ZONE, wild_monster_id: speciesId, map_id: mapId, event_id: eventId, level };

  for (const mob of wildMobs) {
    const tryEventId = mob.event_id || mob.id || usedEventId;
    const trySpecies = mob.species_id || speciesId;
    const huntBody = { zone_id: HUNT_ZONE, wild_monster_id: trySpecies, map_id: mapId, event_id: tryEventId, level };
    const huntRes = await api("POST", "/api/v1/hunts", huntBody, token);
    if (huntRes.status === 200 || huntRes.status === 201 || huntRes.status === 409) {
      log("OK", `Hunt criada (status ${huntRes.status}) | event_id=${tryEventId} species=${trySpecies} quality=${mob.quality||"?"}`);
      Object.assign(engageBody, huntBody);
      huntCreated = true;
      break;
    }
    if (huntRes.body?.error?.message?.includes("knocked out")) {
      log("WARN", `event_id=${tryEventId} knockeado, tentando próximo...`);
      continue;
    }
    log("ERR", `Hunt falhou (${huntRes.status}): ${JSON.stringify(huntRes.body)}`);
    break;
  }

  if (!huntCreated) {
    // Fallback: tenta com event_id original
    const huntBody = { zone_id: HUNT_ZONE, wild_monster_id: speciesId, map_id: mapId, event_id: eventId, level };
    const huntRes = await api("POST", "/api/v1/hunts", huntBody, token);
    if (huntRes.status !== 200 && huntRes.status !== 201 && huntRes.status !== 409) {
      log("ERR", `Hunt falhou no fallback (${huntRes.status}): ${JSON.stringify(huntRes.body)}`);
      process.exit(1);
    }
    log("WARN", `Hunt criada via fallback (status ${huntRes.status})`);
    Object.assign(engageBody, huntBody);
  }

  // 5. Engage
  const engRes = await api("POST", "/api/v1/hunts/current/engage", engageBody, token);
  log(engRes.status === 200 ? "OK" : "WARN", `Engage: ${engRes.status}`);

  // 6. PATCH /api/v1/hunts/current/settings — configura min_quality=rare
  log("INFO", `Configurando captura: min_quality=${MIN_QUALITY}...`);
  const settings = {
    auto_capture: {
      enabled: true,
      common_enabled: false,   // não captura common
      min_quality: MIN_QUALITY,
      shiny_enabled: true,
      common_capsule_item_id: "capsule_pokeball",
      shiny_capsule_item_id: "capsule_ultraball",
      species_filter: [],
      mode: "split",
    },
    auto_potion: {
      enabled: true,
      hp_threshold: 50,
      potion_item_id: "potion_great",
      auto_revive: true,
      revive_item_id: "revive_basic",
    },
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    const cfgRes = await api("PATCH", "/api/v1/hunts/current/settings", settings, token);
    log(cfgRes.status === 200 ? "OK" : "WARN", `Settings PATCH (tentativa ${attempt+1}): ${cfgRes.status} | ${JSON.stringify(cfgRes.body).slice(0,80)}`);
    if (cfgRes.status === 200) break;
    await new Promise(r => setTimeout(r, 1500));
  }

  // 7. WebSocket — token e cmid como query params (igual ao bot)
  const cmid = randomUUID().replace(/-/g, "");
  const wsUrl = `${WS}?token=${token}&cmid=${cmid}`;
  log("INFO", `Conectando WebSocket...`);
  const ws = new WebSocket(wsUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120",
      "Origin": "https://pokepixel.nietore.com",
    },
    rejectUnauthorized: false,
  });

  ws.on("open", () => {
    log("OK", "WebSocket conectado! Enviando hunt.resume...");
    ws.send(JSON.stringify({ type: "hunt.resume", data: { last_seq: 0 } }));
  });

  ws.on("message", async (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    const type = msg.type || msg.event || "";
    const data = msg.data || msg || {};

    // Log todos eventos menos ping/pong
    if (!["pong","ping","heartbeat"].includes(type)) {
      log("INFO", `⟵ WS [${type}]: ${JSON.stringify(data).slice(0, 120)}`);
    }

    // Combate: mob apareceu — detecta todos os possíveis nomes de evento
    const isCombat = [
      "combat:start","wild_monster:encountered","monster:encountered",
      "hunt:wild_monster","encounter","combat_start","hunt:encounter",
      "wild:monster","fight:start","battle:start"
    ].includes(type);

    if (isCombat) {
      const mob      = data.monster || data.wild_monster || data;
      const species  = mob.species_id || mob.species || "?";
      const quality  = (mob.quality || "common").toLowerCase();
      const isShiny  = mob.is_shiny === true;
      const lv       = mob.level || level;
      const rank     = QUALITY_RANK[quality] ?? 1;
      const mobId    = mob.id || mob.monster_id;
      stats.total++;
      console.log();

      if (isShiny || rank >= MIN_RANK) {
        const label = isShiny ? "✨SHINY" : quality.toUpperCase();
        log("CAP", `${label} ${species} Lv.${lv} → CAPTURANDO!`);
        const capRes = await api("POST", "/api/v1/hunts/current/capture",
          mobId ? { monster_id: mobId } : {}, token);
        if (capRes.status === 200 || capRes.status === 201) {
          log("OK", `✅ Capturado! ${quality.toUpperCase()} ${species}`);
          stats.captures++;
        } else {
          log("WARN", `Captura falhou (${capRes.status}): ${JSON.stringify(capRes.body).slice(0,80)}`);
          stats.errors++;
          await api("POST", "/api/v1/hunts/current/engage", engageBody, token).catch(() => {});
        }
      } else {
        log("KILL", `${quality.toUpperCase()} ${species} Lv.${lv} → MATANDO (abaixo de ${MIN_QUALITY})`);
        stats.kills++;
        await api("POST", "/api/v1/hunts/current/engage", engageBody, token).catch(() => {});
      }
      console.log();

      if (stats.total >= MAX_COMBATS) {
        log("INFO", `Limite ${MAX_COMBATS} combates. Encerrando...`);
        await api("POST", "/api/v1/hunts/current/stop", {}, token).catch(() => {});
        ws.close();
      }
    }

    // Confirmações do servidor
    if (["hunt:kill","kill","monster:killed"].includes(type)) {
      const s = data.species_id || data.monster?.species_id || "";
      log("KILL", `✓ Kill server: ${s}`);
    }
    if (["hunt:capture","capture","monster:captured"].includes(type)) {
      const s = data.species_id || data.monster?.species_id || "";
      const q = (data.quality || data.monster?.quality || "?").toUpperCase();
      log("CAP", `✓ Captura server: ${q} ${s}`);
      stats.captures++;
    }
    if (type === "error") log("ERR", JSON.stringify(data).slice(0,150));
  });

  ws.on("close", () => {
    console.log(`\n${"=".repeat(55)}`);
    console.log(" RESUMO");
    console.log(`${"=".repeat(55)}`);
    console.log(`Total de encontros : ${stats.total}`);
    console.log(`Kills (< ${MIN_QUALITY})   : ${stats.kills}`);
    console.log(`Capturas (${MIN_QUALITY}+)  : ${stats.captures}`);
    console.log(`Erros de captura   : ${stats.errors}`);

    if (stats.captures > 0)
      console.log("\n✅ SUCESSO: Captura seletiva funcionando!");
    else if (stats.total > 0)
      console.log("\n⚠️  Nenhum raro encontrado. Tente novamente mais tarde.");
    else
      console.log("\n⚠️  Nenhum evento de combate recebido via WS. Verifique os tipos de evento no log.");
    process.exit(0);
  });

  ws.on("error", e => log("ERR", `WS: ${e.message}`));

  // Timeout 4 min
  setTimeout(async () => {
    log("WARN", "Timeout 4min. Encerrando...");
    await api("POST", "/api/v1/hunts/current/stop", {}, token).catch(() => {});
    ws.close();
  }, 4 * 60 * 1000);
}

main().catch(e => { console.error(e); process.exit(1); });
