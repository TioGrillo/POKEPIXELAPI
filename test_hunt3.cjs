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
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => {
        let parsed; try { parsed = JSON.parse(b); } catch(e) { parsed = b; }
        resolve({ status: res.statusCode, data: parsed, raw: b });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function main() {
  const loginRes = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  if (loginRes.status !== 200) { console.log('Login failed:', loginRes.raw); return; }
  const token = loginRes.data.access_token;
  const trainerId = loginRes.data.trainer?.id;
  console.log('Logged in! trainer_id:', trainerId);

  // Stop & prepare
  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  if (prep.status !== 200 && prep.status !== 201) { 
    console.log('Prepare failed:', prep.status, prep.raw); 
    return; 
  }
  const alloc = prep.data.allocation;
  console.log('Alloc:', alloc.species_id, 'level:', alloc.level, 'map_id:', alloc.map_id, 'zone_id:', alloc.zone_id);

  // Build wild-monsters URL with correct trainerId:zoneId:mapId:eventId format
  const { species_id: speciesId, map_id: mapId, zone_id: zoneId, level } = alloc;
  const events = Array.from({length: 32}, (_, i) => `${trainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const wildUrl = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`;
  
  console.log('\n=== WILD MONSTERS ===');
  const wild = await req('GET', wildUrl, null, token);
  console.log('Status:', wild.status);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`${monsters.length} monsters, ${alive.length} alive`);

  if (alive.length === 0) { 
    console.log('Raw:', wild.raw.substring(0, 300));
    return; 
  }

  // Engage multiple
  console.log('\n=== ENGAGING 5 MONSTERS ===');
  for (let i = 0; i < Math.min(5, alive.length); i++) {
    const t = alive[i];
    const e = await req('POST', '/hunts/current/engage', {
      zone_id: zoneId, wild_monster_id: t.species_id,
      map_id: mapId, event_id: t.event_id, level: t.level
    }, token);
    console.log(`Engage #${i+1} (event_id:${t.event_id}): HTTP ${e.status} | kill_report: ${e.data?.kill_count ?? JSON.stringify(e.data).substring(0,100)}`);
    await new Promise(r => setTimeout(r, 300));
  }

  // Snapshot after a bit
  await new Promise(r => setTimeout(r, 3000));
  console.log('\n=== SNAPSHOT ===');
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  const s = snap.data?.snapshot;
  console.log(`Status: ${snap.status} | kill_count: ${s?.kill_count} | zone: ${s?.zone_id}`);
  if (s?.enemy) console.log(`Enemy: ${s.enemy.species_id} HP:${s.enemy.hp}/${s.enemy.max_hp}`);

  console.log('\n✅ TEST COMPLETE');
}

main().catch(e => console.error('ERROR:', e));
