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
  const login = await req('POST', '/auth/login', { login: 'damdam5', password: 'Vd522431@' });
  const token = login.data?.access_token;
  const trainerId = login.data?.trainer?.id;
  console.log('Token:', !!token, '| Trainer ID:', trainerId);

  // Stop current
  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  
  // Prepare cubone zone
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  const alloc = prep.data?.allocation;
  console.log('Alloc:', alloc?.species_id, 'level:', alloc?.level, 'map_id:', alloc?.map_id);

  const speciesId = alloc.species_id;
  const mapId = alloc.map_id;
  const zoneId = alloc.zone_id;
  const level = alloc.level;

  // Correct format: trainerId:zoneId:mapId:eventId
  console.log('\n=== WILD MONSTERS with correct trainerId ===');
  const events = Array.from({length: 32}, (_, i) => `${trainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const wildUrl = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(events)}&level=${level}`;
  const wild = await req('GET', wildUrl, null, token);
  console.log('Wild status:', wild.status);
  const monsters = wild.data?.data || [];
  const alive = monsters.filter(m => m.hp > 0);
  console.log(`${monsters.length} monsters total, ${alive.length} alive`);
  if (monsters.length > 0) {
    console.log('First monster:', JSON.stringify(monsters[0], null, 2).substring(0, 400));
  }

  if (alive.length === 0) { console.log('No alive monsters!'); return; }
  const target = alive[0];

  // Engage!
  console.log('\n=== ENGAGE ===');
  const engPayload = {
    zone_id: zoneId,
    wild_monster_id: target.species_id,
    map_id: mapId,
    event_id: target.event_id,
    level: target.level
  };
  console.log('Payload:', engPayload);
  const eng = await req('POST', '/hunts/current/engage', engPayload, token);
  console.log('Engage status:', eng.status);
  console.log('Engage response:', JSON.stringify(eng.data, null, 2).substring(0, 400));

  // Wait then check snapshot
  console.log('\n=== SNAPSHOT (2.5s later) ===');
  await new Promise(r => setTimeout(r, 2500));
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  console.log('Snapshot status:', snap.status);
  const snapshot = snap.data?.snapshot;
  console.log('Kill count:', snapshot?.kill_count);
  console.log('Enemy hp:', snapshot?.enemy?.hp + '/' + snapshot?.enemy?.max_hp);

  // Do 3 more engages
  for (let i = 1; i < Math.min(4, alive.length); i++) {
    const t = alive[i];
    const e = await req('POST', '/hunts/current/engage', {
      zone_id: zoneId, wild_monster_id: t.species_id,
      map_id: mapId, event_id: t.event_id, level: t.level
    }, token);
    console.log(`\nEngage #${i+1} status: ${e.status}`);
  }

  await new Promise(r => setTimeout(r, 3000));
  const snap2 = await req('GET', '/hunts/current/snapshot', null, token);
  console.log('\n=== SNAPSHOT FINAL ===');
  console.log('Kill count:', snap2.data?.snapshot?.kill_count);
}

main().catch(console.error);
