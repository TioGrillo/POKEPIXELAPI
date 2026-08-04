const https = require('https');

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'pokepixel.nietore.com', port: 443,
      path: `/api/v1${path}`, method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json', 'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    };
    const r = https.request(opts, (res) => {
      let b = ''; res.on('data', d => b += d);
      res.on('end', () => { let p; try { p = JSON.parse(b); } catch(e) { p = b; } resolve({ status: res.statusCode, data: p }); });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const loginRes = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  const token = loginRes.data.access_token;
  const trainerId = loginRes.data.trainer?.id;
  console.log('Trainer:', trainerId);

  // Don't stop - keep existing hunt, just prepare zone
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  if (prep.status === 409) {
    // Already in hunt - get snapshot to see what zone we are in  
    const snap = await req('GET', '/hunts/current/snapshot', null, token);
    console.log('Already in zone:', snap.data?.snapshot?.zone_id, 'kills:', snap.data?.snapshot?.kill_count);
    // Stop and re-prepare
    await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
    await new Promise(r => setTimeout(r, 1000));
    const prep2 = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
    console.log('Prepare2:', prep2.status, prep2.data?.allocation?.zone_id);
  }
  
  const alloc = prep.data?.allocation;
  if (!alloc) { console.log('No alloc, status:', prep.status); return; }
  const { species_id: speciesId, map_id: mapId, zone_id: zoneId, level } = alloc;

  // Poll for monsters to spawn (up to 60s)
  console.log('\nWaiting for monsters to spawn...');
  let alive = [];
  for (let attempt = 0; attempt < 12; attempt++) {
    const events = Array.from({length: 32}, (_, i) => `${trainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
    const wild = await req('GET', `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`, null, token);
    const monsters = wild.data?.data || [];
    alive = monsters.filter(m => m.hp > 0);
    console.log(`Attempt ${attempt+1}: ${monsters.length} monsters (${alive.length} alive) respawn_seconds=${wild.data?.respawn_seconds}`);
    if (alive.length > 0) break;
    await new Promise(r => setTimeout(r, 5000));
  }

  if (alive.length === 0) { console.log('No monsters appeared!'); return; }
  console.log('\nFirst monster:', JSON.stringify(alive[0], null, 2).substring(0, 300));

  // Engage 5 monsters
  console.log('\n=== ENGAGING ===');
  for (let i = 0; i < Math.min(5, alive.length); i++) {
    const t = alive[i];
    const e = await req('POST', '/hunts/current/engage', {
      zone_id: zoneId, wild_monster_id: t.species_id,
      map_id: mapId, event_id: t.event_id, level: t.level
    }, token);
    console.log(`Engage ${i+1} (event:${t.event_id}): ${e.status}`);
    await new Promise(r => setTimeout(r, 400));
  }

  // Check snapshot
  await new Promise(r => setTimeout(r, 3000));
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  const s = snap.data?.snapshot;
  console.log(`\n✅ SNAPSHOT: kill_count=${s?.kill_count} zone=${s?.zone_id?.substring(0,8)}`);
  if (s?.enemy) console.log(`Enemy: ${s.enemy.species_id} HP:${s.enemy.hp}/${s.enemy.max_hp} quality:${s.enemy.quality}`);
}

main().catch(e => console.error(e));
