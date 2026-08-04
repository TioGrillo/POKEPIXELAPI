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

  // Prepare zone fresh (stop first if needed)
  let prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  if (prep.status === 409) {
    await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
    await new Promise(r => setTimeout(r, 2000));
    prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  }
  console.log('Prepare status:', prep.status);
  const alloc = prep.data?.allocation;
  console.log('Alloc:', JSON.stringify(alloc, null, 2));

  const { species_id: speciesId, map_id: mapId, zone_id: zoneId, level } = alloc;

  // Use original format: N:speciesId (from HAR analysis)
  const events = Array.from({length: 32}, (_, i) => `${i+1}:${speciesId}`).join(',');
  const wildUrl = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`;
  console.log('\nWild URL (first 150 chars):', wildUrl.substring(0, 150));
  
  const wild = await req('GET', wildUrl, null, token);
  console.log('Wild status:', wild.status);
  if (wild.data?.error) console.log('Error:', JSON.stringify(wild.data.error));
  
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`${monsters.length} monsters (${alive.length} alive) respawn_seconds=${wild.data?.respawn_seconds}`);

  if (alive.length > 0) {
    console.log('First monster ID:', alive[0].id, 'event_id:', alive[0].event_id);
    
    // Engage!
    console.log('\n=== ENGAGE ===');
    const t = alive[0];
    const engPayload = { zone_id: zoneId, wild_monster_id: t.species_id, map_id: mapId, event_id: t.event_id, level: t.level };
    const eng = await req('POST', '/hunts/current/engage', engPayload, token);
    console.log('Engage status:', eng.status);
    console.log('Engage response:', JSON.stringify(eng.data, null, 2).substring(0, 400));
    
    await new Promise(r => setTimeout(r, 3000));
    const snap = await req('GET', '/hunts/current/snapshot', null, token);
    const s = snap.data?.snapshot;
    console.log('\n✅ KILL COUNT:', s?.kill_count);
    if (s?.enemy) console.log('Enemy:', s.enemy.species_id, 'HP:', s.enemy.hp);
  }
}

main().catch(e => console.error(e));
