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
  console.log('Token:', !!token);

  // Stop current
  await req('POST', '/hunts/current/stop', { return_to_city: true, cast_nonce: '' }, token);

  // Prepare cubone zone
  const prep = await req('POST', '/hunts/prepare', { zone_id: '7843f17d-caee-4926-aad2-92012eaf4f04' }, token);
  const alloc = prep.data?.allocation;
  console.log('Alloc:', alloc?.species_id, alloc?.level, alloc?.map_id);

  // Try different events formats
  const speciesId = alloc.species_id;
  const mapId = alloc.map_id;
  const zoneId = alloc.zone_id;
  const level = alloc.level;

  // Format 1: with level param
  const eventsStr = Array.from({length: 32}, (_, i) => `${i+1}:${speciesId}`).join(',');
  const url1 = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(eventsStr)}&level=${level}`;
  console.log('\nURL1:', url1.substring(0, 120));
  const r1 = await req('GET', url1, null, token);
  console.log('Status1:', r1.status, '| Raw:', r1.raw.substring(0, 200));

  // Format 2: without level
  const url2 = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(eventsStr)}`;
  const r2 = await req('GET', url2, null, token);
  console.log('\nStatus2 (no level):', r2.status, '| Raw:', r2.raw.substring(0, 200));

  // Format 3: check if wild-monsters exists at all
  const r3 = await req('GET', `/wild-monsters`, null, token);
  console.log('\nStatus3 (no params):', r3.status);

  // Format 4: try passing trainer_id in events
  const allData = prep.data?.allocation;
  const trainerId = allData?.id?.split(':')[0];
  console.log('Trainer ID:', trainerId);
  const eventsWithTrainer = Array.from({length: 10}, (_, i) => `${trainerId}:${zoneId}:${mapId}:${i+1}`).join(',');
  const url4 = `/wild-monsters?zone_id=${zoneId}&map_id=${mapId}&events=${encodeURIComponent(eventsWithTrainer)}&level=${level}`;
  const r4 = await req('GET', url4, null, token);
  console.log('\nStatus4 (trainer:zone:map:id format):', r4.status, '| Raw:', r4.raw.substring(0, 300));
}

main().catch(console.error);
