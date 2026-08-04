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
  console.log('My Trainer ID:', trainerId);

  // Get current snapshot to see what's happening
  const snap = await req('GET', '/hunts/current/snapshot', null, token);
  console.log('\nCurrent snapshot:', JSON.stringify(snap.data?.snapshot, null, 2)?.substring(0, 500));
  
  // Stop and prepare fresh
  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);
  await new Promise(r => setTimeout(r, 1000));

  // Try a common zone (geodude - f4b6e1c9) which is level 6
  const prep = await req('POST', '/hunts/prepare', { zone_id: 'f4b6e1c9-0fac-4562-9364-1477e8310417' }, token);
  console.log('\nPrepare geodude zone status:', prep.status);
  const alloc = prep.data?.allocation;
  console.log('Alloc trainer_id:', alloc?.trainer_id);
  console.log('My trainer_id:', trainerId);
  console.log('Match?', alloc?.trainer_id === trainerId);
  console.log('Alloc:', JSON.stringify(alloc, null, 2));

  if (!alloc) { console.log('No alloc'); return; }

  const { species_id: speciesId, map_id: mapId, zone_id: zoneId, level, trainer_id: allocTrainerId } = alloc;
  
  // Use trainer_id from the alloc to build events
  const correctTrainerId = allocTrainerId || trainerId;
  console.log('\nUsing trainer_id for events:', correctTrainerId);
  
  // Try format: correctTrainerId:zoneId:mapId:N
  const eventsNew = Array.from({length: 10}, (_, i) => `${correctTrainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const urlNew = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(eventsNew)}&level=${level}`;
  const r1 = await req('GET', urlNew, null, token);
  console.log('\nFormat trainerId:zone:map:N ->', r1.status, JSON.stringify(r1.data).substring(0, 200));
  
  // Try format: N:speciesId  
  const eventsOld = Array.from({length: 10}, (_, i) => `${i+1}:${speciesId}`).join(',');
  const urlOld = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(eventsOld)}&level=${level}`;
  const r2 = await req('GET', urlOld, null, token);
  console.log('Format N:species ->', r2.status, JSON.stringify(r2.data).substring(0, 200));
}

main().catch(e => console.error(e));
