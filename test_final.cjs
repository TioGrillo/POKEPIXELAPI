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
  console.log('Logged in:', !!token);

  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  await new Promise(r => setTimeout(r, 800));

  // Prepare geodude zone
  const prep = await req('POST', '/hunts/prepare', { zone_id: 'f4b6e1c9-0fac-4562-9364-1477e8310417' }, token);
  const alloc = prep.data?.allocation;
  console.log('Prepare:', prep.status, '| species:', alloc?.species_id, '| level:', alloc?.level, '| map_id:', alloc?.map_id);

  const { zone_id: zoneId, map_id: mapId, level, species_id: speciesId } = alloc;

  // Use correct N:speciesId format (confirmed from NEWHUNT5.har)
  const events = Array.from({length: 32}, (_, i) => `${i+1}:${speciesId}`).join(',');
  const wild = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`\nWild monsters: ${wild.status} | ${monsters.length} total | ${alive.length} alive | respawn: ${wild.data?.respawn_seconds}s`);

  if (alive.length === 0) {
    console.log('Monsters in respawn! Waiting 42s...');
    await new Promise(r => setTimeout(r, 42000));
    const wild2 = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
    const m2 = (wild2.data?.data || []).filter(m => m.hp > 0);
    console.log(`After wait: ${m2.length} alive`);
    if (m2.length === 0) { console.log('Still empty!'); return; }
    alive.push(...m2);
  }

  // Engage 5 monsters
  console.log('\n=== ENGAGING ===');
  for (let i = 0; i < Math.min(5, alive.length); i++) {
    const t = alive[i];
    const e = await req('POST', '/hunts/current/engage', { zone_id: zoneId, wild_monster_id: t.species_id, map_id: mapId, event_id: t.event_id, level: t.level }, token);
    const kills = e.data?.summary?.kills;
    const exp = e.data?.summary?.exp_gained;
    console.log(`Engage #${i+1} (event:${t.event_id}): HTTP ${e.status} | kills_in_summary: ${kills} | exp: ${exp}`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Wait and check analyzer
  await new Promise(r => setTimeout(r, 3000));
  console.log('\n=== HUNT ANALYZER ===');
  const analyzer = await req('GET', '/hunts/analyzer', null, token);
  console.log('Status:', analyzer.status);
  if (analyzer.data?.summary) {
    const s = analyzer.data.summary;
    console.log(`✅ kills: ${s.kills} | exp_gained: ${s.exp_gained} | captures: ${s.captures} | balls_used: ${s.balls_used} | shinies_seen: ${s.shinies_seen}`);
    console.log(`[KILL LOG] Morte confirmada! ${s.kills} inimigo(s) derrotado(s) (+${s.exp_gained}xp)`);
  }
}
main().catch(e => console.error(e));
