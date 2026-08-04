const https = require('https');
async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'pokepixel.nietore.com', port: 443,
      path: `/api/v1${path}`, method: method.toUpperCase(),
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) }
    };
    const r = https.request(opts, (res) => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => { let p; try { p = JSON.parse(b); } catch(e) { p = b; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}

function ts() { return new Date().toLocaleTimeString('pt-BR'); }

async function getAliveMonsters(token, alloc) {
  // Try with increasing event counts - start small to avoid 500 when map just spawned
  for (const count of [5, 10, 20, 32]) {
    const events = Array.from({length: count}, (_, i) => `${i+1}:${alloc.species_id}`).join(',');
    const w = await req('GET', `/wild-monsters?zone_id=${alloc.zone_id}&map_id=${alloc.map_id}&events=${encodeURIComponent(events)}&level=${alloc.level}`, null, token);
    if (w.status === 200) {
      return (w.data?.data || []).filter(m => m.hp > 0);
    }
  }
  return [];
}

async function main() {
  console.log(`[${ts()}] === TESTE COMPLETO: CAPTURA + TURBO + ANALYZER ===`);

  const loginRes = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  const token = loginRes.data.access_token;
  if (!token) { console.log('Login failed!'); return; }
  console.log(`[${ts()}] Login OK`);

  // Reset hunt
  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  await new Promise(r => setTimeout(r, 800));

  // Prepare zone
  const prep = await req('POST', '/hunts/prepare', { zone_id: 'f4b6e1c9-0fac-4562-9364-1477e8310417' }, token);
  const alloc = prep.data?.allocation;
  console.log(`[${ts()}] Zona preparada: ${alloc?.species_id} (level ${alloc?.level}, map ${alloc?.map_id})`);

  // Buscar inventário para ver pokébolas disponíveis
  const inv = await req('GET', '/inventory', null, token);
  const capsules = (inv.data?.data || []).filter(i => i.item_id?.includes('capsule') && (i.qty > 0 || i.quantity > 0));
  console.log(`[${ts()}] Pokébolas no inventário: ${capsules.map(c => `${c.item_id}:${c.qty || c.quantity}`).join(', ') || 'NENHUMA'}`);
  const bestCapsule = capsules.length > 0 ? capsules[0].item_id : 'capsule_basic';

  // Buscar monstros
  let alive = await getAliveMonsters(token, alloc);
  if (alive.length === 0) {
    console.log(`[${ts()}] Sem monstros, aguardando 42s de respawn...`);
    await new Promise(r => setTimeout(r, 42000));
    alive = await getAliveMonsters(token, alloc);
  }
  console.log(`[${ts()}] Monstros disponíveis: ${alive.length}`);
  if (alive.length === 0) { console.log('Ainda sem monstros!'); return; }

  // ========== TESTE 1: CAPTURA MANUAL (GAMBIARRA) ==========
  console.log(`\n[${ts()}] === TESTE 1: CAPTURA MANUAL ===`);
  const captureTarget = alive[0];
  console.log(`[${ts()}] Target: ${captureTarget.species_id} | event_id: ${captureTarget.event_id} | is_shiny: ${captureTarget.is_shiny} | quality: ${captureTarget.quality}`);
  
  // Primeiro engaja para entrar em batalha
  const engR = await req('POST', '/hunts/current/engage', {
    zone_id: alloc.zone_id, wild_monster_id: captureTarget.species_id,
    map_id: alloc.map_id, event_id: captureTarget.event_id, level: captureTarget.level
  }, token);
  console.log(`[${ts()}] Engage status: ${engR.status} | kill_seq: ${engR.data?.kill_seq}`);

  // Tenta captura manual com target.id completo
  const capturePayload = { capsule_item_id: bestCapsule, wild_monster_id: captureTarget.id };
  console.log(`[${ts()}] 🔴 Tentando captura manual: capsule=${bestCapsule} | wild_id=${captureTarget.id}`);
  const captRes = await req('POST', '/hunts/current/capture', capturePayload, token);
  console.log(`[${ts()}] Captura status: ${captRes.status} | data: ${JSON.stringify(captRes.data).substring(0, 200)}`);

  // ========== TESTE 2: SIMULAR TURBO (3 instâncias simultâneas) ==========
  console.log(`\n[${ts()}] === TESTE 2: TURBO 3 INSTÂNCIAS ===`);
  alive = await getAliveMonsters(token, alloc);
  console.log(`[${ts()}] Monstros disponíveis para turbo: ${alive.length}`);

  const tasks = [];
  for (let i = 0; i < Math.min(3, alive.length); i++) {
    const t = alive[i];
    tasks.push(
      req('POST', '/hunts/current/engage', {
        zone_id: alloc.zone_id, wild_monster_id: t.species_id,
        map_id: alloc.map_id, event_id: t.event_id, level: t.level
      }, token).then(e => {
        console.log(`[${ts()}] Instância ${i+1} (event:${t.event_id}): HTTP ${e.status} | kills: ${e.data?.summary?.kills}`);
        return e;
      })
    );
    await new Promise(r => setTimeout(r, 300)); // stagger like the engine does
  }
  await Promise.all(tasks);

  // ========== TESTE 3: ANALYZER APÓS ATIVIDADE ==========
  console.log(`\n[${ts()}] === TESTE 3: HUNT ANALYZER ===`);
  await new Promise(r => setTimeout(r, 3000));
  const analyzer = await req('GET', '/hunts/analyzer', null, token);
  if (analyzer.status === 200 && analyzer.data?.summary) {
    const s = analyzer.data.summary;
    console.log(`[${ts()}] ✅ ANALYZER OK:`);
    console.log(`  kills: ${s.kills} | exp: ${s.exp_gained} | captures: ${s.captures}`);
    console.log(`  balls_used: ${s.balls_used} | shinies_seen: ${s.shinies_seen} | shiny_captures: ${s.shiny_captures}`);
    console.log(`  kills/h: ${Math.round(analyzer.data.kills_per_hour)} | exp/h: ${Math.round(analyzer.data.exp_per_hour)}`);
    console.log(`\n[${ts()}] [KILL LOG] Morte confirmada! ${s.kills} inimigo(s) derrotado(s) (+${s.exp_gained}xp)`);
  } else {
    console.log(`[${ts()}] Analyzer status: ${analyzer.status}`, analyzer.data);
  }

  console.log(`\n[${ts()}] === TESTE CONCLUÍDO ===`);
}

main().catch(e => console.error('ERRO:', e));
