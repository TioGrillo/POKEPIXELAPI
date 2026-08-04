const https = require('https');

async function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: 'pokepixel.nietore.com',
      port: 443,
      path: `/api/v1${path}`,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      }
    };
    const r = https.request(opts, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(b); } catch(e) { parsed = b; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  // 1. Login by nick
  console.log('=== LOGIN ===');
  const login = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  const token = login.data?.access_token;
  console.log('Login status:', login.status, '| Token:', !!token);
  if (!token) { console.log(login.data); return; }

  // 2. Stop any current hunt first
  console.log('\n=== STOP CURRENT HUNT ===');
  const stopRes = await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  console.log('Stop status:', stopRes.status);

  // 3. Prepare cubone zone
  console.log('\n=== PREPARE ZONE (cubone: 7843f17d) ===');
  let prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  console.log('Prepare status:', prep.status);
  if (prep.status === 409) {
    await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
    prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
    console.log('Prepare2 status:', prep.status);
  }
  const alloc = prep.data?.allocation;
  if (!alloc) { console.log('No allocation!', prep.data); return; }
  console.log('Alloc:', { zone_id: alloc.zone_id, species_id: alloc.species_id, level: alloc.level, map_id: alloc.map_id });

  // 4. Fetch wild-monsters
  console.log('\n=== WILD MONSTERS ===');
  const events = Array.from({length: 32}, (_, i) => `${i+1}:${alloc.species_id}`).join(',');
  const wildUrl = `/wild-monsters?zone_id=${alloc.zone_id}&map_id=${alloc.map_id}&events=${encodeURIComponent(events)}&level=${alloc.level}`;
  const wild = await req('GET', wildUrl, null, token);
  console.log('Wild status:', wild.status);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`${monsters.length} total monsters, ${alive.length} alive`);

  if (alive.length === 0) { console.log('No alive monsters!'); return; }
  const target = alive[0];
  console.log('Target:', { event_id: target.event_id, species: target.species_id, hp: target.hp, quality: target.quality });

  // 5. Engage!
  console.log('\n=== ENGAGE ===');
  const engPayload = {
    zone_id: alloc.zone_id,
    wild_monster_id: target.species_id,
    map_id: alloc.map_id,
    event_id: target.event_id,
    level: target.level
  };
  console.log('Payload:', engPayload);
  const eng = await req('POST', '/hunts/current/engage', engPayload, token);
  console.log('Engage status:', eng.status);
  console.log('Engage response:', JSON.stringify(eng.data, null, 2).substring(0, 300));

  // 6. Wait then check snapshot
  console.log('\n=== SNAPSHOT (2s later) ===');
  await new Promise(r => setTimeout(r, 2500));
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  console.log('Snapshot status:', snap.status);
  const snapshot = snap.data?.snapshot;
  console.log('Kill count:', snapshot?.kill_count);
  if (snapshot) {
    console.log('Enemy:', snapshot.enemy ? `${snapshot.enemy.species_id} HP:${snapshot.enemy.hp}/${snapshot.enemy.max_hp}` : 'null');
    console.log('Zone:', snapshot.zone_id);
  }

  // 7. Engage a second monster
  if (alive.length > 1) {
    const t2 = alive[1];
    console.log('\n=== ENGAGE #2 ===');
    const eng2 = await req('POST', '/hunts/current/engage', {
      zone_id: alloc.zone_id, wild_monster_id: t2.species_id,
      map_id: alloc.map_id, event_id: t2.event_id, level: t2.level
    }, token);
    console.log('Engage2 status:', eng2.status);
    
    await new Promise(r => setTimeout(r, 2000));
    const snap2 = await req('GET', '/hunts/current/snapshot', null, token);
    console.log('Snapshot2 kill_count:', snap2.data?.snapshot?.kill_count);
  }
}

main().catch(console.error);
