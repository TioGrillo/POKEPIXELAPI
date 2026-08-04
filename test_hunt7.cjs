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
  await new Promise(r => setTimeout(r, 1000));
  
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  const alloc = prep.data?.allocation;
  const allocTrainerId = alloc?.trainer_id || alloc?.id?.split(':')[0];
  console.log('Alloc trainerId:', allocTrainerId, '| level:', alloc?.level, '| map_id:', alloc?.map_id);

  // Use allocTrainerId:zoneId:mapId:N format
  const { zone_id: zoneId, map_id: mapId, level, species_id: speciesId } = alloc;
  const events = Array.from({length: 32}, (_, i) => `${allocTrainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const wild = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`\nWild status: ${wild.status} | ${monsters.length} monsters | ${alive.length} alive | respawn: ${wild.data?.respawn_seconds}s`);

  if (alive.length === 0) { console.log('No alive monsters (respawn happening)'); return; }
  
  // Engage!
  const t = alive[0];
  console.log('\nEngaging:', t.species_id, 'event_id:', t.event_id, 'quality:', t.quality);
  const eng = await req('POST', '/hunts/current/engage', { zone_id: zoneId, wild_monster_id: t.species_id, map_id: mapId, event_id: t.event_id, level: t.level }, token);
  console.log('Engage status:', eng.status);
  
  for (let i = 1; i < Math.min(4, alive.length); i++) {
    const t2 = alive[i];
    const e = await req('POST', '/hunts/current/engage', { zone_id: zoneId, wild_monster_id: t2.species_id, map_id: mapId, event_id: t2.event_id, level: t2.level }, token);
    process.stdout.write(`e${e.status} `);
    await new Promise(r => setTimeout(r, 300));
  }
  
  await new Promise(r => setTimeout(r, 3000));
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  const s = snap.data?.snapshot;
  console.log(`\n\n✅ SNAPSHOT kill_count: ${s?.kill_count} | zone: ${s?.zone_id?.substring(0,8)}`);
  if (s?.enemy) console.log(`Enemy: ${s.enemy.species_id} HP:${s.enemy.hp}/${s.enemy.max_hp}`);
}
main().catch(e => console.error(e));
