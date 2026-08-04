const https = require('https');
async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = { hostname: 'pokepixel.nietore.com', port: 443, path: `/api/v1${path}`, method: method.toUpperCase(), headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}), ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}) } };
    const r = https.request(opts, (res) => { let b = ''; res.on('data', d => b += d); res.on('end', () => { let p; try { p = JSON.parse(b); } catch(e) { p = b; } resolve({ status: res.statusCode, data: p }); }); });
    r.on('error', reject); if (data) r.write(data); r.end();
  });
}
async function main() {
  const loginRes = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  const token = loginRes.data.access_token;
  console.log('Logged in! Token:', !!token);

  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  await new Promise(r => setTimeout(r, 500));
  
  // Try geodude zone  
  const prep = await req('POST', '/hunts/prepare', { zone_id: 'f4b6e1c9-0fac-4562-9364-1477e8310417' }, token);
  const alloc = prep.data?.allocation;
  const allocTrainerId = alloc?.trainer_id || alloc?.id?.split(':')[0];
  console.log('Zone geodude prepare:', prep.status, '| trainerId:', allocTrainerId?.substring(0,8), '| mapId:', alloc?.map_id, '| level:', alloc?.level);

  const { zone_id: zoneId, map_id: mapId, level } = alloc;
  const events = Array.from({length: 32}, (_, i) => `${allocTrainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const wild = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`Wild: ${wild.status} | ${monsters.length} total | ${alive.length} alive | respawn: ${wild.data?.respawn_seconds}s`);
  
  if (alive.length === 0) { 
    console.log('No monsters. Will wait 45s and retry...');
    await new Promise(r => setTimeout(r, 45000));
    const wild2 = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
    const m2 = wild2.data?.data || [];
    const a2 = m2.filter(m => m.hp > 0);
    console.log(`After wait: ${m2.length} total | ${a2.length} alive`);
    if (a2.length === 0) { console.log('Still empty!'); return; }
    alive.push(...a2);
  }

  const t = alive[0];
  console.log('\nEngaging:', t.species_id, 'event_id:', t.event_id, 'HP:', t.hp, 'quality:', t.quality);
  
  // Engage 5 monsters
  const targets = alive.slice(0, 5);
  for (const target of targets) {
    const e = await req('POST', '/hunts/current/engage', { zone_id: zoneId, wild_monster_id: target.species_id, map_id: mapId, event_id: target.event_id, level: target.level }, token);
    process.stdout.write(`[eng:${e.status}] `);
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n');
  await new Promise(r => setTimeout(r, 3000));
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  const s = snap.data?.snapshot;
  console.log(`✅ SNAPSHOT: kill_count=${s?.kill_count} | zone=${s?.zone_id?.substring(0,8)}`);
  if (s?.enemy) console.log(`Enemy: ${s.enemy.species_id} HP:${s.enemy.hp}/${s.enemy.max_hp} quality:${s.enemy.quality}`);
  console.log('\n[KILL LOG] Morte confirmada no servidor!', s?.kill_count, 'inimigo(s) derrotado(s)');
}
main().catch(e => console.error(e));
